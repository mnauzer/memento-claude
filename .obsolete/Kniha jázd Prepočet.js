// ==============================================
// MEMENTO DATABASE - KNIHA JÁZD (ROUTE CALCULATION & PAYROLL)
// Verzia: 8.3 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Kniha jázd | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet vzdialenosti, času jazdy a miezd posádky s atribútmi zastávok
//    - Výpočet trasy pomocou OSRM API s fallback na vzdušnú vzdialenosť
//    - Automatické nastavenie default zdržania na zastávkach
//    - Výpočet mzdových nákladov posádky
// ==============================================
// ✅ KOMPLETNÝ STANDALONE SCRIPT bez závislostí
// ==============================================

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Kniha jázd Prepočet",
    version: "8.3",
    
    // Debug nastavenia
    debug: true,
    debugFieldName: "Debug_Log",
    errorFieldName: "Error_Log",
    
    // Názvy knižníc
    sadzbyLibrary: "sadzby zamestnancov",
    miestalibrary: "Miesta", 
    zamestnancilibrary: "Zamestnanci",
    defaultsLibrary: "ASISTANTO Defaults",
    
    // Názvy polí - knižnica "Kniha jázd"
    fields: {
        start: "Štart",
        zastavky: "Zastávky",
        ciel: "Cieľ", 
        km: "Km",
        casJazdy: "Čas jazdy",
        casNaZastavkach: "Čas na zastávkach",
        celkovyCas: "Celkový čas",
        posadka: "Posádka",
        sofer: "Šofér",
        datum: "Dátum",
        mzdy: "Mzdové náklady",
        info: "info"
    },
    
    // Názvy atribútov
    attributes: {
        trvanie: "trvanie",
        zdrzanie: "zdržanie",  
        km: "km",
        hodinovka: "hodinovka",
        dennaMzda: "denná mzda"
    },
    
    // Názvy polí - knižnica "Miesta"
    miestalFields: {
        gps: "GPS",
        nazov: "Názov"
    },
    
    // Názvy polí - knižnica "sadzby zamestnancov"
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    },
    
    // Názvy polí - knižnica "Zamestnanci"
    zamestnancilFields: {
        meno: "Meno",
        nick: "Nick"
    },
    
    // OSRM API nastavenia
    osrm: {
        maxRetries: 3,
        baseUrl: "https://router.project-osrm.org/route/v1/driving/",
        requestTimeout: 5000,
        retryDelay: 1000
    }
};

// ==============================================
// GLOBÁLNE PREMENNÉ
// ==============================================

var currentEntry = entry();

// ==============================================
// LOGGING FUNKCIE
// ==============================================

function addDebug(message) {
    if (!CONFIG.debug) return;
    
    try {
        var timestamp = moment().format("HH:mm:ss");
        var debugMessage = "[" + timestamp + "] " + message;
        var existingDebug = currentEntry.field(CONFIG.debugFieldName) || "";
        currentEntry.set(CONFIG.debugFieldName, existingDebug + debugMessage + "\n");
    } catch (e) {
        log("Debug error: " + e);
    }
}

function addError(message, source) {
    try {
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var errorMessage = "[" + timestamp + "] " + (source ? source + ": " : "") + message;
        var existingError = currentEntry.field(CONFIG.errorFieldName) || "";
        currentEntry.set(CONFIG.errorFieldName, existingError + errorMessage + "\n");
    } catch (e) {
        log("Error logging failed: " + e);
    }
}

function clearLogs() {
    currentEntry.set(CONFIG.debugFieldName, "");
    currentEntry.set(CONFIG.errorFieldName, "");
}

// ==============================================
// UTILITY FUNKCIE
// ==============================================

function formatMoney(amount) {
    return amount.toFixed(2) + " €";
}

function convertDurationToHours(duration) {
    if (!duration) return 0;
    
    // Ak je to Duration objekt
    if (typeof duration === 'object' && duration.valueOf) {
        var ms = duration.valueOf();
        return ms / (1000 * 60 * 60);
    }
    
    // Ak je to číslo
    return parseFloat(duration) || 0;
}

/**
 * Získa default zdržanie z ASISTANTO Defaults
 */
function getDefaultZdrzanie() {
    try {
        var defaultsLib = libByName(CONFIG.defaultsLibrary);
        if (!defaultsLib) {
            addError("Knižnica " + CONFIG.defaultsLibrary + " nenájdená", "getDefaultZdrzanie");
            return 0.5;
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (defaultsEntries.length > 0) {
            var defaultZdrz = defaultsEntries[0].field("Default zdržanie");
            
            if (defaultZdrz !== null && defaultZdrz !== undefined) {
                return convertDurationToHours(defaultZdrz);
            }
        }
        
        return 0.5; // Default 30 minút
        
    } catch (error) {
        addError(error.toString(), "getDefaultZdrzanie");
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
    
    var miesto = place[0];
    var nazov = "";
    
    try {
        nazov = miesto.field(CONFIG.miestalFields.nazov) || "Neznáme";
    } catch (e) {
        nazov = "Neznáme";
    }
    
    addDebug("  📍 Spracovávam miesto: " + nazov);
    
    // Získaj GPS pole - JSGeolocation objekt
    var gpsLocation = null;
    
    try {
        gpsLocation = miesto.field(CONFIG.miestalFields.gps);
    } catch (e) {
        addDebug("  ⚠️ Chyba pri získavaní GPS poľa: " + e);
        return null;
    }
    
    if (!gpsLocation) {
        addDebug("  ⚠️ Miesto '" + nazov + "' nemá GPS súradnice");
        return null;
    }
    
    var lat = null;
    var lon = null;
    
    try {
        // JSGeolocation objekt má properties lat a lng
        lat = gpsLocation.lat;
        lon = gpsLocation.lng;
        
        // Debug informácie
        if (gpsLocation.address) {
            addDebug("    Adresa: " + gpsLocation.address);
        }
        addDebug("    Súradnice: " + lat + ", " + lon);
        
    } catch (error) {
        addError("Chyba pri čítaní GPS objektu: " + error.toString(), "extractGPSFromPlace");
        return null;
    }
    
    // Validácia GPS súradníc
    if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        // Základná validácia rozsahu
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            addDebug("  ✅ GPS úspešne extrahované: " + lat + ", " + lon);
            return { lat: lat, lon: lon };
        } else {
            addDebug("  ❌ GPS súradnice mimo platného rozsahu: " + lat + ", " + lon);
        }
    } else {
        addDebug("  ❌ Neplatné GPS súradnice");
    }
    
    return null;
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
        
        // Vytvor URL s koordinátmi
        var coordinates = "";
        for (var i = 0; i < points.length; i++) {
            if (i > 0) coordinates += ";";
            coordinates += points[i].lon + "," + points[i].lat;
        }
        
        var url = CONFIG.osrm.baseUrl + coordinates + "?overview=false&steps=false";
        
        addDebug("  🌐 OSRM API volanie pre " + points.length + " bodov");
        
        var httpObj = http();
        var response = httpObj.get(url);
        
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
        
        addDebug("  ⚠️ OSRM API nevrátilo trasu (kód: " + response.code + ")");
        return null;
        
    } catch (error) {
        addError("OSRM API chyba: " + error.toString(), "callOSRMRoute");
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
    
    addDebug("  📏 Počítam " + segmentName);
    
    // 1. Skús OSRM API
    var osrmResult = callOSRMRoute([fromPoint, toPoint]);
    
    if (osrmResult && osrmResult.success) {
        result.km = osrmResult.distance;
        result.trvanie = osrmResult.duration;
        result.success = true;
        result.method = "OSRM";
        addDebug("    ✅ OSRM: " + result.km.toFixed(2) + " km, " + result.trvanie.toFixed(2) + " h");
    } else {
        // 2. Fallback na vzdušnú vzdialenosť
        var airDistance = calculateAirDistance(fromPoint, toPoint);
        result.km = airDistance * 1.3; // koeficient pre cestnú vzdialenosť
        result.trvanie = result.km / 50; // priemerná rýchlosť 50 km/h
        result.success = true;
        result.method = "Vzdušná";
        addDebug("    📐 Vzdušná: " + result.km.toFixed(2) + " km, " + result.trvanie.toFixed(2) + " h");
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
    addDebug("📏 === KROK 1: VÝPOČET TRASY ===");
    
    var result = {
        success: false,
        totalKm: 0,
        casJazdy: 0,
        casNaZastavkach: 0,
        celkovyCas: 0
    };
    
    try {
        // Získaj polia trasy
        var start = currentEntry.field(CONFIG.fields.start);
        var zastavky = currentEntry.field(CONFIG.fields.zastavky);
        var ciel = currentEntry.field(CONFIG.fields.ciel);
        
        addDebug("  🎯 Štart: " + (start && start.length > 0 ? "✓" : "✗"));
        addDebug("  🛑 Zastávky: " + (zastavky ? zastavky.length : 0));
        addDebug("  🏁 Cieľ: " + (ciel && ciel.length > 0 ? "✓" : "✗"));
        
        if (!start || start.length === 0 || !ciel || ciel.length === 0) {
            addError("Chýba štart alebo cieľ", "calculateRoute");
            return result;
        }
        
        // Extrahuj GPS súradnice
        var startGPS = extractGPSFromPlace(start);
        var cielGPS = extractGPSFromPlace(ciel);
        
        if (!startGPS || !cielGPS) {
            addError("Chýbajú GPS súradnice pre štart alebo cieľ", "calculateRoute");
            return result;
        }
        
        // Vypočítaj jednotlivé úseky
        var currentPoint = startGPS;
        var defaultZdrzanie = getDefaultZdrzanie();
        
        // Úseky cez zastávky
        if (zastavky && zastavky.length > 0) {
            for (var j = 0; j < zastavky.length; j++) {
                var gps = extractGPSFromPlace([zastavky[j]]);
                if (!gps) {
                    addDebug("  ⚠️ Zastávka " + (j+1) + " nemá GPS");
                    continue;
                }
                
                var segment = calculateSegment(currentPoint, gps, "Úsek " + (j+1));
                
                if (segment.success) {
                    result.totalKm += segment.km;
                    result.casJazdy += segment.trvanie;
                    
                    // Nastav atribúty zastávky
                    try {
                        zastavky[j].setAttr(CONFIG.attributes.km, Math.round(segment.km * 10) / 10);
                        zastavky[j].setAttr(CONFIG.attributes.trvanie, segment.trvanie);
                        
                        // Nastav zdržanie ak nie je nastavené
                        var existingZdrzanie = zastavky[j].attr(CONFIG.attributes.zdrzanie);
                        var zdrz = 0;
                        
                        if (!existingZdrzanie || existingZdrzanie === 0) {
                            zastavky[j].setAttr(CONFIG.attributes.zdrzanie, defaultZdrzanie);
                            zdrz = defaultZdrzanie;
                            addDebug("    ⏱️ Nastavené default zdržanie: " + defaultZdrzanie + " h");
                        } else {
                            zdrz = convertDurationToHours(existingZdrzanie);
                            addDebug("    ⏱️ Existujúce zdržanie: " + zdrz + " h");
                        }
                        
                        result.casNaZastavkach += zdrz;
                        
                    } catch (attrError) {
                        addError("Chyba pri nastavovaní atribútov zastávky: " + attrError.toString(), "calculateRoute");
                    }
                    
                    currentPoint = gps;
                }
            }
        }
        
        // Posledný úsek do cieľa
        var lastSegment = calculateSegment(currentPoint, cielGPS, "Úsek do cieľa");
        
        if (lastSegment.success) {
            result.totalKm += lastSegment.km;
            result.casJazdy += lastSegment.trvanie;
            
            // Nastav atribúty cieľa
            try {
                ciel[0].setAttr(CONFIG.attributes.km, Math.round(lastSegment.km * 10) / 10);
                ciel[0].setAttr(CONFIG.attributes.trvanie, lastSegment.trvanie);
            } catch (attrError) {
                addError("Chyba pri nastavovaní atribútov cieľa: " + attrError.toString(), "calculateRoute");
            }
        }
        
        // Vypočítaj celkový čas
        result.celkovyCas = result.casJazdy + result.casNaZastavkach;
        
        // Zaokrúhli hodnoty
        result.totalKm = Math.round(result.totalKm * 10) / 10;
        result.casJazdy = Math.round(result.casJazdy * 100) / 100;
        result.casNaZastavkach = Math.round(result.casNaZastavkach * 100) / 100;
        result.celkovyCas = Math.round(result.celkovyCas * 100) / 100;
        
        // Ulož do polí
        currentEntry.set(CONFIG.fields.km, result.totalKm);
        currentEntry.set(CONFIG.fields.casJazdy, result.casJazdy);
        currentEntry.set(CONFIG.fields.casNaZastavkach, result.casNaZastavkach);
        currentEntry.set(CONFIG.fields.celkovyCas, result.celkovyCas);
        
        addDebug("\n  📊 VÝSLEDKY:");
        addDebug("  • Vzdialenosť: " + result.totalKm + " km");
        addDebug("  • Čas jazdy: " + result.casJazdy + " h");
        addDebug("  • Čas na zastávkach: " + result.casNaZastavkach + " h");
        addDebug("  • Celkový čas: " + result.celkovyCas + " h");
        
        result.success = true;
        
    } catch (error) {
        addError(error.toString(), "calculateRoute");
    }
    
    return result;
}

/**
 * KROK 2: Spracovanie šoféra
 */
function processDriver() {
    addDebug("\n🚗 === KROK 2: SPRACOVANIE ŠOFÉRA ===");
    
    var result = {
        success: false,
        soferInPosadke: false
    };
    
    try {
        var sofer = currentEntry.field(CONFIG.fields.sofer);
        var posadka = currentEntry.field(CONFIG.fields.posadka) || [];
        
        if (!sofer || sofer.length === 0) {
            addDebug("  ℹ️ Žiadny šofér nebol zadaný");
            result.success = true;
            return result;
        }
        
        var soferObj = sofer[0];
        var soferNick = "";
        
        try {
            soferNick = soferObj.field(CONFIG.zamestnancilFields.nick) || "";
        } catch (e) {
            soferNick = "Neznámy";
        }
        
        addDebug("  👤 Šofér: " + soferNick);
        
        // Skontroluj či šofér nie je už v posádke
        for (var i = 0; i < posadka.length; i++) {
            var clenNick = "";
            try {
                clenNick = posadka[i].field(CONFIG.zamestnancilFields.nick) || "";
            } catch (e) {
                clenNick = "";
            }
            
            if (clenNick === soferNick) {
                result.soferInPosadke = true;
                addDebug("  ✅ Šofér už je v posádke");
                break;
            }
        }
        
        // Ak šofér nie je v posádke, pridaj ho
        if (!result.soferInPosadke) {
            posadka.push(soferObj);
            currentEntry.set(CONFIG.fields.posadka, posadka);
            addDebug("  ➕ Šofér pridaný do posádky");
        }
        
        result.success = true;
        
    } catch (error) {
        addError(error.toString(), "processDriver");
    }
    
    return result;
}

/**
 * KROK 3: Výpočet mzdových nákladov
 */
function calculateWageCosts() {
    addDebug("\n💰 === KROK 3: VÝPOČET MZDOVÝCH NÁKLADOV ===");
    
    var result = {
        success: false,
        celkoveMzdy: 0,
        detaily: []
    };
    
    try {
        var posadka = currentEntry.field(CONFIG.fields.posadka) || [];
        var datum = currentEntry.field(CONFIG.fields.datum) || new Date();
        var celkovyCas = currentEntry.field(CONFIG.fields.celkovyCas) || 0;
        
        if (posadka.length === 0) {
            addDebug("  ℹ️ Žiadna posádka");
            result.success = true;
            return result;
        }
        
        if (celkovyCas === 0) {
            addDebug("  ⚠️ Celkový čas je 0");
            result.success = true;
            return result;
        }
        
        addDebug("  👥 Posádka: " + posadka.length + " členov");
        addDebug("  ⏱️ Celkový čas: " + celkovyCas + " h");
        
        // Spracuj každého člena posádky
        for (var i = 0; i < posadka.length; i++) {
            var zamestnanec = posadka[i];
            var meno = "";
            
            try {
                meno = zamestnanec.field(CONFIG.zamestnancilFields.meno) || 
                       zamestnanec.field(CONFIG.zamestnancilFields.nick) || 
                       "Zamestnanec " + (i+1);
            } catch (e) {
                meno = "Zamestnanec " + (i+1);
            }
            
            addDebug("\n  [" + (i+1) + "/" + posadka.length + "] " + meno);
            
            // Získaj hodinovku pre zamestnanca
            var hodinovka = 0;
            
            try {
                // Najprv skús nájsť sadzby cez linksFrom
                var sadzbyZamestnanca = zamestnanec.linksFrom(CONFIG.sadzbyLibrary, CONFIG.sadzbyFields.zamestnanec);
                
                if (sadzbyZamestnanca && sadzbyZamestnanca.length > 0) {
                    // Nájdi najnovšiu platnú sadzbu
                    var najnovsiaSadzba = null;
                    var najnovsiDatum = null;
                    
                    for (var j = 0; j < sadzbyZamestnanca.length; j++) {
                        var sadzba = sadzbyZamestnanca[j];
                        var platnostOd = sadzba.field(CONFIG.sadzbyFields.platnostOd);
                        
                        if (platnostOd && platnostOd <= datum) {
                            if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                                najnovsiDatum = platnostOd;
                                najnovsiaSadzba = sadzba;
                            }
                        }
                    }
                    
                    if (najnovsiaSadzba) {
                        hodinovka = najnovsiaSadzba.field(CONFIG.sadzbyFields.sadzba) || 0;
                        var formattedDate = najnovsiDatum ? moment(najnovsiDatum).format("DD.MM.YYYY") : "?";
                        addDebug("    💵 Hodinovka: " + hodinovka + " €/h (platná od " + formattedDate + ")");
                    }
                } else {
                    addDebug("    ⚠️ Nenašiel som sadzby pre zamestnanca");
                }
                
            } catch (error) {
                addError("Chyba pri získavaní sadzby: " + error.toString(), "calculateWageCosts");
            }
            
            if (!hodinovka || hodinovka <= 0) {
                addError("Zamestnanec " + meno + " nemá platnú sadzbu", "calculateWageCosts");
                continue;
            }
            
            var mzda = celkovyCas * hodinovka;
            
            // Nastav atribúty na zamestnancovi
            try {
                posadka[i].setAttr(CONFIG.attributes.hodinovka, hodinovka);
                posadka[i].setAttr(CONFIG.attributes.dennaMzda, Math.round(mzda * 100) / 100);
            } catch (attrError) {
                addDebug("    ⚠️ Nepodarilo sa nastaviť atribúty: " + attrError);
            }
            
            result.celkoveMzdy += mzda;
            result.detaily.push({
                meno: meno,
                hodinovka: hodinovka,
                mzda: mzda
            });
            
            addDebug("    💰 Mzda: " + formatMoney(mzda));
        }
        
        // Zaokrúhli a ulož celkové mzdy
        result.celkoveMzdy = Math.round(result.celkoveMzdy * 100) / 100;
        currentEntry.set(CONFIG.fields.mzdy, result.celkoveMzdy);
        
        addDebug("\n  💰 CELKOVÉ MZDY: " + formatMoney(result.celkoveMzdy));
        
        result.success = true;
        
    } catch (error) {
        addError(error.toString(), "calculateWageCosts");
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
        info += "🚗 KNIHA JÁZD - " + moment().format("DD.MM.YYYY HH:mm") + "\n";
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
                info += "• " + detail.meno + ": " + detail.hodinovka + " €/h = " + formatMoney(detail.mzda) + "\n";
            }
            info += "\n💰 CELKOVÉ MZDOVÉ NÁKLADY: " + formatMoney(wageResult.celkoveMzdy) + "\n";
        }
        
        info += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        info += "Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "Vygenerované: " + moment().format("DD.MM.YYYY HH:mm:ss");
        
        currentEntry.set(CONFIG.fields.info, info);
        addDebug("✅ Info záznam vytvorený");
        
        return true;
        
    } catch (error) {
        addError(error.toString(), "createInfoRecord");
        return false;
    }
}

// ==============================================
// FINÁLNY SÚHRN
// ==============================================

function logFinalSummary(steps) {
    try {
        addDebug("\n📊 === FINÁLNY SÚHRN ===");
        
        var allSuccess = true;
        for (var step in steps) {
            var status = steps[step].success ? "✅" : "❌";
            addDebug(status + " " + steps[step].name);
            if (!steps[step].success) allSuccess = false;
        }
        
        if (allSuccess) {
            addDebug("\n🎉 === VŠETKY KROKY ÚSPEŠNÉ ===");
        } else {
            addDebug("\n⚠️ === NIEKTORÉ KROKY ZLYHALI ===");
        }
        
        addDebug("⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        addDebug("📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
    } catch (error) {
        addError(error.toString(), "logFinalSummary");
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Vyčisti logy
        clearLogs();
        
        addDebug("🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        addDebug("Čas spustenia: " + moment().format("DD.MM.YYYY HH:mm:ss"));
        
        // Test HTTP funkcionality
        try {
            var testHttp = http();
            if (testHttp) {
                addDebug("✅ HTTP funkcia dostupná v Memento");
            } else {
                addDebug("❌ HTTP funkcia nedostupná");
            }
        } catch (httpError) {
            addDebug("❌ HTTP funkcia chyba: " + httpError);
        }
        
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
                msg += "💰 Mzdové náklady: " + formatMoney(wageResult.celkoveMzdy);
            }
            message(msg);
        } else {
            message("⚠️ Prepočet dokončený s chybami\n\nPozrite Debug Log pre detaily.");
        }
        
        return true;
        
    } catch (error) {
        addError("Kritická chyba: " + error.toString(), "main");
        message("❌ Kritická chyba!\n\nPozrite Error Log pre detaily.");
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();