// ==============================================
// MEMENTO DATABASE - KNIHA JÁZD (ROUTE CALCULATION & PAYROLL)
// Verzia: 10.2.0 | Dátum: Október 2025 | Autor: ASISTANTO
// Knižnica: Kniha jázd | Trigger: Before Save
// ==============================================
// ✅ PRIDANÉ v10.2:
//    - Synchronizácia s knižnicou Denný report (krok 9)
//    - Automatické vytvorenie/aktualizácia záznamu v Denný report
//    - Linkovanie záznamu z Kniha jázd do centrálneho hubu
// ✅ REFAKTOROVANÉ v10.1:
//    - Odstránené hardcoded názvy polí z CONFIG
//    - Všetky polia teraz z centralConfig.fields
//    - Odstránené zamestnancilFields, sadzbyFields
//    - Použitie fields.employee, fields.wages z centr. configu
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet vzdialenosti, času jazdy a miezd posádky
//    - Výpočet trasy pomocou OSRM API s fallback na vzdušnú vzdialenosť
//    - Automatické nastavenie default zdržania na zastávkach
//    - Synchronizácia s knižnicou Denný report pre centralizovaný reporting
//    - Integrácia s MementoUtils ekosystémom (9 krokov spracovanie)
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
    version: "10.2.0",

    // Referencie na centrálny config
    fields: {
        place: centralConfig.fields.place,
        rideLog: centralConfig.fields.rideLog,
        rideReport: centralConfig.fields.rideReport,
        vehicle: centralConfig.fields.vehicle,
        common: centralConfig.fields.common,
        order: centralConfig.fields.order,
        employee: centralConfig.fields.employee,
        wages: centralConfig.fields.wages,
        defaults: centralConfig.fields.defaults
    },

    // Atribúty
    attributes: {
        rideLogCrew: centralConfig.attributes.rideLogCrew,
        rideLogStops: centralConfig.attributes.rideLogStops,
        rideReport: centralConfig.attributes.rideReport
    },

    // Knižnice
    libraries: centralConfig.libraries,

    // Icons
    icons: centralConfig.icons,

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
            var defaultZdrz = defaultsEntries[0].field(CONFIG.fields.defaults.defaultZdrzanie);
            
            if (defaultZdrz !== null && defaultZdrz !== undefined) {
                utils.addDebug("  📋 Našiel default zdržanie: " + defaultZdrz + " ms");
                return utils.convertDurationToHours(defaultZdrz);
            }
        }
        
        utils.addDebug("  📋 Nenašiel default zdržanie, použijem: " + CONFIG.settings.defaultZdrzanie + " ms");
        return CONFIG.settings.defaultZdrzanie;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getDefaultZdrzanie", error);
        return CONFIG.settings.defaultZdrzanie;
    }
}

// ==============================================
// HLAVNÉ FUNKCIE VÝPOČTU
// ==============================================

/**
 * Kontroluje súčet km atribútov zo zastávok a cieľa
 * @param {number} expectedTotal - Očakávaný celkový súčet km
 * @param {Array} zastavky - Pole zastávok
 * @param {Array} ciel - Pole cieľa
 */
function verifyKmAttributesSum(expectedTotal, zastavky, ciel) {
    try {
        var attributesSum = 0;
        var segmentDetails = [];

        // Spočítaj km atribúty zo zastávok
        if (zastavky && zastavky.length > 0) {
            for (var i = 0; i < zastavky.length; i++) {
                try {
                    var stopKm = zastavky[i].attr(CONFIG.attributes.rideLogStops.km) || 0;
                    attributesSum += stopKm;
                    var stopName = utils.safeGet(zastavky[i], CONFIG.fields.place.name, "Zastávka " + (i + 1));
                    segmentDetails.push("Zastávka " + (i + 1) + " (" + stopName + "): " + stopKm + " km");
                } catch (e) {
                    utils.addError(currentEntry, "Chyba pri čítaní km atribútu zastávky " + (i + 1) + ": " + e.toString(), "verifyKmAttributesSum");
                }
            }
        }

        // Spočítaj km atribút z cieľa
        if (ciel && ciel.length > 0) {
            try {
                var cielKm = ciel[0].attr(CONFIG.attributes.rideLogStops.km) || 0;
                attributesSum += cielKm;
                var cielName = utils.safeGet(ciel[0], CONFIG.fields.place.name, "Cieľ");
                segmentDetails.push("Cieľ (" + cielName + "): " + cielKm + " km");
            } catch (e) {
                utils.addError(currentEntry, "Chyba pri čítaní km atribútu cieľa: " + e.toString(), "verifyKmAttributesSum");
            }
        }

        // Zaokrúhli pre porovnanie
        attributesSum = Math.round(attributesSum * 10) / 10;
        var expectedRounded = Math.round(expectedTotal * 10) / 10;

        utils.addDebug(currentEntry, "\n  🔍 === KONTROLA KM ATRIBÚTOV ===");
        for (var j = 0; j < segmentDetails.length; j++) {
            utils.addDebug(currentEntry, "  • " + segmentDetails[j]);
        }
        utils.addDebug(currentEntry, "  📊 Súčet atribútov: " + attributesSum + " km");
        utils.addDebug(currentEntry, "  📊 Celkové km (pole): " + expectedRounded + " km");

        if (Math.abs(attributesSum - expectedRounded) < 0.1) {
            utils.addDebug(currentEntry, "  ✅ Kontrola km atribútov: OK");
        } else {
            var difference = Math.round((attributesSum - expectedRounded) * 10) / 10;
            utils.addError(currentEntry, "Nesúlad km atribútov! Rozdiel: " + difference + " km", "verifyKmAttributesSum");
            utils.addDebug(currentEntry, "  ❌ Kontrola km atribútov: CHYBA (rozdiel: " + difference + " km)");
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri kontrole km atribútov: " + error.toString(), "verifyKmAttributesSum", error);
    }
}

/**
 * Kontroluje súčet delay atribútov zo zastávok
 * @param {number} expectedTotal - Očakávaný celkový súčet delay v hodinách
 * @param {Array} zastavky - Pole zastávok
 */
function verifyDelayAttributesSum(expectedTotal, zastavky) {
    try {
        utils.addDebug(currentEntry, "🔍 Kontrolujem súčet delay atribútov...");

        var calculatedSum = 0;

        // Súčet delay zo zastávok
        if (zastavky && zastavky.length > 0) {
            for (var i = 0; i < zastavky.length; i++) {
                try {
                    var delayAttr = zastavky[i].attr(CONFIG.attributes.rideLogStops.delay) || 0;
                    var delayInHours = utils.convertDurationToHours(delayAttr);
                    calculatedSum += delayInHours;
                    utils.addDebug(currentEntry, "  📍 Zastávka " + (i + 1) + " delay: " + delayInHours + " h (" + delayAttr + " ms)");
                } catch (e) {
                    utils.addError(currentEntry, "Chyba pri čítaní delay atribútu zastávky " + (i + 1) + ": " + e.toString(), "verifyDelayAttributesSum");
                }
            }
        }

        utils.addDebug(currentEntry, "📊 Porovnanie delay:");
        utils.addDebug(currentEntry, "  • Očakávaný celkový: " + expectedTotal + " h");
        utils.addDebug(currentEntry, "  • Súčet atribútov: " + calculatedSum + " h");

        var difference = Math.abs(expectedTotal - calculatedSum);
        if (difference > 0.01) { // tolerancia 0.01 h (36 sekúnd)
            utils.addError(currentEntry, "Nesúlad delay atribútov! Rozdiel: " + difference + " h", "verifyDelayAttributesSum");
            return false;
        } else {
            utils.addDebug(currentEntry, "✅ Delay atribúty sú konzistentné");
            return true;
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri kontrole delay atribútov: " + error.toString(), "verifyDelayAttributesSum", error);
    }
}

/**
 * Kontroluje súčet duration atribútov zo zastávok a cieľa
 * @param {number} expectedTotal - Očakávaný celkový súčet duration v hodinách
 * @param {Array} zastavky - Pole zastávok
 * @param {Array} ciel - Pole cieľa
 */
function verifyDurationAttributesSum(expectedTotal, zastavky, ciel) {
    try {
        utils.addDebug(currentEntry, "🔍 Kontrolujem súčet duration atribútov...");

        var calculatedSum = 0;

        // Súčet duration zo zastávok
        if (zastavky && zastavky.length > 0) {
            for (var i = 0; i < zastavky.length; i++) {
                try {
                    var durationAttr = zastavky[i].attr(CONFIG.attributes.rideLogStops.duration) || 0;
                    var durationInHours = utils.convertDurationToHours(durationAttr);
                    calculatedSum += durationInHours;
                    utils.addDebug(currentEntry, "  📍 Zastávka " + (i + 1) + " duration: " + durationInHours + " h (" + durationAttr + " ms)");
                } catch (e) {
                    utils.addError(currentEntry, "Chyba pri čítaní duration atribútu zastávky " + (i + 1) + ": " + e.toString(), "verifyDurationAttributesSum");
                }
            }
        }

        // Súčet duration z cieľa
        if (ciel && ciel.length > 0) {
            try {
                var cielDurationAttr = ciel[0].attr(CONFIG.attributes.rideLogStops.duration) || 0;
                var cielDurationInHours = utils.convertDurationToHours(cielDurationAttr);
                calculatedSum += cielDurationInHours;
                utils.addDebug(currentEntry, "  🎯 Cieľ duration: " + cielDurationInHours + " h (" + cielDurationAttr + " ms)");
            } catch (e) {
                utils.addError(currentEntry, "Chyba pri čítaní duration atribútu cieľa: " + e.toString(), "verifyDurationAttributesSum");
            }
        }

        utils.addDebug(currentEntry, "📊 Porovnanie duration:");
        utils.addDebug(currentEntry, "  • Očakávaný celkový: " + expectedTotal + " h");
        utils.addDebug(currentEntry, "  • Súčet atribútov: " + calculatedSum + " h");

        var difference = Math.abs(expectedTotal - calculatedSum);
        if (difference > 0.01) { // tolerancia 0.01 h (36 sekúnd)
            utils.addError(currentEntry, "Nesúlad duration atribútov! Rozdiel: " + difference + " h", "verifyDurationAttributesSum");
            return false;
        } else {
            utils.addDebug(currentEntry, "✅ Duration atribúty sú konzistentné");
            return true;
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri kontrole duration atribútov: " + error.toString(), "verifyDurationAttributesSum", error);
    }
}

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
        celkovyCas: 0
    };
    
    try {
        // Získaj polia trasy

        var start = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.start);
        var zastavky = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.stops);
        var ciel = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.destination);
        
        utils.addDebug(currentEntry, "  🎯 Štart: " + (start && start.length > 0 ? "✓" : "✗"));
        utils.addDebug(currentEntry, "  🛑 Zastávky: " + (zastavky ? zastavky.length : 0));
        utils.addDebug(currentEntry, "  🏁 Cieľ: " + (ciel && ciel.length > 0 ? "✓" : "✗"));
        
        if (!start || start.length === 0 || !ciel || ciel.length === 0) {
            utils.addError(currentEntry, "Chýba štart alebo cieľ", "calculateRoute");
            return result;
        }
        
        // Extrahuj GPS súradnice
        var startGPS = utils.extractGPSFromPlace(start[0]);
        var cielGPS = utils.extractGPSFromPlace(ciel[0]);
        
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
                var gps = utils.extractGPSFromPlace(zastavky[j]);
                if (!gps) {
                    utils.addDebug(currentEntry, "  ⚠️ Zastávka " + (j+1) + " nemá GPS");
                    continue;
                }
                
                var segment = utils.calculateSegment(currentPoint, gps, "Úsek " + (j+1));
                
                if (segment.success) {
                    result.totalKm += segment.km;
                    result.casJazdy += segment.duration;
                    
                    // Nastav atribúty zastávky
                    try {
                        zastavky[j].setAttr(CONFIG.attributes.rideLogStops.km, Math.round(segment.km * 10) / 10);
                        // Konvertuj trvanie z hodín na milisekundy pre atribút
                        var durationInMs = utils.convertHoursToDuration(segment.duration);
                        zastavky[j].setAttr(CONFIG.attributes.rideLogStops.duration, durationInMs);
                        utils.addDebug(currentEntry, "    ⏱️ Nastavené trvanie: " + segment.duration + " h (" + durationInMs + " ms)");
                        
                        // Nastav zdržanie ak nie je nastavené
                        var existingZdrzanie = zastavky[j].attr(CONFIG.attributes.rideLogStops.delay);
                        var zdrz = 0;

                        if (!existingZdrzanie || existingZdrzanie === 0) {
                            // Default zdržanie je už v hodinách, ale atribút sa ukladá v milisekundách
                            var defaultInMs = utils.convertHoursToDuration(defaultZdrzanie);
                            zastavky[j].setAttr(CONFIG.attributes.rideLogStops.delay, defaultInMs);
                            zdrz = defaultZdrzanie;
                            utils.addDebug(currentEntry, "    ⏱️ Nastavené default zdržanie: " + defaultZdrzanie + " h (" + defaultInMs + " ms)");
                        } else {
                            zdrz = utils.convertDurationToHours(existingZdrzanie);
                            utils.addDebug(currentEntry, "    ⏱️ Existujúce zdržanie: " + zdrz + " h (" + existingZdrzanie + " ms)");
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
        var lastSegment = utils.calculateSegment(currentPoint, cielGPS, "Úsek do cieľa");
        
        if (lastSegment.success) {
            result.totalKm += lastSegment.km;
            result.casJazdy += lastSegment.duration;
            
            // Nastav atribúty cieľa
            try {
                ciel[0].setAttr(CONFIG.attributes.rideLogStops.km, Math.round(lastSegment.km * 10) / 10);
                // Konvertuj trvanie z hodín na milisekundy pre atribút
                var cielDurationInMs = utils.convertHoursToDuration(lastSegment.duration);
                ciel[0].setAttr(CONFIG.attributes.rideLogStops.duration, cielDurationInMs);
                utils.addDebug(currentEntry, "  🎯 Cieľ - nastavené trvanie: " + lastSegment.duration + " h (" + cielDurationInMs + " ms)");
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
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.km, result.totalKm);
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.rideTime, result.casJazdy);
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.stopTime, result.casNaZastavkach);
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.totalTime, result.celkovyCas);
        
        // Kontrola súčtu atribútov km
        verifyKmAttributesSum(result.totalKm, zastavky, ciel);

        // Kontrola súčtu atribútov delay
        verifyDelayAttributesSum(result.casNaZastavkach, zastavky);

        // Kontrola súčtu atribútov duration
        verifyDurationAttributesSum(result.casJazdy, zastavky, ciel);

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
        var sofer = currentEntry.field(CONFIG.fields.rideLog.driver);
        var posadka = currentEntry.field(CONFIG.fields.rideLog.crew) || [];
        
        if (!sofer || sofer.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadny šofér nebol zadaný");
            result.success = true;
            return result;
        }
        
        var soferObj = sofer[0];
        var soferNick = utils.safeGet(soferObj, CONFIG.fields.employee.nick, "");
        
        utils.addDebug(currentEntry, "  👤 Šofér: " + utils.formatEmployeeName(soferObj));
        
        // Skontroluj či šofér nie je už v posádke
        for (var i = 0; i < posadka.length; i++) {
            var clenNick = utils.safeGet(posadka[i], CONFIG.fields.employee.nick, "");
            if (clenNick === soferNick) {
                result.soferInPosadke = true;
                utils.addDebug(currentEntry, "  ✅ Šofér už je v posádke");
                break;
            }
        }
        
        // Ak šofér nie je v posádke, pridaj ho
        if (!result.soferInPosadke) {
            posadka.push(soferObj);
            utils.safeSet(currentEntry, CONFIG.fields.rideLog.posadka, posadka);
            utils.addDebug(currentEntry, "  ➕ Šofér pridaný do posádky");
        }
        
        result.success = true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processDriver", error);
    }
    
    return result;
}

/**
 * KROK 3: Výpočet nákladov vozidla
 */
function calculateVehicleCosts() {
    utils.addDebug(currentEntry, "\n🚗 === KROK 3: VÝPOČET NÁKLADOV VOZIDLA ===");

    var result = {
        success: false,
        vehicleCosts: 0
    };

    try {
        var vozidloField = currentEntry.field(CONFIG.fields.rideLog.vehicle);
        var km = utils.safeGet(currentEntry, CONFIG.fields.rideLog.km, 0);

        if (!vozidloField || vozidloField.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne vozidlo - preskakujem výpočet nákladov");
            result.success = true;
            return result;
        }

        if (km === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Km = 0 - preskakujem výpočet nákladov");
            result.success = true;
            return result;
        }

        var vozidlo = vozidloField[0];
        var vozidloNazov = utils.safeGet(vozidlo, CONFIG.fields.vehicle.name, "N/A");
        var nakladovaCena = utils.safeGet(vozidlo, CONFIG.fields.vehicle.costRate, 0);

        utils.addDebug(currentEntry, "  🚗 Vozidlo: " + vozidloNazov);
        utils.addDebug(currentEntry, "  📏 Km: " + km);
        utils.addDebug(currentEntry, "  💰 Nákladová cena: " + nakladovaCena + " €/km");

        if (nakladovaCena === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Nákladová cena vozidla je 0");
            result.success = true;
            return result;
        }

        // Výpočet nákladov vozidla
        result.vehicleCosts = km * nakladovaCena;
        result.vehicleCosts = Math.round(result.vehicleCosts * 100) / 100;

        // Ulož náklady vozidla
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.vehicleCosts, result.vehicleCosts);

        utils.addDebug(currentEntry, "  💰 Náklady vozidla: " + utils.formatMoney(result.vehicleCosts));

        result.success = true;

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateVehicleCosts", error);
    }

    return result;
}

/**
 * KROK 4: Výpočet mzdových nákladov
 */
function calculateWageCosts() {
    utils.addDebug(currentEntry, "\n💰 === KROK 4: VÝPOČET MZDOVÝCH NÁKLADOV ===");
    
    var result = {
        success: false,
        celkoveMzdy: 0,
        detaily: []
    };
    
    try {
        var posadka = currentEntry.field(CONFIG.fields.rideLog.crew) || [];
        var datum = utils.safeGet(currentEntry, CONFIG.fields.rideLog.date, new Date());
        var celkovyCas = utils.safeGet(currentEntry, CONFIG.fields.rideLog.totalTime, 0);
        
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
            var hourlyRate = utils.findValidHourlyRate(zamestnanec, datum);
            
            if (!hourlyRate  || hourlyRate <= 0) {
                utils.addError(currentEntry, "Zamestnanec " + meno + " nemá platnú sadzbu", "calculateWageCosts");
                continue;
            }
            
            var hodinovka = hourlyRate;
            var mzda = celkovyCas * hodinovka;
            
            // Nastav atribúty na zamestnancovi
            try {
                posadka[i].setAttr(CONFIG.attributes.rideLogCrew.hourlyRate, hodinovka);
                posadka[i].setAttr(CONFIG.attributes.rideLogCrew.wage, Math.round(mzda * 100) / 100);
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
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.mzdy, result.celkoveMzdy);
        
        utils.addDebug(currentEntry, "\n  💰 CELKOVÉ MZDY: " + utils.formatMoney(result.celkoveMzdy));
        
        result.success = true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateWageCosts", error);
    }
    
    return result;
}

/**
 * KROK 5: Synchronizácia Cieľa do Stanovišťa vozidla
 */
function synchronizeVehicleLocation() {
    utils.addDebug(currentEntry, "\n🚐 === KROK 5: SYNCHRONIZÁCIA STANOVIŠŤA VOZIDLA ===");
    
    var result = {
        success: false,
        message: ""
    };
    
    try {
        // Získaj vozidlo z aktuálneho záznamu
        var vozidloField = currentEntry.field(CONFIG.fields.rideLog.vehicle);
        if (!vozidloField || vozidloField.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne vozidlo - preskakujem synchronizáciu");
            result.success = true;
            return result;
        }
        
        var vozidlo = vozidloField[0];
        var vozidloNazov = utils.safeGet(vozidlo, CONFIG.fields.vehicle.name, "N/A");
        utils.addDebug(currentEntry, "  🚗 Vozidlo: " + vozidloNazov);
        
        // Získaj cieľ z aktuálneho záznamu
        var cielField = currentEntry.field(CONFIG.fields.rideLog.destination);
        if (!cielField || cielField.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Žiadny cieľ - nemôžem synchronizovať");
            result.message = "Žiadny cieľ";
            result.success = true;
            return result;
        }
        
        var cielMiesto = cielField[0];
        var cielNazov = utils.safeGet(cielMiesto, CONFIG.fields.place.name, "N/A");
        
        // Získaj aktuálne stanovište vozidla
        var aktualneStanoviste = vozidlo.field(CONFIG.fields.vehicle.parkingBase);
        var aktualneStanovisteNazov = "žiadne";
        
        if (aktualneStanoviste && aktualneStanoviste.length > 0) {
            aktualneStanovisteNazov = utils.safeGet(aktualneStanoviste[0], CONFIG.fields.place.name, "N/A");
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
            vozidlo.set(CONFIG.fields.vehicle.parkingBase, [cielMiesto]);
            utils.addDebug(currentEntry, "  ✅ Stanovište vozidla aktualizované: " + aktualneStanovisteNazov + " → " + cielNazov);
            
            // Pridaj info do vozidla
            var existingInfo = utils.safeGet(vozidlo, CONFIG.fields.common.info, "");
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
            
            vozidlo.set(CONFIG.fields.common.info, newInfo);
            
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
 * KROK 6: Auto-linkovanie zákaziek zo zastávok
 */
function autoLinkOrdersFromStops() {
    utils.addDebug(currentEntry, "\n🔗 === KROK 6: AUTO-LINKOVANIE ZÁKAZIEK ZO ZASTÁVOK ===");
    
    var result = {
        success: false,
        linkedCount: 0,
        uniqueCustomers: 0,
        processedStops: 0,
        customersWithCounts: {}
    };
    
    try {
        var zastavky = currentEntry.field(CONFIG.fields.rideLog.stops);
        var existingZakazky = currentEntry.field(CONFIG.fields.rideLog.orders) || [];
        var datum = utils.safeGet(currentEntry, CONFIG.fields.rideLog.date, new Date());
        
        if (!zastavky || zastavky.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne zastávky - preskakujem auto-linkovanie");
            result.success = true;
            return result;
        }
        
        utils.addDebug(currentEntry, "  📍 Počet zastávok: " + zastavky.length);
        utils.addDebug(currentEntry, "  📅 Dátum záznamu: " + utils.formatDate(datum));
        
        // Objekt pre ukladanie unikátnych zákaziek
        var unikatneZakazky = {}; // cislo_zakazky → zákazka objekt
        var countZakaziek = {}; // cislo_zakazky → počet výskytov
        
        // Spracuj každú zastávku
        for (var i = 0; i < zastavky.length; i++) {
            var zastavka = zastavky[i];
            if (!zastavka) continue;
            
            var nazovMiesta = utils.safeGet(zastavka, CONFIG.fields.place.name, "Neznáme");
            utils.addDebug(currentEntry, "\n  [" + (i + 1) + "/" + zastavky.length + "] Zastávka: " + nazovMiesta);
            
            // Kontrola checkbox "Zákazka"
            var jeZakazka = false;
            try {
                var checkboxValue = zastavka.field(CONFIG.fields.place.isOrder);
                jeZakazka = (checkboxValue === true);
                utils.addDebug(currentEntry, "    🔍 Checkbox 'Zákazka': " + (jeZakazka ? "✅ TRUE" : "❌ FALSE"));
            } catch (checkboxError) {
                utils.addDebug(currentEntry, "    ⚠️ Chyba pri čítaní checkbox: " + checkboxError);
            }
            
            if (!jeZakazka) {
                utils.addDebug(currentEntry, "    ⏭️ Preskakujem - nie je označená ako zákazka");
                continue;
            }
            
            result.processedStops++;
            
            // Nájdi zákazky pre toto miesto pomocou linksFrom
            try {
                var zakazky = zastavka.linksFrom(CONFIG.libraries.zakazky || "Zákazky", CONFIG.fields.order.name);
                
                if (!zakazky || zakazky.length === 0) {
                    utils.addDebug(currentEntry, "    ❌ Žiadne zákazky nenájdené pre toto miesto");
                    continue;
                }
                
                utils.addDebug(currentEntry, "    🔗 LinksFrom našiel: " + zakazky.length + " zákaziek");

                // Debug: zobraz všetky nájdené zákazky
                for (var j = 0; j < Math.min(zakazky.length, 3); j++) {
                    var testZakazka = zakazky[j];
                    var testInfo = getZakazkaInfo(testZakazka);
                    var testStav = utils.safeGet(testZakazka, CONFIG.fields.order.state, "nezadaný");
                    utils.addDebug(currentEntry, "      [" + (j + 1) + "] " + testInfo.display + " (stav: " + testStav + ")");
                }
                if (zakazky.length > 3) {
                    utils.addDebug(currentEntry, "      ...a ďalších " + (zakazky.length - 3) + " zákaziek");
                }

                // Vyber najlepšiu zákazku
                var vybranaZakazka = najdiNajnovsieZakazku(zakazky, datum);
                
                if (!vybranaZakazka) {
                    utils.addDebug(currentEntry, "    ❌ Nepodarilo sa vybrať platnú zákazku (možno sú všetky ukončené)");
                    continue;
                }
                
                var zakazkaInfo = getZakazkaInfo(vybranaZakazka);
                utils.addDebug(currentEntry, "    ✅ Vybraná zákazka: " + zakazkaInfo.display);
                
                // Použij číslo zákazky ako identifikátor (alebo názov ako fallback)
                var identifikator = zakazkaInfo.cislo ? zakazkaInfo.cislo.toString() : zakazkaInfo.nazov;
                
                // Pridaj do kolekcie
                if (!unikatneZakazky[identifikator]) {
                    unikatneZakazky[identifikator] = vybranaZakazka;
                    countZakaziek[identifikator] = 1;
                    utils.addDebug(currentEntry, "    ➕ Nová zákazka pridaná");
                } else {
                    countZakaziek[identifikator]++;
                    utils.addDebug(currentEntry, "    📊 Zvýšený počet na: " + countZakaziek[identifikator]);
                }
                
                result.linkedCount++;
                
            } catch (linksFromError) {
                utils.addError(currentEntry, "LinksFrom zlyhalo: " + linksFromError.toString(), "autoLinkCustomers");
            }
        }
        
        // Vytvor pole zákaziek
        var zakazkyArray = [];
        for (var id in unikatneZakazky) {
            zakazkyArray.push(unikatneZakazky[id]);
        }
        
        result.uniqueCustomers = zakazkyArray.length;
        result.customersWithCounts = countZakaziek;
        
        // Skombiuj s existujúcimi zákazkami
        var kombinovaneZakazky = kombinujZakazky(existingZakazky, zakazkyArray);
        
        utils.addDebug(currentEntry, "\n  📊 SÚHRN AUTO-LINKOVANIA:");
        utils.addDebug(currentEntry, "  • Spracovaných zastávok so zákazkami: " + result.processedStops);
        utils.addDebug(currentEntry, "  • Celkovo linkovaných: " + result.linkedCount);
        utils.addDebug(currentEntry, "  • Unikátnych zákaziek: " + result.uniqueCustomers);
        utils.addDebug(currentEntry, "  • Existujúce zákazky: " + existingZakazky.length);
        utils.addDebug(currentEntry, "  • Finálny počet zákaziek: " + kombinovaneZakazky.length);
        
        // Nastav zákazky
        if (kombinovaneZakazky.length > 0) {
            utils.safeSet(currentEntry, CONFIG.fields.rideLog.orders, kombinovaneZakazky);
            utils.addDebug(currentEntry, "  ✅ Zákazky úspešne nastavené");
            
            // Nastav atribúty s počtom výskytov
            nastavAtributyPoctu(countZakaziek);
        }
        
        result.success = true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "autoLinkOrdersFromStops", error);
    }
    
    return result;
}

/**
 * Pomocná funkcia - získa info o zákazke
 */
function getZakazkaInfo(zakazkaEntry) {
    if (!zakazkaEntry) return { cislo: null, nazov: "null zákazka", display: "null zákazka" };
    
    var cislo = null;
    var nazov = "Bez názvu";
    
    try {
        cislo = utils.safeGet(zakazkaEntry, CONFIG.fields.order.number);
    } catch (error) {
        // Ignoruj
    }
    
    try {
        var tempNazov = utils.safeGet(zakazkaEntry, CONFIG.fields.order.name);
        if (tempNazov) {
            nazov = tempNazov;
        }
    } catch (error) {
        // Ignoruj
    }
    
    var display = cislo ? "#" + cislo + " " + nazov : nazov;
    
    return {
        cislo: cislo,
        nazov: nazov,
        display: display
    };
}

/**
 * Pomocná funkcia - kontrola či je zákazka platná pre linkovanie
 * @param {Entry} zakazka - Zákazka entry
 * @param {Date} datumZaznamu - Dátum záznamu pre kontrolu platnosti
 * @returns {boolean} True ak je zákazka platná
 */
function jeZakazkaValidna(zakazka, datumZaznamu) {
    if (!zakazka) return false;

    try {
        // KONTROLA 1: Stav zákazky - nesmie byť "Ukončená"
        var stavZakazky = utils.safeGet(zakazka, CONFIG.fields.order.state, "");
        if (stavZakazky === "Ukončená") {
            utils.addDebug(currentEntry, "      ❌ Zákazka je ukončená: " + stavZakazky);
            return false;
        }

        // KONTROLA 2: Dátum ukončenia - ak je vyplnený a prešiel, zákazka nie je platná
        var datumUkoncenia = utils.safeGet(zakazka, CONFIG.fields.order.endDate);
        if (datumUkoncenia && datumZaznamu) {
            if (moment(datumZaznamu).isAfter(moment(datumUkoncenia), 'day')) {
                utils.addDebug(currentEntry, "      ❌ Zákazka ukončená podľa dátumu: " + utils.formatDate(datumUkoncenia, "DD.MM.YYYY"));
                return false;
            }
        }

        // KONTROLA 3: Dátum začatia - zákazka ešte nezačala
        var datumZacatia = utils.safeGet(zakazka, CONFIG.fields.order.startDate);
        if (datumZacatia && datumZaznamu) {
            if (moment(datumZaznamu).isBefore(moment(datumZacatia), 'day')) {
                utils.addDebug(currentEntry, "      ❌ Zákazka ešte nezačala: " + utils.formatDate(datumZacatia, "DD.MM.YYYY"));
                return false;
            }
        }

        // Debug info pre platné zákazky
        var zakazkaInfo = getZakazkaInfo(zakazka);
        utils.addDebug(currentEntry, "      ✅ Zákazka je platná: " + zakazkaInfo.display + " (stav: " + (stavZakazky || "nezadaný") + ")");

        return true;

    } catch (error) {
        utils.addDebug(currentEntry, "      ❌ Chyba pri validácii zákazky: " + error.toString());
        return false;
    }
}

/**
 * Pomocná funkcia - nájde najnovšiu platnú zákazku
 */
function najdiNajnovsieZakazku(zakazky, datumZaznamu) {
    if (!zakazky || zakazky.length === 0) return null;

    // Ak je len jedna zákazka, skontroluj či je platná
    if (zakazky.length === 1) {
        var zakazka = zakazky[0];
        if (jeZakazkaValidna(zakazka, datumZaznamu)) {
            return zakazka;
        } else {
            return null; // Jediná zákazka nie je platná
        }
    }

    // Ak je viac zákaziek, vyber najnovšiu platnú k dátumu
    var najlepsiaZakazka = null;
    var najnovsiDatum = null;

    for (var i = 0; i < zakazky.length; i++) {
        var zakazka = zakazky[i];
        if (!zakazka) continue;

        // Skontroluj validitu zákazky
        if (!jeZakazkaValidna(zakazka, datumZaznamu)) {
            continue;
        }

        try {
            var datumZakazky = utils.safeGet(zakazka, CONFIG.fields.order.startDate);

            // Kontrola platnosti k dátumu
            var jePlatna = false;
            if (!datumZakazky) {
                jePlatna = true; // Zákazky bez dátumu sú vždy platné
            } else if (!datumZaznamu) {
                jePlatna = true; // Ak záznam nemá dátum, akceptuj všetky
            } else {
                jePlatna = (datumZakazky <= datumZaznamu);
            }

            if (jePlatna) {
                if (!najlepsiaZakazka ||
                    (datumZakazky && (!najnovsiDatum || datumZakazky >= najnovsiDatum))) {
                    najlepsiaZakazka = zakazka;
                    najnovsiDatum = datumZakazky;
                }
            }
        } catch (error) {
            // Ignoruj chybné zákazky
        }
    }

    return najlepsiaZakazka; // Ak žiadna zákazka nie je platná, vráti null
}

/**
 * Pomocná funkcia - kombinuje existujúce a nové zákazky
 */
function kombinujZakazky(existujuce, nove) {
    var kombinovane = [];
    var idSet = {};
    
    // Pridaj existujúce
    for (var i = 0; i < existujuce.length; i++) {
        var zakazka = existujuce[i];
        if (!zakazka) continue;
        
        var info = getZakazkaInfo(zakazka);
        var id = info.cislo ? info.cislo.toString() : info.nazov;
        
        if (!idSet[id]) {
            kombinovane.push(zakazka);
            idSet[id] = true;
        }
    }
    
    // Pridaj nové
    for (var j = 0; j < nove.length; j++) {
        var zakazka = nove[j];
        if (!zakazka) continue;
        
        var info = getZakazkaInfo(zakazka);
        var id = info.cislo ? info.cislo.toString() : info.nazov;
        
        if (!idSet[id]) {
            kombinovane.push(zakazka);
            idSet[id] = true;
        }
    }
    
    return kombinovane;
}

/**
 * Pomocná funkcia - nastaví atribúty počtu pre zákazky
 */
function nastavAtributyPoctu(countZakaziek) {
    try {
        utils.addDebug(currentEntry, "\n  🔢 NASTAVOVANIE ATRIBÚTOV POČTU:");
        
        // Znovu načítaj Link to Entry pole
        var linknuteZakazky = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.orders);
        if (!linknuteZakazky) return;
        
        for (var i = 0; i < linknuteZakazky.length; i++) {
            var zakazkaObj = linknuteZakazky[i];
            var info = getZakazkaInfo(zakazkaObj);
            var identifikator = info.cislo ? info.cislo.toString() : info.nazov;
            var pocet = countZakaziek[identifikator] || 0;
            
            if (pocet > 0) {
                try {
                    // Nastav atribút počet
                    linknuteZakazky[i].setAttr("počet", pocet);
                    utils.addDebug(currentEntry, "    ✅ " + info.display + " → počet = " + pocet);
                } catch (attrError) {
                    utils.addDebug(currentEntry, "    ❌ Chyba pri nastavovaní atribútu: " + attrError);
                }
            }
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri nastavovaní atribútov: " + error.toString(), "nastavAtributyPoctu");
    }
}
/**
 * Vytvorí info záznam s detailmi o jazde
 */
function createInfoRecord(routeResult, wageResult, vehicleResult, vehicleCostResult, orderLinkResult) {
    try {
        var date = currentEntry.field(CONFIG.fields.rideLog.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
        var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();

        var infoMessage = "# 🚗 KNIHA JÁZD - AUTOMATICKÝ PREPOČET\n\n";

        infoMessage += "## 📅 Základné údaje\n";
        infoMessage += "- **Dátum:** " + dateFormatted + " (" + dayName + ")\n";

        if (routeResult && routeResult.success) {
            infoMessage += "- **Vzdialenosť:** " + routeResult.totalKm + " km\n";
            infoMessage += "- **Čas jazdy:** " + routeResult.casJazdy + " h\n";
            infoMessage += "- **Čas na zastávkach:** " + routeResult.casNaZastavkach + " h\n";
            infoMessage += "- **Celkový čas:** " + routeResult.celkovyCas + " h\n\n";
        } else {
            infoMessage += "- **Trasa:** Neprepočítaná\n\n";
        }

        // Vozidlo informácie
        if (vehicleResult && vehicleResult.success && vehicleResult.message !== "Žiadne vozidlo") {
            infoMessage += "## 🚐 VOZIDLO\n";
            infoMessage += "- " + vehicleResult.message + "\n\n";
        }

        // Zákazky informácie
        if (orderLinkResult && orderLinkResult.success && orderLinkResult.uniqueCustomers > 0) {
            var zakazkyForm = orderLinkResult.uniqueCustomers === 1 ? "zákazka" :
                             orderLinkResult.uniqueCustomers < 5 ? "zákazky" : "zákaziek";
            infoMessage += "## 🏢 ZÁKAZKY (" + orderLinkResult.uniqueCustomers + " " + zakazkyForm + ")\n\n";

            var zakazky = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.orders) || [];
            for (var k = 0; k < Math.min(zakazky.length, 5); k++) {
                var zakazka = zakazky[k];
                var zakazkaInfo = getZakazkaInfo(zakazka);
                var identifikator = zakazkaInfo.cislo ? zakazkaInfo.cislo.toString() : zakazkaInfo.nazov;
                var pocet = orderLinkResult.customersWithCounts[identifikator] || 1;

                infoMessage += "### 🏢 " + zakazkaInfo.display + "\n";
                infoMessage += "- **Počet zastávok:** " + pocet + "x\n";

                // Získaj atribút počtu ak existuje
                try {
                    var attrPocet = zakazky[k].getAttr("počet");
                    if (attrPocet && attrPocet !== pocet) {
                        infoMessage += "- **Atribút počet:** " + attrPocet + "\n";
                    }
                } catch (attrError) {
                    // Ignoruj chybu atribútu
                }
                infoMessage += "\n";
            }

            if (zakazky.length > 5) {
                infoMessage += "_...a ďalších " + (zakazky.length - 5) + " zákaziek_\n\n";
            }

            var totalStops = (utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.stops) || []).length;
            infoMessage += "**📊 Súhrn:** " + orderLinkResult.processedStops + " zastávok so zákazkami z " + totalStops + " celkovo\n";

            // Upozornenie ak niektoré zastávky označené ako zákazky neboli nalinkované
            var customerStopsCount = 0;
            var stops = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.stops) || [];
            for (var s = 0; s < stops.length; s++) {
                try {
                    var isCustomerStop = stops[s].field(CONFIG.fields.place.isOrder);
                    if (isCustomerStop === true) customerStopsCount++;
                } catch (e) {}
            }

            if (customerStopsCount > orderLinkResult.processedStops) {
                var rejectedCount = customerStopsCount - orderLinkResult.processedStops;
                infoMessage += "⚠️ **Pozor:** " + rejectedCount + " zastávok označených ako zákazky nebolo nalinkovaných (možno sú ukončené)\n";
            }
            infoMessage += "\n";
        }

        // Posádka a mzdy
        if (wageResult && wageResult.success && wageResult.detaily && wageResult.detaily.length > 0) {
            infoMessage += "## 👥 POSÁDKA (" + wageResult.detaily.length + " " +
                          utils.getPersonCountForm(wageResult.detaily.length) + ")\n\n";

            for (var i = 0; i < wageResult.detaily.length; i++) {
                var detail = wageResult.detaily[i];
                infoMessage += "### 👤 " + detail.meno + "\n";
                infoMessage += "- **Hodinovka:** " + detail.hodinovka + " €/h\n";
                infoMessage += "- **Mzdové náklady:** " + utils.formatMoney(detail.mzda) + "\n\n";
            }

            infoMessage += "**💰 Celkové mzdové náklady:** " + utils.formatMoney(wageResult.celkoveMzdy) + "\n\n";
        }

        // Náklady vozidla
        if (vehicleCostResult && vehicleCostResult.success && vehicleCostResult.vehicleCosts > 0) {
            infoMessage += "## 🚗 NÁKLADY VOZIDLA\n";
            infoMessage += "- **Celkové náklady:** " + utils.formatMoney(vehicleCostResult.vehicleCosts) + "\n\n";
        }

        // Celkové náklady
        var totalCosts = 0;
        if (wageResult && wageResult.success && wageResult.celkoveMzdy) {
            totalCosts += wageResult.celkoveMzdy;
        }
        if (vehicleCostResult && vehicleCostResult.success && vehicleCostResult.vehicleCosts) {
            totalCosts += vehicleCostResult.vehicleCosts;
        }

        if (totalCosts > 0) {
            infoMessage += "## 💰 CELKOVÉ NÁKLADY\n";
            infoMessage += "- **Spolu:** " + utils.formatMoney(totalCosts) + "\n\n";
        }

        infoMessage += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
        infoMessage += "- **Script:** " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "- **Vygenerované:** " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n";

        utils.safeSet(currentEntry, CONFIG.fields.common.info, infoMessage);
        utils.addDebug(currentEntry, "✅ Info záznam vytvorený s Markdown formátovaním");

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
 * Synchronizuje alebo vytvorí výkazy jázd pre všetky zákazky
 */
function synchronizeRideReport(routeResult, wageResult, vehicleCostResult) {
    var result = {
        success: false,
        rideReports: [],
        processedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        actions: []
    };
    
    try {
        var zakazky = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.orders) || [];
        utils.addDebug(currentEntry, "\n📝 === KROK 8: SYNCHRONIZÁCIA VÝKAZOV JÁZD ===");
        var datum = utils.safeGet(currentEntry, CONFIG.fields.rideLog.date, new Date());
        
        if (!zakazky || zakazky.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna zákazka - preskakujem výkaz");
            result.success = true;
            return result;
        }
        
        utils.addDebug(currentEntry, "  📦 Počet zákaziek: " + zakazky.length);
        
        // Spracuj každú zákazku
        for (var i = 0; i < zakazky.length; i++) {
            var zakazkaObj = zakazky[i];
            var zakazkaName = utils.safeGet(zakazkaObj, "Názov", "N/A");
            
            utils.addDebug(currentEntry, "\n  [" + (i + 1) + "/" + zakazky.length + "] Spracovávam zákazku: " + zakazkaName);
            
            // Nájdi existujúci výkaz
            var existingReports = zakazkaObj.linksFrom("Výkaz dopravy", "Zákazka");
            var rideReport = null;
            var action = "none";
            
            if (existingReports && existingReports.length > 0) {
                rideReport = existingReports[0];
                utils.addDebug(currentEntry, "    ✅ Existujúci výkaz nájdený");
                action = "update";
                result.updatedCount++;
            } else {
                // Vytvor nový výkaz
                rideReport = createNewRideReport(zakazkaObj, datum, zakazkaName);
                if (rideReport) {
                    action = "create";
                    result.createdCount++;
                    utils.addDebug(currentEntry, "    ✨ Nový výkaz vytvorený");
                }
            }
            
            if (rideReport) {
                var zakaziekCount = zakazky.length;

                // Aktualizuj link na aktuálny záznam
                linkCurrentRecordToReport(rideReport);
                
                // Aktualizuj atribúty s pomernými hodnotami
                updateRideReportAttributesProportional(rideReport, routeResult, wageResult, vehicleCostResult, zakaziekCount);
                
                // Aktualizuj info pole
                updateRideReportInfo(rideReport);
                
                result.rideReports.push(rideReport);
                result.actions.push({
                    zakazka: zakazkaName,
                    action: action
                });
                result.processedCount++;
                
                utils.addDebug(currentEntry, "    ✅ Výkaz " + (action === "create" ? "vytvorený" : "aktualizovaný"));
            }
        }
        
        result.success = result.processedCount > 0;
        
        // Záverečné zhrnutie
        utils.addDebug(currentEntry, "\n  📊 SÚHRN VÝKAZOV:");
        utils.addDebug(currentEntry, "  • Spracovaných: " + result.processedCount + "/" + zakazky.length);
        utils.addDebug(currentEntry, "  • Vytvorených: " + result.createdCount);
        utils.addDebug(currentEntry, "  • Aktualizovaných: " + result.updatedCount);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri synchronizácii výkazov jázd: " + error.toString(), "synchronizeRideReport", error);
    }
    
    return result;
}

/**
 * Aktualizuje atribúty na výkaze s pomerným rozdelením
 */
function updateRideReportAttributesProportional(rideReport, routeResult, wageResult, vehicleCostResult, zakaziekCount) {
    try {
        var dopravaPole = rideReport.field(CONFIG.fields.rideReport.ride);
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
            utils.addDebug(currentEntry, "    ⚠️ Záznam nenájdený vo výkaze");
            return;
        }
        
        // Vypočítaj pomerné hodnoty
        var popisJazdy = utils.safeGet(currentEntry, CONFIG.fields.rideLog.rideDescription, "");
        var km = Math.round((routeResult.totalKm / zakaziekCount) * 10) / 10;
        var casJazdy = Math.round((routeResult.celkovyCas / zakaziekCount) * 100) / 100;
        var mzdy = Math.round((wageResult.celkoveMzdy / zakaziekCount) * 100) / 100;
        var nakladyVozidla = vehicleCostResult && vehicleCostResult.vehicleCosts ?
            Math.round((vehicleCostResult.vehicleCosts / zakaziekCount) * 100) / 100 : 0;
        
        // Ak je viac zákaziek, pridaj info do popisu
        if (zakaziekCount > 1) {
            popisJazdy += " [1/" + zakaziekCount + "]";
        }
        
        // Atribúty pre výkaz dopravy
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.description, popisJazdy);
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.km, km);
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.rideTime, casJazdy);
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.wageCosts, mzdy);
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.vehicleCosts, nakladyVozidla);
        //dopravaPole[index].setAttr("počet zákaziek", zakaziekCount);
        
        utils.addDebug(currentEntry, "    ✅ Atribúty aktualizované (pomerné):");
        utils.addDebug(currentEntry, "      • Popis: " + popisJazdy);
        utils.addDebug(currentEntry, "      • Km: " + km + " (z " + routeResult.totalKm + ")");
        utils.addDebug(currentEntry, "      • Čas: " + casJazdy + " h (z " + routeResult.celkovyCas + ")");
        utils.addDebug(currentEntry, "      • Mzdy: " + utils.formatMoney(mzdy) + " (z " + utils.formatMoney(wageResult.celkoveMzdy) + ")");
        if (nakladyVozidla > 0) {
            utils.addDebug(currentEntry, "      • Náklady vozidla: " + utils.formatMoney(nakladyVozidla) + " (z " + utils.formatMoney(vehicleCostResult.vehicleCosts) + ")");
        }
        
        // Prepočítaj celkový súčet výkazu
        recalculateRideReportTotals(rideReport);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii atribútov: " + error.toString(), "updateRideReportAttributesProportional", error);
    }
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
        utils.safeSet(rideReport, CONFIG.fields.rideReport.date, datum);
        utils.safeSet(rideReport, CONFIG.fields.rideReport.number, "VD-" + moment(datum).format("YYYYMMDD"));
        utils.safeSet(rideReport, CONFIG.fields.rideReport.description, "Výkaz dopravy - " + zakazkaName);
        utils.safeSet(rideReport, CONFIG.fields.rideReport.reportType, "% zo zákazky");
        utils.safeSet(rideReport, CONFIG.fields.rideReport.order, [zakazkaObj]);
        
        // Info záznam s Markdown formátovaním
        var timestamp = utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss");
        var reportNumber = "VD-" + moment(datum).format("YYYYMMDD");

        var info = "# 📊 VÝKAZ DOPRAVY - AUTOMATICKY GENEROVANÝ\n\n";

        info += "## 📋 ZÁKLADNÉ ÚDAJE\n";
        info += "- **Číslo výkazu:** " + reportNumber + "\n";
        info += "- **Dátum:** " + utils.formatDate(datum, "DD.MM.YYYY") + "\n";
        info += "- **Popis:** Výkaz dopravy - " + zakazkaName + "\n";
        info += "- **Zákazka:** " + zakazkaName + "\n";
        info += "- **Počet jázd:** 0 (bude aktualizované)\n\n";

        info += "## 📈 SÚHRN NÁKLADOV\n";
        info += "- **Celkové km:** 0 km (bude aktualizované)\n";
        info += "- **Celkové hodiny:** 0 h (bude aktualizované)\n";
        info += "- **Mzdové náklady:** 0 € (bude aktualizované)\n";
        info += "- **Náklady vozidla:** 0 € (bude aktualizované)\n\n";

        info += "## 🔄 AKTUALIZÁCIE\n";
        info += "- **" + timestamp + ":** Výkaz vytvorený (" + CONFIG.scriptName + " v" + CONFIG.version + ")\n\n";

        info += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
        info += "- **Generované:** " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "- **Zdroj:** Knižnica Kniha jázd\n";
        info += "- **Vytvorené:** " + timestamp + "\n";

        utils.safeSet(rideReport, CONFIG.fields.common.info, info);
        
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
        var dopravaPole = rideReport.field(CONFIG.fields.rideReport.ride) || [];
                    
        // Skontroluj či už nie je prepojený
        var isLinked = false;
        for (var i = 0; i < dopravaPole.length; i++) {
            utils.addDebug(currentEntry, "    🔍 Kontrola prepojenia s ID: " + dopravaPole[i].id);
            if (dopravaPole[i].id === currentEntry.id) {
                isLinked = true;
                break;
            }
        }
        
        if (!isLinked) {
            dopravaPole.push(currentEntry);
            rideReport.set(CONFIG.fields.rideLog.ride, dopravaPole);
            utils.addDebug(currentEntry, "  🔗 Záznam prepojený s výkazom");
        } else {
            utils.addDebug(currentEntry, "  ✅ Záznam už je prepojený");
        }
        
        // Nastav spätný link
        //utils.safeSet(currentEntry, "Výkaz dopravy", [rideReport]);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri prepájaní záznamu: " + error.toString(), "linkCurrentRecordToReport", error);
    }
}

/**
 * Aktualizuje atribúty na výkaze
 */
function updateRideReportAttributes(rideReport, routeResult, wageResult) {
    try {
        var dopravaPole = rideReport.field(CONFIG.fields.rideReport.ride);
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
        var popisJazdy = utils.safeGet(currentEntry, CONFIG.fields.rideLog.rideDescription, "");
        var km = routeResult.totalKm;
        var casJazdy = routeResult.celkovyCas;
        var mzdy = wageResult.celkoveMzdy;
        
        // Atribúty pre výkaz dopravy
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.description, popisJazdy);
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.km, km);
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.rideTime, casJazdy);
        dopravaPole[index].setAttr(CONFIG.attributes.rideReport.wageCosts, mzdy);
        
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
        var dopravaPole = rideReport.field(CONFIG.fields.rideReport.ride);
        if (!dopravaPole) return;
        
        var totalKm = 0;
        var totalHours = 0;
        var totalWageCosts = 0;
        var totalVehicleCosts = 0;
        var recordCount = dopravaPole.length;

        // Spočítaj všetky záznamy
        for (var i = 0; i < dopravaPole.length; i++) {
            var km = dopravaPole[i].attr(CONFIG.attributes.rideReport.km) || 0;
            var cas = dopravaPole[i].attr(CONFIG.attributes.rideReport.rideTime) || 0;
            var mzdy = dopravaPole[i].attr(CONFIG.attributes.rideReport.wageCosts) || 0;
            var nakladyVozidla = dopravaPole[i].attr(CONFIG.attributes.rideReport.vehicleCosts) || 0;

            totalKm += km;
            totalHours += cas;
            totalWageCosts += mzdy;
            totalVehicleCosts += nakladyVozidla;
        }
        
        // Ulož súčty do výkazu
        utils.safeSet(rideReport, CONFIG.fields.rideReport.kmTotal, totalKm);
        utils.safeSet(rideReport, CONFIG.fields.rideReport.hoursTotal, totalHours);
        utils.safeSet(rideReport, CONFIG.fields.rideReport.wageCostsTotal || "Celkové mzdové náklady", totalWageCosts);
        utils.safeSet(rideReport, CONFIG.fields.rideReport.vehicleCostsTotal || "Celkové náklady vozidla", totalVehicleCosts);
        utils.safeSet(rideReport, CONFIG.fields.rideReport.rideCount, recordCount);

        utils.addDebug(currentEntry, "  📊 Výkaz prepočítaný:");
        utils.addDebug(currentEntry, "    • Celkové km: " + totalKm);
        utils.addDebug(currentEntry, "    • Celkové hodiny: " + totalHours);
        utils.addDebug(currentEntry, "    • Celkové mzdové náklady: " + utils.formatMoney(totalWageCosts));
        utils.addDebug(currentEntry, "    • Celkové náklady vozidla: " + utils.formatMoney(totalVehicleCosts));
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
        var existingInfo = utils.safeGet(rideReport, CONFIG.fields.common.info, "");

        // Ak už má Markdown format, pridaj len aktualizáciu
        if (existingInfo.indexOf("## 🔄 AKTUALIZÁCIE") !== -1) {
            // Nájdi sekciu aktualizácií a pridaj novú položku
            var timestamp = utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss");
            var entryId = currentEntry.field("ID") || "N/A";
            var newUpdate = "- **" + timestamp + ":** Kniha jázd #" + entryId + " aktualizovaná (" + CONFIG.scriptName + " v" + CONFIG.version + ")\n";

            // Pridaj na koniec existujúcich aktualizácií
            var insertPos = existingInfo.lastIndexOf("\n## 🔧 TECHNICKÉ INFORMÁCIE");
            if (insertPos === -1) {
                existingInfo += "\n" + newUpdate;
            } else {
                existingInfo = existingInfo.substring(0, insertPos) + newUpdate + existingInfo.substring(insertPos);
            }
        } else {
            // Vytvor kompletný Markdown info záznam
            var timestamp = utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss");
            var entryId = currentEntry.field("ID") || "N/A";
            var reportDate = utils.safeGet(rideReport, CONFIG.fields.rideReport.date);
            var reportNumber = utils.safeGet(rideReport, CONFIG.fields.rideReport.number, "N/A");
            var reportDescription = utils.safeGet(rideReport, CONFIG.fields.rideReport.description, "N/A");

            // Získaj aktuálne súčty
            var totalKm = utils.safeGet(rideReport, CONFIG.fields.rideReport.kmTotal, 0);
            var totalHours = utils.safeGet(rideReport, CONFIG.fields.rideReport.hoursTotal, 0);
            var totalWageCosts = utils.safeGet(rideReport, CONFIG.fields.rideReport.wageCostsTotal || "Celkové mzdové náklady", 0);
            var totalVehicleCosts = utils.safeGet(rideReport, CONFIG.fields.rideReport.vehicleCostsTotal || "Celkové náklady vozidla", 0);
            var rideCount = utils.safeGet(rideReport, CONFIG.fields.rideReport.rideCount, 0);

            var newInfo = "# 📊 VÝKAZ DOPRAVY - AUTOMATICKY GENEROVANÝ\n\n";

            newInfo += "## 📋 ZÁKLADNÉ ÚDAJE\n";
            newInfo += "- **Číslo výkazu:** " + reportNumber + "\n";
            newInfo += "- **Dátum:** " + utils.formatDate(reportDate, "DD.MM.YYYY") + "\n";
            newInfo += "- **Popis:** " + reportDescription + "\n";
            newInfo += "- **Počet jázd:** " + rideCount + "\n\n";

            if (totalKm > 0 || totalHours > 0 || totalWageCosts > 0) {
                newInfo += "## 📈 SÚHRN NÁKLADOV\n";
                if (totalKm > 0) newInfo += "- **Celkové km:** " + totalKm + " km\n";
                if (totalHours > 0) newInfo += "- **Celkové hodiny:** " + totalHours + " h\n";
                if (totalWageCosts > 0) newInfo += "- **Mzdové náklady:** " + utils.formatMoney(totalWageCosts) + "\n";
                if (totalVehicleCosts > 0) newInfo += "- **Náklady vozidla:** " + utils.formatMoney(totalVehicleCosts) + "\n";
                newInfo += "\n";
            }

            newInfo += "## 🔄 AKTUALIZÁCIE\n";
            newInfo += "- **" + timestamp + ":** Kniha jázd #" + entryId + " aktualizovaná (" + CONFIG.scriptName + " v" + CONFIG.version + ")\n\n";

            newInfo += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
            newInfo += "- **Generované:** " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
            newInfo += "- **Posledná aktualizácia:** " + timestamp + "\n";

            existingInfo = newInfo;
        }

        // Obmedz dĺžku info poľa
        if (existingInfo.length > 8000) {
            var header = existingInfo.substring(0, existingInfo.indexOf("## 🔄 AKTUALIZÁCIE"));
            var updates = existingInfo.substring(existingInfo.indexOf("## 🔄 AKTUALIZÁCIE"));
            var tech = existingInfo.substring(existingInfo.indexOf("## 🔧 TECHNICKÉ INFORMÁCIE"));

            // Skráť aktualizácie ak sú príliš dlhé
            if (updates.length > 3000) {
                var lines = updates.split('\n');
                updates = lines.slice(0, 1).join('\n') + '\n- **...(staršie aktualizácie skrátené)...**\n' +
                         lines.slice(-5).join('\n') + '\n';
            }

            existingInfo = header + updates + tech;
        }

        utils.safeSet(rideReport, CONFIG.fields.common.info, existingInfo);

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii info poľa: " + error.toString(), "updateRideReportInfo", error);
    }
}
// ==============================================
// FINÁLNY SÚHRN
// ==============================================

function logFinalSummary(steps, routeResult, wageResult, vehicleCostResult, vehicleResult, vykazResult, dailyReportResult, orderLinkResult) {
    try {
        utils.addDebug(currentEntry, "\n📊 === FINÁLNY SÚHRN ===");

        var allSuccess = true;
        for (var step in steps) {
            var status = steps[step].success ? "✅" : "❌";
            utils.addDebug(currentEntry, status + " " + steps[step].name);
            if (!steps[step].success) {
                allSuccess = false;
            }
        }

        if (allSuccess) {
            utils.addDebug(currentEntry, "\n✅ Všetky kroky dokončené úspešne!");

            // Zobraz súhrn používateľovi
            var msg = "✅ PREPOČET DOKONČENÝ\n\n";
            if (routeResult && routeResult.totalKm) {
                msg += "━━━━━━━━━━━━━━━━━━━━━\n";
                msg += "📏 Vzdialenosť: " + routeResult.totalKm + " km\n";
                msg += "⏱️ Celkový čas: " + routeResult.celkovyCas + " h\n";
            }

            if (wageResult && wageResult.success && wageResult.celkoveMzdy > 0) {
                msg += "💰 Mzdové náklady: " + utils.formatMoney(wageResult.celkoveMzdy) + "\n";
            }

            if (vehicleCostResult && vehicleCostResult.success && vehicleCostResult.vehicleCosts > 0) {
                msg += "🚗 Náklady vozidla: " + utils.formatMoney(vehicleCostResult.vehicleCosts) + "\n";
            }

            if (vehicleResult && vehicleResult.success && vehicleResult.message !== "Žiadne vozidlo") {
                msg += "🚐 " + vehicleResult.message + "\n";
            }

            if (vykazResult && vykazResult.success && vykazResult.processedCount > 0) {
                msg += "📊 Výkazy: " + vykazResult.processedCount + " (" +
                    vykazResult.createdCount + " nových, " +
                    vykazResult.updatedCount + " aktualizovaných)\n";
            }

            if (orderLinkResult && orderLinkResult.success && orderLinkResult.uniqueCustomers > 0) {
                msg += "🔗 Zákazky: " + orderLinkResult.uniqueCustomers + " nalinkovaných\n";
            }

            if (dailyReportResult && dailyReportResult.success) {
                var dailyAction = dailyReportResult.created ? "vytvorený" : "aktualizovaný";
                msg += "📅 Denný report: " + dailyAction + "\n";
            }

            msg += "━━━━━━━━━━━━━━━━━━━━━\n";
            msg += "ℹ️ Detaily v poli 'info'";

            message(msg);
        } else {
            utils.addDebug(currentEntry, "\n⚠️ === NIEKTORÉ KROKY ZLYHALI ===");
            message("⚠️ Prepočet dokončený s chybami\n\nPozrite Debug Log pre detaily.");
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
            step3: { success: false, name: "Výpočet nákladov vozidla" },
            step4: { success: false, name: "Výpočet mzdových nákladov" },
            step5: { success: false, name: "Synchronizácia stanovišťa vozidla" },
            step6: { success: false, name: "Linkovanie zákaziek" },
            step7: { success: false, name: "Vytvorenie info záznamu" },
            step8: { success: false, name: "Synchronizácia výkazu jázd" },
            step9: { success: false, name: "Synchronizácia denného reportu" }
        };
        
        // KROK 1: Výpočet trasy
        var routeResult = calculateRoute();
        steps.step1.success = routeResult.success;
        
        // KROK 2: Spracovanie šoféra
        var driverResult = processDriver();
        steps.step2.success = driverResult.success;
        
        // KROK 3: Výpočet nákladov vozidla
        var vehicleCostResult = calculateVehicleCosts();
        steps.step3.success = vehicleCostResult.success;

        // KROK 4: Výpočet mzdových nákladov
        var wageResult = calculateWageCosts();
        steps.step4.success = wageResult.success;

        // KROK 5: Synchronizácia stanovišťa vozidla
        var vehicleResult = synchronizeVehicleLocation();
        steps.step5.success = vehicleResult.success;
        
        // KROK 6: Linkovanie zákaziek
        var orderLinkResult = autoLinkOrdersFromStops();
        steps.step6.success = orderLinkResult.success;

        // KROK 7: Vytvorenie info záznamu
        steps.step7.success = createInfoRecord(routeResult, wageResult, vehicleResult, vehicleCostResult, orderLinkResult);
        
        // KROK 8: Synchronizácia výkazu jázd
        utils.addDebug(currentEntry, "\n📊 === KROK 8: SYNCHRONIZÁCIA VÝKAZU JÁZD ===");
        var vykazResult = synchronizeRideReport(routeResult, wageResult, vehicleCostResult);
        steps.step8.success = vykazResult.success;

        // KROK 9: Synchronizácia denného reportu
        utils.addDebug(currentEntry, "\n📅 === KROK 9: SYNCHRONIZÁCIA DENNÉHO REPORTU ===");
        var dailyReportResult = utils.createOrUpdateDailyReport(currentEntry, 'rideLog', {
            debugEntry: currentEntry,
            createBackLink: false
        });

        if (dailyReportResult && dailyReportResult.success) {
            var action = dailyReportResult.created ? "vytvorený" : "aktualizovaný";
            utils.addDebug(currentEntry, "✅ Denný report " + action + " úspešne");
            steps.step9.success = true;
        } else {
            var errorMsg = dailyReportResult ? dailyReportResult.error : "Neznáma chyba";
            utils.addError(currentEntry, "Chyba pri synchronizácii denného reportu: " + errorMsg);
            steps.step9.success = false;
        }

        // Finálny súhrn
        logFinalSummary(steps, routeResult, wageResult, vehicleCostResult, vehicleResult, vykazResult, dailyReportResult, orderLinkResult);
        
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