// ==============================================
// MEMENTO DATABASE - KNIHA JÁZD (ROUTE CALCULATION & PAYROLL)
// Verzia: 8.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Kniha jázd | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet vzdialenosti, času jazdy a miezd posádky s atribútmi zastávok
//    - Výpočet trasy pomocou OSRM API s fallback na vzdušnú vzdialenosť
//    - Automatické nastavenie default zdržania na zastávkach
//    - Výpočet mzdových nákladov posádky
//    - Integrácia s MementoUtils ekosystémom
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoCore (základné funkcie)
//    - MementoBusiness (business logika)
// ==============================================
// ✅ OPTIMALIZOVANÉ v8.0:
//    - Využitie centrálneho CONFIG z MementoConfig
//    - Štandardné logging funkcie z MementoCore
//    - Business logika pomocou MementoBusiness
//    - Odstránené duplicitné funkcie
//    - Čistá štruktúra bez duplicít
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Kniha jázd Prepočet",
    version: "8.0",
    
    // Referencie na centrálny config
    fields: {
        rideLog: centralConfig.fields.bookOfRides,
        place: centralConfig.fields.places
    },
    // Atribúty
    attributes: {
        trvanie: "trvanie",     
        zdrzanie: "zdržanie",   
        km: "km",
        hodinovka: "hodinovka",
        dennaMzda: "denná mzda"
    },
    
    // Knižnice z centrálneho configu
    libraries: {
        sadzby: centralConfig.libraries.rates,
        miesta: centralConfig.libByName.places,
        zamestnanci: centralConfig.libraries.employees,
        defaults: centralConfig.libraries.defaults
    },
    
    // OSRM API nastavenia
    osrm: {
        maxRetries: 3,
        baseUrl: "https://router.project-osrm.org/route/v1/driving/",
        requestTimeout: 5000,
        retryDelay: 1000
    },
    
    // Business pravidlá
    settings: {
        maxDetourKm: 15,
        debugMode: true,
        roundingMinutes: 15
    }
};

// ==============================================
// UTILITY FUNKCIE
// ==============================================

/**
 * Získa default zdržanie z ASISTANTO Defaults
 */
function getDefaultZdrzanie() {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.libraries.defaults + " nenájdená", "getDefaultZdrzanie");
            return 0;
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (defaultsEntries.length > 0) {
            var defaultZdrz = defaultsEntries[0].field("Default zdržanie");
            
            if (defaultZdrz !== null && defaultZdrz !== undefined) {
                var hours = utils.convertDurationToHours(defaultZdrz);
                utils.addDebug(currentEntry, "  📋 Default zdržanie: " + hours + " h");
                return hours;
            }
        }
        
        return 0.5; // Default 30 minút
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getDefaultZdrzanie", error);
        return 0.5;
    }
}

/**
 * Extrahuje GPS súradnice z poľa miesta
 */
function extractGPSFromPlace(place) {
    if (!place || place.length === 0) {
        return null;
    }
    
    var place = place[0];
    var gps = utils.safeGet(place, CONFIG.fields.place.gps);
    
    if (!gps) {
        var name = utils.safeGet(place, "Názov", "Neznáme");
        utils.addDebug(currentEntry, "  ⚠️ Miesto '" + name + "' nemá GPS súradnice");
        return null;
    }
    
    // Parse GPS z formátu "lat,lon"
    var parts = gps.split(',');
    if (parts.length !== 2) {
        return null;
    }
    
    var lat = parseFloat(parts[0].trim());
    var lon = parseFloat(parts[1].trim());
    
    if (isNaN(lat) || isNaN(lon)) {
        return null;
    }
    
    return { lat: lat, lon: lon };
}

/**
 * Vypočíta vzdušnú vzdialenosť medzi dvoma bodmi (Haversine formula)
 */
function calculateAirDistance(point1, point2) {
    var R = 6371; // Polomer Zeme v km
    var dLat = toRadians(point2.lat - point1.lat);
    var dLon = toRadians(point2.lon - point1.lon);
    var lat1 = toRadians(point1.lat);
    var lat2 = toRadians(point2.lat);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Volá OSRM API pre výpočet trasy
 */
function callOSRMRoute(points) {
    try {
        if (!points || points.length < 2) {
            return null;
        }
        
        // Vytvor URL s koordinátmi - bez použitia map() a join()
        var coordinates = "";
        for (var i = 0; i < points.length; i++) {
            if (i > 0) coordinates += ";";
            coordinates += points[i].lon + "," + points[i].lat;
        }
        
        var url = CONFIG.osrm.baseUrl + coordinates + "?overview=false&steps=false";
        
        utils.addDebug(currentEntry, "  🌐 OSRM API volanie pre " + points.length + " bodov");
        
        var response = utils.httpRequest("GET", url, null, {}, {
            timeout: CONFIG.osrm.requestTimeout
        });
        
        if (response.code === 200) {
            var data = JSON.parse(response.body);
            if (data.routes && data.routes.length > 0) {
                var route = data.routes[0];
                return {
                    distance: route.distance / 1000, // prevod na km
                    duration: route.duration / 3600, // prevod na hodiny
                    success: true
                };
            }
        }
        
        utils.addDebug(currentEntry, "  ⚠️ OSRM API nevrátilo trasu");
        return null;
        
    } catch (error) {
        utils.addError(currentEntry, "OSRM API chyba: " + error.toString(), "callOSRMRoute");
        return null;
    }
}

/**
 * Vypočíta vzdialenosť a čas pre úsek trasy
 */
function calculateSegment(fromPoint, toPoint, segmentName) {
    var result = {
        km: 0,
        trvanie: 0,
        success: false,
        method: "none"
    };
    
    utils.addDebug(currentEntry, "  📏 Počítam " + segmentName);
    
    // 1. Skús OSRM API
    var osrmResult = callOSRMRoute([fromPoint, toPoint]);
    
    if (osrmResult && osrmResult.success) {
        result.km = osrmResult.distance;
        result.trvanie = osrmResult.duration;
        result.success = true;
        result.method = "OSRM";
        utils.addDebug(currentEntry, "    ✅ OSRM: " + result.km.toFixed(2) + " km, " + result.trvanie.toFixed(2) + " h");
    } else {
        // 2. Fallback na vzdušnú vzdialenosť
        var airDistance = calculateAirDistance(fromPoint, toPoint);
        result.km = airDistance * 1.3; // koeficient pre cestnú vzdialenosť
        result.trvanie = result.km / 50; // priemerná rýchlosť 50 km/h
        result.success = true;
        result.method = "Vzdušná";
        utils.addDebug(currentEntry, "    📐 Vzdušná: " + result.km.toFixed(2) + " km, " + result.trvanie.toFixed(2) + " h");
    }
    
    return result;
}

// ==============================================
// HLAVNÉ FUNKCIE VÝPOČTU
// ==============================================

/**
 * KROK 1: Výpočet trasy s atribútmi
 */
function calculateRoute() {
    utils.addDebug(currentEntry, "📏 === KROK 1: VÝPOČET TRASY ===");
    
    var result = {
        success: false,
        totalKm: 0,
        casJazdy: 0,
        casNaZastavkach: 0,
        celkovyCas: 0,
        segments: []
    };
    
    try {
        // Získaj polia trasy
        var start = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.start);
        var stops = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.stops);
        var destination = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.destination);
        
        utils.addDebug(currentEntry, "  🎯 Štart: " + (start.length > 0 ? "✓" : "✗"));
        utils.addDebug(currentEntry, "  🛑 Zastávky: " + stops.length);
        utils.addDebug(currentEntry, "  🏁 Cieľ: " + (destination.length > 0 ? "✓" : "✗"));
        
        if (start.length === 0 || destination.length === 0) {
            utils.addError(currentEntry, "Chýba štart alebo cieľ", "calculateRoute");
            return result;
        }
        
        // Extrahuj GPS súradnice
        var startGPS = extractGPSFromPlace(start);
        var destinationGPS = extractGPSFromPlace(destination);
        
        if (!startGPS || !destinationGPS) {
            utils.addError(currentEntry, "Chýbajú GPS súradnice", "calculateRoute");
            return result;
        }
        
        // Vytvor zoznam všetkých bodov trasy
        var routePoints = [startGPS];
        var stopsGPS = [];
        
        for (var i = 0; i < stops.length; i++) {
            var gps = extractGPSFromPlace([stops[i]]);
            if (gps) {
                routePoints.push(gps);
                stopsGPS.push(gps);
            }
        }
        
        routePoints.push(destinationGPS);
        
        utils.addDebug(currentEntry, "  📍 Celkom " + routePoints.length + " bodov na trase");
        
        // Vypočítaj jednotlivé úseky
        var currentPoint = startGPS;
        var defaultZdrzanie = getDefaultZdrzanie();
        
        // Úseky cez zastávky
        for (var j = 0; j < stops.length; j++) {
            if (!stopsGPS[j]) continue;
            
            var segment = calculateSegment(currentPoint, stopsGPS[j], "Úsek " + (j+1));
            
            if (segment.success) {
                result.totalKm += segment.km;
                result.casJazdy += segment.trvanie;
                
                // Nastav atribúty zastávky
                stops[j].setAttr(CONFIG.attributes.km, Math.round(segment.km * 10) / 10);
                stops[j].setAttr(CONFIG.attributes.trvanie, segment.trvanie);
                
                // Nastav zdržanie ak nie je nastavené
                var existingZdrzanie = stops[j].attr(CONFIG.attributes.zdrzanie);
                if (!existingZdrzanie || existingZdrzanie === 0) {
                    stops[j].setAttr(CONFIG.attributes.zdrzanie, defaultZdrzanie);
                    result.casNaZastavkach += defaultZdrzanie;
                    utils.addDebug(currentEntry, "    ⏱️ Nastavené default zdržanie: " + defaultZdrzanie + " h");
                } else {
                    var zdrz = utils.convertDurationToHours(existingZdrzanie);
                    result.casNaZastavkach += zdrz;
                    utils.addDebug(currentEntry, "    ⏱️ Existujúce zdržanie: " + zdrz + " h");
                }
                
                currentPoint = stopsGPS[j];
            }
        }
        
        // Posledný úsek do cieľa
        var lastSegment = calculateSegment(currentPoint, destinationGPS, "Úsek do cieľa");
        
        if (lastSegment.success) {
            result.totalKm += lastSegment.km;
            result.casJazdy += lastSegment.trvanie;
            
            // Nastav atribúty cieľa
            destination[0].setAttr(CONFIG.attributes.km, Math.round(lastSegment.km * 10) / 10);
            destination[0].setAttr(CONFIG.attributes.trvanie, lastSegment.trvanie);
        }
        
        // Vypočítaj celkový čas
        result.celkovyCas = result.casJazdy + result.casNaZastavkach;
        
        // Zaokrúhli hodnoty
        result.totalKm = Math.round(result.totalKm * 10) / 10;
        result.casJazdy = Math.round(result.casJazdy * 100) / 100;
        result.casNaZastavkach = Math.round(result.casNaZastavkach * 100) / 100;
        result.celkovyCas = Math.round(result.celkovyCas * 100) / 100;
        
        // Ulož do polí
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.km, result.totalKm);
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.rideTime, result.casJazdy);
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.stopTime, result.casNaZastavkach);
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.totalTime, result.celkovyCas);
        
        utils.addDebug(currentEntry, "\n  📊 VÝSLEDKY:");
        utils.addDebug(currentEntry, "  • Vzdialenosť: " + result.totalKm + " km");
        utils.addDebug(currentEntry, "  • Čas jazdy: " + result.casJazdy + " h");
        utils.addDebug(currentEntry, "  • Čas na zastávkach: " + result.casNaZastavkach + " h");
        utils.addDebug(currentEntry, "  • Celkový čas: " + result.celkovyCas + " h");
        
        result.success = true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateRoute", error);
    }
    
    return result;
}

/**
 * KROK 2: Spracovanie šoféra
 */
function processDriver() {
    utils.addDebug(currentEntry, "\n🚗 === KROK 2: SPRACOVANIE ŠOFÉRA ===");
    
    var result = {
        success: false,
        driverInCrew: false
    };
    
    try {
        var sofer = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.driver);
        var crew = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.crew);
        
        if (sofer.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadny šofér nebol zadaný");
            result.success = true;
            return result;
        }
        
        var driverObj = sofer[0];
        var driverNick = utils.safeGet(driverObj, "Nick", "");
        
        utils.addDebug(currentEntry, "  👤 Šofér: " + driverNick);
        
        // Skontroluj či šofér nie je už v posádke
        for (var i = 0; i < crew.length; i++) {
            var clenNick = utils.safeGet(crew[i], "Nick", "");
            if (clenNick === driverNick) {
                result.driverInCrew = true;
                utils.addDebug(currentEntry, "  ✅ Šofér už je v posádke");
                break;
            }
        }
        
        // Ak šofér nie je v posádke, pridaj ho
        if (!result.driverInCrew) {
            crew.push(driverObj);
            utils.safeSet(currentEntry, CONFIG.fields.rideLog.crew, crew);
            utils.addDebug(currentEntry, "  ➕ Šofér pridaný do posádky");
        }
        
        result.success = true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processDriver", error);
    }
    
    return result;
}

/**
 * KROK 3: Výpočet mzdových nákladov
 */
function calculateWageCosts() {
    utils.addDebug(currentEntry, "\n💰 === KROK 3: VÝPOČET MZDOVÝCH NÁKLADOV ===");
    
    var result = {
        success: false,
        celkoveMzdy: 0,
        detaily: []
    };
    
    try {
        var crew = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.crew);
        var datum = utils.safeGet(currentEntry, CONFIG.fields.rideLog.date, new Date());
        var celkovyCas = utils.safeGet(currentEntry, CONFIG.fields.rideLog.totalTime, 0);
        
        if (crew.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna posádka");
            result.success = true;
            return result;
        }
        
        if (celkovyCas === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Celkový čas je 0");
            result.success = true;
            return result;
        }
        
        utils.addDebug(currentEntry, "  👥 Posádka: " + crew.length + " členov");
        utils.addDebug(currentEntry, "  ⏱️ Celkový čas: " + celkovyCas + " h");
        
        // Spracuj každého člena posádky
        for (var i = 0; i < crew.length; i++) {
            var zamestnanec = crew[i];
            var meno = utils.formatEmployeeName(zamestnanec);
            
            utils.addDebug(currentEntry, "\n  [" + (i+1) + "/" + crew.length + "] " + meno);
            
            // Získaj detaily zamestnanca s hodinovou sadzbou
            var empDetails = utils.getEmployeeDetails(zamestnanec, datum);
            
            if (!empDetails || !empDetails.hourlyRate || empDetails.hourlyRate <= 0) {
                utils.addError(currentEntry, "Zamestnanec " + meno + " nemá platnú sadzbu", "calculateWageCosts");
                continue;
            }
            
            var hodinovka = empDetails.hourlyRate;
            var mzda = celkovyCas * hodinovka;
            
            // Nastav atribúty na zamestnancovi
            crew[i].setAttr(CONFIG.attributes.hodinovka, hodinovka);
            crew[i].setAttr(CONFIG.attributes.dennaMzda, Math.round(mzda * 100) / 100);
            
            result.celkoveMzdy += mzda;
            result.detaily.push({
                meno: meno,
                hodinovka: hodinovka,
                mzda: mzda
            });
            
            utils.addDebug(currentEntry, "    💵 Hodinovka: " + hodinovka + " €/h");
            utils.addDebug(currentEntry, "    💰 Mzda: " + utils.formatMoney(mzda));
        }
        
        // Zaokrúhli a ulož celkové mzdy
        result.celkoveMzdy = Math.round(result.celkoveMzdy * 100) / 100;
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.wageCosts, result.celkoveMzdy);
        
        utils.addDebug(currentEntry, "\n  💰 CELKOVÉ MZDY: " + utils.formatMoney(result.celkoveMzdy));
        
        result.success = true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateWageCosts", error);
    }
    
    return result;
}

/**
 * Vytvorí info záznam s detailmi o jazde
 */
function createInfoRecord(routeResult, wageResult) {
    try {
        var info = "";
        
        // Časová značka
        info += "🚗 KNIHA JÁZD - " + utils.formatDate(moment()) + "\n";
        info += "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        
        // Trasa
        if (routeResult.success) {
            info += "📏 TRASA:\n";
            info += "• Vzdialenosť: " + routeResult.totalKm + " km\n";
            info += "• Čas jazdy: " + routeResult.casJazdy + " h\n";
            info += "• Čas na zastávkach: " + routeResult.casNaZastavkach + " h\n";
            info += "• Celkový čas: " + routeResult.celkovyCas + " h\n\n";
        }
        
        // Posádka a mzdy
        if (wageResult.success && wageResult.detaily.length > 0) {
            info += "👥 POSÁDKA A MZDY:\n";
            for (var i = 0; i < wageResult.detaily.length; i++) {
                var detail = wageResult.detaily[i];
                info += "• " + detail.meno + ": " + detail.hodinovka + " €/h = " + utils.formatMoney(detail.mzda) + "\n";
            }
            info += "\n💰 CELKOVÉ MZDOVÉ NÁKLADY: " + utils.formatMoney(wageResult.celkoveMzdy) + "\n";
        }
        
        info += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        info += "Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "Vygenerované: " + utils.formatDate(moment());
        
        utils.safeSet(currentEntry, "info", info);
        utils.addDebug(currentEntry, "✅ Info záznam vytvorený");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
        return false;
    }
}

// ==============================================
// FINÁLNY SÚHRN
// ==============================================

function logFinalSummary(steps) {
    try {
        utils.addDebug(currentEntry, "\n📊 === FINÁLNY SÚHRN ===");
        
        var allSuccess = true;
        for (var step in steps) {
            var status = steps[step].success ? "✅" : "❌";
            utils.addDebug(currentEntry, status + " " + steps[step].name);
            if (!steps[step].success) allSuccess = false;
        }
        
        if (allSuccess) {
            utils.addDebug(currentEntry, "\n🎉 === VŠETKY KROKY ÚSPEŠNÉ ===");
        } else {
            utils.addDebug(currentEntry, "\n⚠️ === NIEKTORÉ KROKY ZLYHALI ===");
        }
        
        utils.addDebug(currentEntry, "⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        utils.addDebug(currentEntry, "📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "logFinalSummary", error);
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Kontrola závislostí
        var depCheck = utils.checkDependencies(['config', 'core', 'business']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            message("❌ Chýbajú potrebné moduly!\n\n" + depCheck.missing.join(", "));
            return false;
        }
        
        // Vyčisti logy
        utils.clearLogs(currentEntry, true);
        
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "MementoUtils verzia: " + utils.version);
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()));
        
        // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Výpočet trasy" },
            step2: { success: false, name: "Spracovanie šoféra" },
            step3: { success: false, name: "Výpočet mzdových nákladov" },
            step4: { success: false, name: "Vytvorenie info záznamu" }
        };
        
        // KROK 1: Výpočet trasy
        var routeResult = calculateRoute();
        steps.step1.success = routeResult.success;
        
        // KROK 2: Spracovanie šoféra
        var driverResult = processDriver();
        steps.step2.success = driverResult.success;
        
        // KROK 3: Výpočet mzdových nákladov
        var wageResult = calculateWageCosts();
        steps.step3.success = wageResult.success;
        
        // KROK 4: Vytvorenie info záznamu
        steps.step4.success = createInfoRecord(routeResult, wageResult);
        
        // Finálny súhrn
        logFinalSummary(steps);
        
        // Ak všetko prebehlo v poriadku
        if (steps.step1.success) {
            var msg = "✅ Prepočet dokončený\n\n";
            msg += "📏 Vzdialenosť: " + routeResult.totalKm + " km\n";
            msg += "⏱️ Celkový čas: " + routeResult.celkovyCas + " h\n";
            if (wageResult.success && wageResult.celkoveMzdy > 0) {
                msg += "💰 Mzdové náklady: " + utils.formatMoney(wageResult.celkoveMzdy);
            }
            message(msg);
        }
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "main", error);
        message("❌ Kritická chyba!\n\nPozrite Error Log pre detaily.");
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();