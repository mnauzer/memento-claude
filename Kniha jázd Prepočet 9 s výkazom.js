// ==============================================
// MEMENTO DATABASE - KNIHA JÁZD (ROUTE CALCULATION & PAYROLL)
// Verzia: 10.1 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Kniha jázd | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet vzdialenosti, času jazdy a miezd posádky
//    - Výpočet trasy pomocou OSRM API s fallback na vzdušnú vzdialenosť
//    - Automatické nastavenie default zdržania na zastávkach
//    - Synchronizácia Cieľa -> Stanovište vozidla
//    - Integrácia s MementoUtils ekosystémom
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoCore (základné funkcie)
//    - MementoBusiness (business logika)
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
    version: "10.1",
    
    // Referencie na centrálny config
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
        vozidlo: "Vozidlo",
        info: centralConfig.fields.common.info
    },
    
    // Atribúty
    attributes: {
        trvanie: "trvanie",
        zdrzanie: "zdržanie",  
        km: "km",
        hodinovka: "hodinovka",
        dennaMzda: "denná mzda"
    },
    
    // Knižnice
    libraries: {
        sadzby: centralConfig.libraries.rates,
        miesta: "Miesta",
        zamestnanci: centralConfig.libraries.employees,
        defaults: centralConfig.libraries.defaults,
        vozidla: centralConfig.libraries.vehicles
    },
    
    // Názvy polí v knižniciach
    miestalFields: {
        gps: "GPS",
        nazov: "Názov"
    },
    
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    },
    
    zamestnancilFields: {
        meno: "Meno",
        nick: "Nick"
    },
    
    vozidlaFields: {
        stanoviste: "Stanovište",
        nazov: "Názov"
    },
    
    // OSRM API nastavenia
    osrm: {
        maxRetries: 3,
        baseUrl: "https://router.project-osrm.org/route/v1/driving/",
        requestTimeout: 5000
    },
    
    // Business pravidlá
    settings: {
        roundToQuarterHour: false,
        defaultZdrzanie: 0.5 // 30 minút
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
            return CONFIG.settings.defaultZdrzanie;
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (defaultsEntries.length > 0) {
            var defaultZdrz = defaultsEntries[0].field("Default zdržanie");
            
            if (defaultZdrz !== null && defaultZdrz !== undefined) {
                return utils.convertDurationToHours(defaultZdrz);
            }
        }
        
        return CONFIG.settings.defaultZdrzanie;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getDefaultZdrzanie", error);
        return CONFIG.settings.defaultZdrzanie;
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
    var nazov = utils.safeGet(miesto, CONFIG.miestalFields.nazov, "Neznáme");
    
    utils.addDebug(currentEntry, "  📍 Spracovávam miesto: " + nazov);
    
    // Získaj GPS pole - JSGeolocation objekt
    var gpsLocation = null;
    
    try {
        gpsLocation = miesto.field(CONFIG.miestalFields.gps);
    } catch (e) {
        utils.addDebug(currentEntry, "  ⚠️ Chyba pri získavaní GPS poľa: " + e);
        return null;
    }
    
    if (!gpsLocation) {
        utils.addDebug(currentEntry, "  ⚠️ Miesto '" + nazov + "' nemá GPS súradnice");
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
            utils.addDebug(currentEntry, "    Adresa: " + gpsLocation.address);
        }
        utils.addDebug(currentEntry, "    Súradnice: " + lat + ", " + lon);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri čítaní GPS objektu: " + error.toString(), "extractGPSFromPlace", error);
        return null;
    }
    
    // Validácia GPS súradníc
    if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        // Základná validácia rozsahu
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            utils.addDebug(currentEntry, "  ✅ GPS úspešne extrahované: " + lat + ", " + lon);
            return { lat: lat, lon: lon };
        } else {
            utils.addDebug(currentEntry, "  ❌ GPS súradnice mimo platného rozsahu: " + lat + ", " + lon);
        }
    } else {
        utils.addDebug(currentEntry, "  ❌ Neplatné GPS súradnice");
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
            Math.cos(lat1) * Math.cos(lat2) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Vzdialenosť v km
    
    return d;
}

function toRadians(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Vypočíta segment trasy pomocou OSRM alebo fallback
 */
function calculateSegment(start, end, segmentName) {
    var result = {
        success: false,
        km: 0,
        trvanie: 0,
        metoda: "none"
    };
    
    try {
        utils.addDebug(currentEntry, "\n  🛣️ " + segmentName);
        
        if (!start || !end) {
            utils.addDebug(currentEntry, "    ❌ Chýbajú súradnice");
            return result;
        }
        
        // Pokus o OSRM API
        result = calculateOSRMRoute(start, end);
        
        if (result.success) {
            utils.addDebug(currentEntry, "    ✅ OSRM: " + result.km + " km, " + result.trvanie + " h");
            result.metoda = "OSRM";
        } else {
            // Fallback na vzdušnú vzdialenosť
            var airDistance = calculateAirDistance(start, end);
            var roadFactor = 1.4; // Empirický koeficient pre cestnú vzdialenosť
            var avgSpeed = 50; // Priemerná rýchlosť v km/h
            
            result.km = Math.round(airDistance * roadFactor * 10) / 10;
            result.trvanie = Math.round((result.km / avgSpeed) * 100) / 100;
            result.success = true;
            result.metoda = "Vzdušná čiara";
            
            utils.addDebug(currentEntry, "    📐 Vzdušná vzdialenosť: " + result.km + " km, " + result.trvanie + " h");
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte segmentu: " + error.toString(), "calculateSegment");
    }
    
    return result;
}

/**
 * Volanie OSRM API pre výpočet trasy
 */
function calculateOSRMRoute(start, end) {
    var result = {
        success: false,
        km: 0,
        trvanie: 0
    };
    
    try {
        if (!http) {
            utils.addDebug(currentEntry, "    ❌ HTTP funkcia nie je dostupná");
            return result;
        }
        
        var url = CONFIG.osrm.baseUrl + start.lon + "," + start.lat + ";" + 
                  end.lon + "," + end.lat + "?overview=false";
        
        utils.addDebug(currentEntry, "    🌐 OSRM API volanie...");
        
        var retries = 0;
        var response = null;
        
        while (retries < CONFIG.osrm.maxRetries && !response) {
            try {
                var httpClient = http();
                httpClient.headers({
                    "Accept": "application/json"
                });
                
                response = httpClient.get(url);
                
                if (response.code === 200) {
                    var data = JSON.parse(response.body);
                    
                    if (data.routes && data.routes.length > 0) {
                        var route = data.routes[0];
                        result.km = Math.round(route.distance / 100) / 10; // Metre na km
                        result.trvanie = Math.round(route.duration / 36) / 100; // Sekundy na hodiny
                        result.success = true;
                    }
                } else {
                    utils.addDebug(currentEntry, "    ⚠️ OSRM odpoveď: " + response.code);
                    retries++;
                }
                
            } catch (httpError) {
                utils.addDebug(currentEntry, "    ⚠️ HTTP chyba (pokus " + (retries + 1) + "): " + httpError);
                retries++;
            }
        }
        
    } catch (error) {
        utils.addDebug(currentEntry, "    ❌ OSRM API chyba: " + error.toString());
    }
    
    return result;
}

// ==============================================
// HLAVNÉ FUNKCIE PREPOČTU
// ==============================================

/**
 * KROK 1: Výpočet trasy
 */
function calculateRoute() {
    utils.addDebug(currentEntry, "\n📍 === KROK 1: VÝPOČET TRASY ===");
    
    var result = {
        success: false,
        totalKm: 0,
        casJazdy: 0,
        casNaZastavkach: 0,
        celkovyCas: 0
    };
    
    try {
        // Získaj body trasy
        var start = currentEntry.field(CONFIG.fields.start);
        var zastavky = currentEntry.field(CONFIG.fields.zastavky);
        var ciel = currentEntry.field(CONFIG.fields.ciel);
        
        utils.addDebug(currentEntry, "  🏁 Štart: " + (start && start.length > 0 ? "✓" : "✗"));
        utils.addDebug(currentEntry, "  🛑 Zastávky: " + (zastavky ? zastavky.length : 0));
        utils.addDebug(currentEntry, "  🏁 Cieľ: " + (ciel && ciel.length > 0 ? "✓" : "✗"));
        
        if (!start || start.length === 0 || !ciel || ciel.length === 0) {
            utils.addError(currentEntry, "Chýba štart alebo cieľ", "calculateRoute");
            return result;
        }
        
        // Extrahuj GPS súradnice
        var startGPS = extractGPSFromPlace(start);
        var cielGPS = extractGPSFromPlace(ciel);
        
        if (!startGPS || !cielGPS) {
            utils.addError(currentEntry, "Chýbajú GPS súradnice pre štart alebo cieľ", "calculateRoute");
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
                    utils.addDebug(currentEntry, "  ⚠️ Zastávka " + (j+1) + " nemá GPS");
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
                            utils.addDebug(currentEntry, "    ⏱️ Nastavené default zdržanie: " + defaultZdrzanie + " h");
                        } else {
                            zdrz = utils.convertDurationToHours(existingZdrzanie);
                            utils.addDebug(currentEntry, "    ⏱️ Existujúce zdržanie: " + zdrz + " h");
                        }
                        
                        result.casNaZastavkach += zdrz;
                        
                    } catch (attrError) {
                        utils.addError(currentEntry, "Chyba pri nastavovaní atribútov zastávky: " + attrError.toString(), "calculateRoute");
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
                utils.addError(currentEntry, "Chyba pri nastavovaní atribútov cieľa: " + attrError.toString(), "calculateRoute");
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
        utils.safeSet(currentEntry, CONFIG.fields.km, result.totalKm);
        utils.safeSet(currentEntry, CONFIG.fields.casJazdy, result.casJazdy);
        utils.safeSet(currentEntry, CONFIG.fields.casNaZastavkach, result.casNaZastavkach);
        utils.safeSet(currentEntry, CONFIG.fields.celkovyCas, result.celkovyCas);
        
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
        soferInPosadke: false
    };
    
    try {
        var sofer = currentEntry.field(CONFIG.fields.sofer);
        var posadka = currentEntry.field(CONFIG.fields.posadka) || [];
        
        if (!sofer || sofer.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadny šofér nebol zadaný");
            result.success = true;
            return result;
        }
        
        var soferObj = sofer[0];
        var soferNick = utils.safeGet(soferObj, CONFIG.zamestnancilFields.nick, "");
        
        utils.addDebug(currentEntry, "  👤 Šofér: " + utils.formatEmployeeName(soferObj));
        
        // Skontroluj či šofér nie je už v posádke
        for (var i = 0; i < posadka.length; i++) {
            var clenNick = utils.safeGet(posadka[i], CONFIG.zamestnancilFields.nick, "");
            if (clenNick === soferNick) {
                result.soferInPosadke = true;
                utils.addDebug(currentEntry, "  ✅ Šofér už je v posádke");
                break;
            }
        }
        
        // Ak šofér nie je v posádke, pridaj ho
        if (!result.soferInPosadke) {
            posadka.push(soferObj);
            utils.safeSet(currentEntry, CONFIG.fields.posadka, posadka);
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
        var posadka = currentEntry.field(CONFIG.fields.posadka) || [];
        var datum = utils.safeGet(currentEntry, CONFIG.fields.datum, new Date());
        var celkovyCas = utils.safeGet(currentEntry, CONFIG.fields.celkovyCas, 0);
        
        if (posadka.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna posádka");
            result.success = true;
            return result;
        }
        
        if (celkovyCas === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Celkový čas je 0");
            result.success = true;
            return result;
        }
        
        utils.addDebug(currentEntry, "  👥 Posádka: " + posadka.length + " členov");
        utils.addDebug(currentEntry, "  ⏱️ Celkový čas: " + celkovyCas + " h");
        
        // Spracuj každého člena posádky
        for (var i = 0; i < posadka.length; i++) {
            var zamestnanec = posadka[i];
            var meno = utils.formatEmployeeName(zamestnanec);
            
            utils.addDebug(currentEntry, "\n  [" + (i+1) + "/" + posadka.length + "] " + meno);
            
            // Získaj detaily zamestnanca s hodinovou sadzbou
            var empDetails = utils.getEmployeeDetails(zamestnanec, datum);
            
            if (!empDetails || !empDetails.hourlyRate || empDetails.hourlyRate <= 0) {
                utils.addError(currentEntry, "Zamestnanec " + meno + " nemá platnú sadzbu", "calculateWageCosts");
                continue;
            }
            
            var hodinovka = empDetails.hourlyRate;
            var mzda = celkovyCas * hodinovka;
            
            // Nastav atribúty na zamestnancovi
            try {
                posadka[i].setAttr(CONFIG.attributes.hodinovka, hodinovka);
                posadka[i].setAttr(CONFIG.attributes.dennaMzda, Math.round(mzda * 100) / 100);
            } catch (attrError) {
                utils.addDebug(currentEntry, "    ⚠️ Nepodarilo sa nastaviť atribúty: " + attrError);
            }
            
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
        utils.safeSet(currentEntry, CONFIG.fields.mzdy, result.celkoveMzdy);
        
        utils.addDebug(currentEntry, "\n  💰 CELKOVÉ MZDY: " + utils.formatMoney(result.celkoveMzdy));
        
        result.success = true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateWageCosts", error);
    }
    
    return result;
}

/**
 * KROK 4: Synchronizácia Cieľa do Stanovišťa vozidla
 */
function synchronizeVehicleLocation() {
    utils.addDebug(currentEntry, "\n🚐 === KROK 4: SYNCHRONIZÁCIA STANOVIŠŤA VOZIDLA ===");
    
    var result = {
        success: false,
        message: ""
    };
    
    try {
        // Získaj vozidlo z aktuálneho záznamu
        var vozidloField = currentEntry.field(CONFIG.fields.vozidlo);
        if (!vozidloField || vozidloField.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne vozidlo - preskakujem synchronizáciu");
            result.success = true;
            return result;
        }
        
        var vozidlo = vozidloField[0];
        var vozidloNazov = utils.safeGet(vozidlo, CONFIG.vozidlaFields.nazov, "N/A");
        utils.addDebug(currentEntry, "  🚗 Vozidlo: " + vozidloNazov);
        
        // Získaj cieľ z aktuálneho záznamu
        var cielField = currentEntry.field(CONFIG.fields.ciel);
        if (!cielField || cielField.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Žiadny cieľ - nemôžem synchronizovať");
            result.message = "Žiadny cieľ";
            result.success = true;
            return result;
        }
        
        var cielMiesto = cielField[0];
        var cielNazov = utils.safeGet(cielMiesto, CONFIG.miestalFields.nazov, "N/A");
        
        // Získaj aktuálne stanovište vozidla
        var aktualneStanoviste = vozidlo.field(CONFIG.vozidlaFields.stanoviste);
        var aktualneStanovisteNazov = "žiadne";
        
        if (aktualneStanoviste && aktualneStanoviste.length > 0) {
            aktualneStanovisteNazov = utils.safeGet(aktualneStanoviste[0], CONFIG.miestalFields.nazov, "N/A");
        }
        
        utils.addDebug(currentEntry, "  📍 Aktuálne stanovište: " + aktualneStanovisteNazov);
        utils.addDebug(currentEntry, "  🏁 Cieľ jazdy: " + cielNazov);
        
        // Skontroluj či je potrebná zmena
        if (aktualneStanoviste && aktualneStanoviste.length > 0) {
            var aktualneId = aktualneStanoviste[0].id;
            var cielId = cielMiesto.id;
            
            if (aktualneId === cielId) {
                utils.addDebug(currentEntry, "  ✅ Stanovište už je nastavené na cieľ");
                result.message = "Už synchronizované";
                result.success = true;
                return result;
            }
        }
        
        // Aktualizuj stanovište vozidla
        try {
            vozidlo.set(CONFIG.vozidlaFields.stanoviste, [cielMiesto]);
            utils.addDebug(currentEntry, "  ✅ Stanovište vozidla aktualizované: " + aktualneStanovisteNazov + " → " + cielNazov);
            
            // Pridaj info do vozidla
            var existingInfo = utils.safeGet(vozidlo, CONFIG.fields.info, "");
            var updateInfo = "\n🔄 STANOVIŠTE AKTUALIZOVANÉ: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
            updateInfo += "• Z: " + aktualneStanovisteNazov + "\n";
            updateInfo += "• Na: " + cielNazov + "\n";
            updateInfo += "• Kniha jázd #" + currentEntry.field("ID") + "\n";
            updateInfo += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
            
            // Obmedz dĺžku info poľa
            var newInfo = existingInfo + updateInfo;
            if (newInfo.length > 5000) {
                newInfo = "... (skrátené) ...\n" + newInfo.substring(newInfo.length - 4900);
            }
            
            vozidlo.set(CONFIG.fields.info, newInfo);
            
            result.message = "Stanovište aktualizované: " + cielNazov;
            result.success = true;
            
        } catch (updateError) {
            utils.addError(currentEntry, "Chyba pri aktualizácii stanovišťa: " + updateError.toString(), "synchronizeVehicleLocation");
            result.message = "Chyba aktualizácie";
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "synchronizeVehicleLocation", error);
        result.message = "Kritická chyba";
    }
    
    return result;
}

/**
 * Vytvorí info záznam s detailmi o jazde
 */
function createInfoRecord(routeResult, wageResult, vehicleResult) {
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
        
        // Vozidlo info
        if (vehicleResult && vehicleResult.success && vehicleResult.message !== "Žiadne vozidlo") {
            info += "\n🚐 VOZIDLO:\n";
            info += "• " + vehicleResult.message + "\n";
        }
        
        info += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        info += "Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "Vygenerované: " + utils.formatDate(moment());
        
        utils.safeSet(currentEntry, CONFIG.fields.info, info);
        utils.addDebug(currentEntry, "✅ Info záznam vytvorený");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
        return false;
    }
}

// ==============================================
// VÝKAZ JÁZD - FUNKCIE
// ==============================================

/**
 * Synchronizuje alebo vytvorí výkaz jázd
 */
function synchronizeRideReport(routeResult, wageResult) {
    var result = {
        success: false,
        rideReport: null,
        action: "none"
    };
    
    try {
        var zakazka = currentEntry.field("Zákazky");
        var datum = utils.safeGet(currentEntry, CONFIG.fields.datum, new Date());
        
        if (!zakazka || zakazka.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna zákazka - preskakujem výkaz");
            result.success = true;
            return result;
        }
        
        var zakazkaObj = zakazka[0];
        var zakazkaName = utils.safeGet(zakazkaObj, "Názov", "N/A");
        
        utils.addDebug(currentEntry, "  🔍 Hľadám výkaz jázd pre zákazku: " + zakazkaName);
        
        // Nájdi existujúci výkaz
        var existingReports = zakazkaObj.linksFrom("Výkaz dopravy", "Zákazka");
        var rideReport = null;
        
        if (existingReports && existingReports.length > 0) {
            rideReport = existingReports[0];
            utils.addDebug(currentEntry, "  ✅ Existujúci výkaz nájdený");
            result.action = "update";
        } else {
            // Vytvor nový výkaz
            rideReport = createNewRideReport(zakazkaObj, datum, zakazkaName);
            if (rideReport) {
                result.action = "create";
            }
        }
        
        if (rideReport) {
            // Aktualizuj link na aktuálny záznam
            linkCurrentRecordToReport(rideReport);
            
            // Aktualizuj atribúty
            updateRideReportAttributes(rideReport, routeResult, wageResult);
            
            // Aktualizuj info pole
            updateRideReportInfo(rideReport);
            
            result.rideReport = rideReport;
            result.success = true;
            
            utils.addDebug(currentEntry, "  ✅ Výkaz jázd " + (result.action === "create" ? "vytvorený" : "aktualizovaný"));
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri synchronizácii výkazu jázd: " + error.toString(), "synchronizeRideReport", error);
    }
    
    return result;
}

/**
 * Vytvorí nový výkaz jázd
 */
function createNewRideReport(zakazkaObj, datum, zakazkaName) {
    try {
        var reportLib = libByName("Výkaz dopravy");
        if (!reportLib) {
            utils.addError(currentEntry, "Knižnica 'Výkaz dopravy' nenájdená", "createNewRideReport");
            return null;
        }
        
        // Vytvor nový výkaz
        var rideReport = reportLib.create({});
        
        // Nastav základné polia
        utils.safeSet(rideReport, "Dátum", datum);
        utils.safeSet(rideReport, "Identifikátor", "VD-" + moment(datum).format("YYYYMMDD"));
        utils.safeSet(rideReport, "Popis", "Výkaz dopravy - " + zakazkaName);
        utils.safeSet(rideReport, "Typ výkazu", "Podľa knihy jázd");
        utils.safeSet(rideReport, "Vydané", "Zákazka");
        utils.safeSet(rideReport, "Zákazka", [zakazkaObj]);
        
        // Info záznam
        var info = "📋 AUTOMATICKY VYTVORENÝ VÝKAZ DOPRAVY\n";
        info += "=====================================\n\n";
        info += "📅 Dátum: " + utils.formatDate(datum) + "\n";
        info += "📦 Zákazka: " + zakazkaName + "\n";
        info += "⏰ Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        info += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "📂 Zdroj: Knižnica Kniha jázd\n\n";
        info += "✅ VÝKAZ VYTVORENÝ ÚSPEŠNE";
        
        utils.safeSet(rideReport, "info", info);
        
        utils.addDebug(currentEntry, "  ✅ Nový výkaz vytvorený");
        
        return rideReport;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createNewRideReport", error);
        return null;
    }
}

/**
 * Prepojí aktuálny záznam s výkazom
 */
function linkCurrentRecordToReport(rideReport) {
    try {
        var dopravaPole = rideReport.field("Doprava");
        if (!dopravaPole) {
            dopravaPole = [];
        }
        
        // Skontroluj či už nie je prepojený
        var isLinked = false;
        for (var i = 0; i < dopravaPole.length; i++) {
            if (dopravaPole[i].id === currentEntry.id) {
                isLinked = true;
                break;
            }
        }
        
        if (!isLinked) {
            dopravaPole.push(currentEntry);
            rideReport.set("Doprava", dopravaPole);
            utils.addDebug(currentEntry, "  🔗 Záznam prepojený s výkazom");
        } else {
            utils.addDebug(currentEntry, "  ✅ Záznam už je prepojený");
        }
        
        // Nastav spätný link
        utils.safeSet(currentEntry, "Výkaz dopravy", [rideReport]);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri prepájaní záznamu: " + error.toString(), "linkCurrentRecordToReport", error);
    }
}

/**
 * Aktualizuje atribúty na výkaze
 */
function updateRideReportAttributes(rideReport, routeResult, wageResult) {
    try {
        var dopravaPole = rideReport.field("Doprava");
        if (!dopravaPole || dopravaPole.length === 0) return;
        
        // Nájdi index aktuálneho záznamu
        var index = -1;
        for (var i = 0; i < dopravaPole.length; i++) {
            if (dopravaPole[i].id === currentEntry.id) {
                index = i;
                break;
            }
        }
        
        if (index === -1) {
            utils.addDebug(currentEntry, "  ⚠️ Záznam nenájdený vo výkaze");
            return;
        }
        
        // Nastav atribúty
        var popisJazdy = utils.safeGet(currentEntry, "Popis jazdy", "");
        var km = routeResult.totalKm;
        var casJazdy = routeResult.celkovyCas;
        var mzdy = wageResult.celkoveMzdy;
        
        // Atribúty pre výkaz dopravy
        dopravaPole[index].setAttr("popis jazdy", popisJazdy);
        dopravaPole[index].setAttr("km", km);
        dopravaPole[index].setAttr("čas jazdy", casJazdy);
        dopravaPole[index].setAttr("mzdové náklady", mzdy);
        
        utils.addDebug(currentEntry, "  ✅ Atribúty aktualizované:");
        utils.addDebug(currentEntry, "    • Popis: " + (popisJazdy || "N/A"));
        utils.addDebug(currentEntry, "    • Km: " + km);
        utils.addDebug(currentEntry, "    • Čas: " + casJazdy + " h");
        utils.addDebug(currentEntry, "    • Mzdy: " + utils.formatMoney(mzdy));
        
        // Prepočítaj celkový súčet výkazu
        recalculateRideReportTotals(rideReport);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii atribútov: " + error.toString(), "updateRideReportAttributes", error);
    }
}

/**
 * Prepočíta súčty vo výkaze
 */
function recalculateRideReportTotals(rideReport) {
    try {
        var dopravaPole = rideReport.field("Doprava");
        if (!dopravaPole) return;
        
        var totalKm = 0;
        var totalHours = 0;
        var totalCosts = 0;
        var recordCount = dopravaPole.length;
        
        // Spočítaj všetky záznamy
        for (var i = 0; i < dopravaPole.length; i++) {
            var km = dopravaPole[i].attr("km") || 0;
            var cas = dopravaPole[i].attr("čas jazdy") || 0;
            var mzdy = dopravaPole[i].attr("mzdové náklady") || 0;
            
            totalKm += km;
            totalHours += cas;
            totalCosts += mzdy;
        }
        
        // Ulož súčty do výkazu
        utils.safeSet(rideReport, "Celkové km", totalKm);
        utils.safeSet(rideReport, "Celkové hodiny", totalHours);
        utils.safeSet(rideReport, "Celkové mzdové náklady", totalCosts);
        utils.safeSet(rideReport, "Počet jázd", recordCount);
        
        utils.addDebug(currentEntry, "  📊 Výkaz prepočítaný:");
        utils.addDebug(currentEntry, "    • Celkové km: " + totalKm);
        utils.addDebug(currentEntry, "    • Celkové hodiny: " + totalHours);
        utils.addDebug(currentEntry, "    • Celkové náklady: " + utils.formatMoney(totalCosts));
        utils.addDebug(currentEntry, "    • Počet jázd: " + recordCount);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri prepočte výkazu: " + error.toString(), "recalculateRideReportTotals", error);
    }
}

/**
 * Aktualizuje info pole výkazu
 */
function updateRideReportInfo(rideReport) {
    try {
        var existingInfo = utils.safeGet(rideReport, "info", "");
        
        // Pridaj informáciu o aktualizácii
        var updateInfo = "\n\n🔄 AKTUALIZOVANÉ: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        updateInfo += "• Kniha jázd #" + currentEntry.field("ID") + " bola aktualizovaná\n";
        updateInfo += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version;
        
        // Obmedz dĺžku info poľa
        var newInfo = existingInfo + updateInfo;
        if (newInfo.length > 5000) {
            newInfo = "... (skrátené) ...\n" + newInfo.substring(newInfo.length - 4900);
        }
        
        rideReport.set("info", newInfo);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii info poľa: " + error.toString(), "updateRideReportInfo", error);
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
        
        // Test HTTP funkcionality
        try {
            var testHttp = http();
            if (testHttp) {
                utils.addDebug(currentEntry, "✅ HTTP funkcia dostupná v Memento");
            }
        } catch (httpError) {
            utils.addDebug(currentEntry, "❌ HTTP funkcia chyba: " + httpError);
        }
        
        // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Výpočet trasy" },
            step2: { success: false, name: "Spracovanie šoféra" },
            step3: { success: false, name: "Výpočet mzdových nákladov" },
            step4: { success: false, name: "Synchronizácia stanovišťa vozidla" },
            step5: { success: false, name: "Vytvorenie info záznamu" },
            step6: { success: false, name: "Synchronizácia výkazu jázd" }
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
        
        // KROK 4: Synchronizácia stanovišťa vozidla
        var vehicleResult = synchronizeVehicleLocation();
        steps.step4.success = vehicleResult.success;
        
        // KROK 5: Vytvorenie info záznamu
        steps.step5.success = createInfoRecord(routeResult, wageResult, vehicleResult);
        
        // KROK 6: Synchronizácia výkazu jázd
        utils.addDebug(currentEntry, "\n📊 === KROK 6: SYNCHRONIZÁCIA VÝKAZU JÁZD ===");
        var vykazResult = synchronizeRideReport(routeResult, wageResult);
        steps.step6.success = vykazResult.success;
        
        // Finálny súhrn
        logFinalSummary(steps);
        
        // Ak všetko prebehlo v poriadku
        if (steps.step1.success) {
            var msg = "✅ Prepočet dokončený\n\n";
            msg += "📏 Vzdialenosť: " + routeResult.totalKm + " km\n";
            msg += "⏱️ Celkový čas: " + routeResult.celkovyCas + " h\n";
            if (wageResult.success && wageResult.celkoveMzdy > 0) {
                msg += "💰 Mzdové náklady: " + utils.formatMoney(wageResult.celkoveMzdy) + "\n";
            }
            if (vehicleResult.success && vehicleResult.message !== "Žiadne vozidlo") {
                msg += "🚐 " + vehicleResult.message;
            }
            message(msg);
        } else {
            message("⚠️ Prepočet dokončený s chybami\n\nPozrite Debug Log pre detaily.");
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

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
    cancel();
}