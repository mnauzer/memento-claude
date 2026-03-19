// ==============================================
// MEMENTO DATABASE - KNIHA JÁZD (ROUTE CALCULATION & PAYROLL)
// Verzia: 10.12.0 | Dátum: Október 2025 | Autor: ASISTANTO
// Knižnica: Kniha jázd | Trigger: Before Save
// ==============================================
// ✅ ZLEPŠENÉ v10.12.0:
//    - Zjednotený info záznam do Vozidla - jeden blok pre jeden záznam Knihy jázd
//    - Nová funkcia writeVehicleInfoRecord() zapíše všetky zmeny naraz
//    - Formát: 🔄 AKTUALIZÁCIA VOZIDLA + stanovište + tachometer + dátum + ID
//    - Odstránené samostatné bloky pre stanovište a tachometer
//    - Prehľadnejší a kompaktnejší info záznam vo vozidle
// ✅ ZLEPŠENÉ v10.11.0:
//    - Použitie dedikovaného poľa "Posledné km (KJ)" vo vozidle namiesto parsovania info
//    - MementoConfig v7.0.22: Pridané pole lastKmByRideLog do vehicle
//    - Spoľahlivejšie a rýchlejšie riešenie pre prepočet tachometra
//    - Pole obsahuje km z posledného uloženého záznamu knihy jázd
//    - Pri prepočte sa odpočíta stará hodnota a pripočíta nová
// ✅ OPRAVENÉ v10.10.0:
//    - Oprava duplikovania info záznamov v knižnici Vozidlá pri prepočte
//    - Vymazanie predchádzajúceho bloku pre daný záznam pred pridaním nového
//    - Tachometer: Extrahovanie predchádzajúcej zmeny a odpočítanie pred novým výpočtom
//    - Stanovište: Vymazanie predchádzajúceho bloku pre daný záznam
//    - Správne fungovanie pri opakovanom prepočte (uložení) záznamu
// ✅ OPRAVENÉ v10.9.1:
//    - Sekcia ZÁKAZKY v info zázname sa zobrazuje vždy ak sú zákazky v poli Zákazky
//    - Pôvodne sa zobrazovala len ak boli auto-linkované (orderLinkResult)
//    - Počet zákaziek sa získava priamo z poľa, nie z orderLinkResult
//    - Zjednotené získavanie atribútu "počet" s fallbackom na orderLinkResult
//    - Súhrn auto-linkovania sa zobrazuje len ak existuje orderLinkResult
// ✅ PRIDANÉ v10.9.0:
//    - Override pre ukončené zákazky: Ak Dátum ukončenia >= Dátum záznamu, ignoruj stav "Ukončená"
//    - Nový atribút "účtovanie" v poli Zákazky (Km, Paušál, %)
//    - Atribút sa automaticky vyplní zo spôsobu účtovania z Cenovej ponuky
//    - MementoConfig v7.0.21: Pridaný atribút billing do rideLogOrders
//    - Umožňuje správnu spätnú evidenciu starších záznamov
// ✅ PRIDANÉ v10.8.0:
//    - Automatická aktualizácia tachometra vozidla (Stav tachometra)
//    - Pri uložení záznamu sa pripočíta rozdiel km (nová - pôvodná hodnota)
//    - Správne fungovanie pri novom zázname aj pri editácii
//    - Pridaný nový krok 6: Aktualizácia tachometra vozidla
//    - Renumerovanie krokov 7-10 (linkovanie zákaziek, info, výkaz, denný report)
// ✅ OPRAVENÉ v10.7.1:
//    - Paušálna cena vozidla sa získava z linksFrom (ceny dopravy → Cena paušál)
//    - Cena za km sa získava z linksFrom (ceny dopravy → Cena km, fallback na Cena)
//    - MementoConfig v7.0.20: Pridané polia priceKm, priceFlatRate do transportPrices
// ✅ PRIDANÉ v10.7.0:
//    - Info záznam: Sekcia Vozidlo - účtované ceny (Km + Paušál), náklady/výnosy na trasu
//    - Info záznam: Sekcia Zákazky - výnosy podľa km a paušál z atribútov
//    - Info záznam: Sekcia Súhrn - výnosy zo zákaziek podľa spôsobu účtovania (nie %)
//    - MementoConfig v7.0.19: Pridané atribúty revenueKm, revenueFlatRate
//    - Počet zastávok sa berie z atribútu "počet" zákazky
// ✅ OPRAVENÉ v10.6.3:
//    - KRITICKÁ OPRAVA: dailyReportResult.dailyReport → dailyReportResult.dailyReportEntry
//    - Teraz sa správne ukladá link na Denný report a ikona sa pridáva
//    - Rozšírený debug výstup (updated, backLinkCreated, dailyReportEntry)
// ✅ OPRAVENÉ v10.6.2:
//    - Rozšírený debug výstup pre diagnostiku denného reportu
//    - Pridané kontroly stavu dailyReportResult pred a po volaní
//    - Debug sleduje celý priebeh pridávania ikony do entryIcons
// ✅ OPRAVENÉ v10.6.1:
//    - Pridaný debug výstup pre diagnostiku ukladania ikon
//    - Opravené referencie na quote a transportPrices v CONFIG.fields
// ✅ PRIDANÉ v10.6:
//    - Pridaná knižnica transportPrices (ceny dopravy) do MementoConfig v7.0.18
//    - Účtovaná cena vozidla z linksFrom (ceny dopravy / vozidlo)
//    - Výpočet výnosov za vozidlo (km × účtovaná cena)
//    - Sekcia Súhrn rozšírená o Výnosy a Vyhodnotenie (hrubý zisk, marža)
//    - Spôsob účtovania pri zákazkách (z cenovej ponuky)
//    - Ikony v sekcii Detaily trasy (🚀 ŠTART, 📍 ZASTÁVKY, 🏁 CIEĽ)
//    - "Už synchronizované" presunuté do zátvorky za Parkovanie
// ✅ PRIDANÉ v10.5:
//    - Refaktorovaný info záznam podľa vzoru Záznam prác
//    - Pridané sekcie Súhrn (Náklady, Výnosy, Vyhodnotenie)
//    - Pridané používané moduly do technických informácií
//    - Pridané parkovanie do sekcie Vozidlo (názov cieľového miesta)
//    - Zjednotené formátovanie a štruktúra info záznamu
// ✅ PRIDANÉ v10.4:
//    - Automatický výpočet atribútu km pre zákazky
//    - Km sa počíta z vzdialenosti miesta × 2 (tam a nazad)
//    - Pridané rideLogOrders atribúty do MementoConfig v7.0.17
// ✅ PRIDANÉ v10.3:
//    - Pridané vizuálne ikony pre denný report (📋)
//    - Link na denný report uložený v poli "Denný report"
//    - Ikony sa automaticky pridávajú pri úspešnom spracovaní
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
    version: "10.12.0",  // Zjednotený info záznam vozidla (stanovište + tachometer)

    // Referencie na centrálny config
    fields: {
        place: centralConfig.fields.place,
        rideLog: centralConfig.fields.rideLog,
        rideReport: centralConfig.fields.rideReport,
        vehicle: centralConfig.fields.vehicle,
        common: centralConfig.fields.common,
        order: centralConfig.fields.order,
        quote: centralConfig.fields.quote,
        employee: centralConfig.fields.employee,
        wages: centralConfig.fields.wages,
        transportPrices: centralConfig.fields.transportPrices,
        defaults: centralConfig.fields.defaults
    },

    // Atribúty
    attributes: {
        rideLogCrew: centralConfig.attributes.rideLogCrew,
        rideLogStops: centralConfig.attributes.rideLogStops,
        rideLogOrders: centralConfig.attributes.rideLogOrders,
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
                mzda: mzda,
                zamestnanecId: posadka[i].id
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
 * KROK 6: Aktualizácia tachometra vozidla
 * Pripočíta rozdi el prejazdených km k stavu tachometra vozidla
 */
function updateVehicleOdometer(originalKm, routeResult) {
    utils.addDebug(currentEntry, "\n📊 === KROK 6: AKTUALIZÁCIA TACHOMETRA VOZIDLA ===");

    var result = {
        success: false,
        message: "",
        kmAdded: 0
    };

    try {
        // Získaj vozidlo z aktuálneho záznamu
        var vozidloField = currentEntry.field(CONFIG.fields.rideLog.vehicle);
        if (!vozidloField || vozidloField.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne vozidlo - preskakujem aktualizáciu tachometra");
            result.success = true;
            result.message = "Žiadne vozidlo";
            return result;
        }

        var vozidlo = vozidloField[0];
        var vozidloNazov = utils.safeGet(vozidlo, CONFIG.fields.vehicle.name, "N/A");
        utils.addDebug(currentEntry, "  🚗 Vozidlo: " + vozidloNazov);

        // Získaj novú hodnotu km z routeResult alebo priamo z poľa
        var newKm = 0;
        if (routeResult && routeResult.totalKm) {
            newKm = routeResult.totalKm;
        } else {
            newKm = utils.safeGet(currentEntry, CONFIG.fields.rideLog.totalKm, 0);
        }

        utils.addDebug(currentEntry, "  📏 Pôvodná hodnota km v zázname: " + originalKm);
        utils.addDebug(currentEntry, "  📏 Nová hodnota km v zázname: " + newKm);

        // Vypočítaj rozdiel (bude kladný ak sa km zvýšili, záporný ak sa znížili)
        var kmDifference = newKm - originalKm;

        utils.addDebug(currentEntry, "  🔢 Rozdiel km: " + kmDifference.toFixed(2));

        // Ak nie je žiadny rozdiel, preskočiť aktualizáciu
        if (Math.abs(kmDifference) < 0.01) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna zmena km - preskakujem aktualizáciu tachometra");
            result.success = true;
            result.message = "Žiadna zmena km";
            return result;
        }

        // Získaj aktuálny stav tachometra vozidla
        var currentOdometer = utils.safeGet(vozidlo, CONFIG.fields.vehicle.odometerValue, 0);
        utils.addDebug(currentEntry, "  📊 Aktuálny stav tachometra: " + currentOdometer + " km");

        // Získaj posledné km zapísané týmto záznamom z poľa Km (z predchádzajúceho prepočtu)
        var lastKmByThisEntry = originalKm;
        utils.addDebug(currentEntry, "  🔍 Posledné km zapísané týmto záznamom do tachometra: " + lastKmByThisEntry + " km");

        // Ak existuje predchádzajúca zmena, odpočítaj ju najprv
        var adjustedOdometer = currentOdometer;
        if (Math.abs(lastKmByThisEntry) > 0.01) {
            adjustedOdometer = currentOdometer - lastKmByThisEntry;
            utils.addDebug(currentEntry, "  ↩️ Odobratie predchádzajúcej zmeny: " + currentOdometer + " - " + lastKmByThisEntry + " = " + adjustedOdometer + " km");
        }

        // Vypočítaj nový stav tachometra (pripočítaj nové km)
        var newOdometer = adjustedOdometer + newKm;

        // Zaokrúhli na 2 desatinné miesta
        newOdometer = Math.round(newOdometer * 100) / 100;

        var actualChange = newOdometer - currentOdometer;
        utils.addDebug(currentEntry, "  📊 Nový stav tachometra: " + newOdometer + " km (zmena: " + (actualChange > 0 ? "+" : "") + actualChange.toFixed(2) + " km)");

        // Aktualizuj tachometer vozidla
        try {
            vozidlo.set(CONFIG.fields.vehicle.odometerValue, newOdometer);
            utils.addDebug(currentEntry, "  ✅ Tachometer vozidla aktualizovaný: " + currentOdometer + " → " + newOdometer + " km");

            result.message = "Tachometer aktualizovaný: " + (actualChange > 0 ? "+" : "") + actualChange.toFixed(2) + " km";
            result.kmAdded = actualChange;
            result.success = true;

        } catch (updateError) {
            utils.addError(currentEntry, "Chyba pri aktualizácii tachometra: " + updateError.toString(), "updateVehicleOdometer");
            result.message = "Chyba aktualizácie";
        }

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "updateVehicleOdometer", error);
        result.message = "Kritická chyba";
    }

    return result;
}

/**
 * Zapíše zjednotený info záznam do vozidla
 * Obsahuje všetky zmeny z jedného záznamu Knihy jázd
 */
function writeVehicleInfoRecord(vehicleResult, odometerResult) {
    try {
        // Získaj vozidlo
        var vozidloField = currentEntry.field(CONFIG.fields.rideLog.vehicle);
        if (!vozidloField || vozidloField.length === 0) {
            return; // Žiadne vozidlo
        }

        var vozidlo = vozidloField[0];
        var entryId = currentEntry.field("ID");
        var entryDate = utils.safeGet(currentEntry, CONFIG.fields.rideLog.date);

        // Získaj existujúce info a vymaž predchádzajúci záznam od tohto záznamu knihy jázd
        var existingInfo = utils.safeGet(vozidlo, CONFIG.fields.common.info, "");
        var entryPattern = "• Kniha jázd #" + entryId;

        // Rozdeľ info na riadky a odstráň všetky predchádzajúce bloky pre tento záznam
        var lines = existingInfo.split("\n");
        var newLines = [];
        var skipBlock = false;
        var blockStart = -1;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            // Detekuj začiatok akéhokoľvek bloku pre tento záznam
            if (line.indexOf("🔄 AKTUALIZÁCIA VOZIDLA:") >= 0 ||
                line.indexOf("🔄 STANOVIŠTE AKTUALIZOVANÉ:") >= 0 ||
                line.indexOf("🔄 TACHOMETER AKTUALIZOVANÝ:") >= 0) {
                blockStart = i;
                skipBlock = false;
            }

            // Ak nájdeme náš záznam v bloku, označ ho na preskočenie
            if (blockStart >= 0 && line.indexOf(entryPattern) >= 0) {
                skipBlock = true;
                // Odstráň všetky riadky od blockStart po Script riadok
                var linesToRemove = i - blockStart + 2;
                for (var j = 0; j < linesToRemove; j++) {
                    if (newLines.length > 0) {
                        newLines.pop();
                    }
                }
                blockStart = -1;
                continue;
            }

            // Resetuj blockStart ak sme prešli cez blok bez nájdenia záznamu
            if (blockStart >= 0 && i > blockStart + 10) {
                blockStart = -1;
            }

            if (!skipBlock) {
                newLines.push(line);
            }
        }

        var cleanedInfo = newLines.join("\n");

        // Vytvor nový zjednotený info blok
        var updateInfo = "\n🔄 AKTUALIZÁCIA VOZIDLA: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";

        // Pridaj informácie o stanovišti
        if (vehicleResult && vehicleResult.success && vehicleResult.message !== "Žiadne vozidlo") {
            var cielField = currentEntry.field(CONFIG.fields.rideLog.destination);
            if (cielField && cielField.length > 0) {
                var cielNazov = utils.safeGet(cielField[0], CONFIG.fields.place.name, "N/A");

                if (vehicleResult.message === "Už synchronizované") {
                    updateInfo += "• 📍 Stanovište: " + cielNazov + " (bez zmeny)\n";
                } else if (vehicleResult.message && vehicleResult.message.indexOf("Stanovište aktualizované:") >= 0) {
                    // Získaj predchádzajúce stanovište z vehicleResult alebo vozidla
                    var aktualneStanovisteField = vozidlo.field(CONFIG.fields.vehicle.parkingBase);
                    var predchStanoviste = "neznáme";
                    if (aktualneStanovisteField && aktualneStanovisteField.length > 0) {
                        predchStanoviste = utils.safeGet(aktualneStanovisteField[0], CONFIG.fields.place.name, "neznáme");
                    }
                    updateInfo += "• 📍 Stanovište: " + predchStanoviste + " → " + cielNazov + "\n";
                }
            }
        }

        // Pridaj informácie o tachometri
        if (odometerResult && odometerResult.success && odometerResult.kmAdded !== 0) {
            var currentOdometer = utils.safeGet(vozidlo, CONFIG.fields.vehicle.odometerValue, 0);
            var kmAdded = odometerResult.kmAdded || 0;
            var previousOdometer = currentOdometer - kmAdded;

            updateInfo += "• 📊 Tachometer: " + previousOdometer.toFixed(2) + " → " + currentOdometer.toFixed(2) + " km";
            updateInfo += " (" + (kmAdded > 0 ? "+" : "") + kmAdded.toFixed(2) + " km)\n";
        } else if (odometerResult && odometerResult.message === "Žiadna zmena km") {
            var currentOdometer = utils.safeGet(vozidlo, CONFIG.fields.vehicle.odometerValue, 0);
            updateInfo += "• 📊 Tachometer: " + currentOdometer.toFixed(2) + " km (bez zmeny)\n";
        }

        // Pridaj základné informácie
        updateInfo += "• 📅 Dátum: " + utils.formatDate(entryDate, "DD.MM.YYYY") + "\n";
        updateInfo += "• 📝 Kniha jázd #" + entryId + "\n";
        updateInfo += "• 🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";

        // Obmedz dĺžku info poľa
        var newInfo = cleanedInfo + updateInfo;
        if (newInfo.length > 5000) {
            newInfo = "... (skrátené) ...\n" + newInfo.substring(newInfo.length - 4900);
        }

        vozidlo.set(CONFIG.fields.common.info, newInfo);
        utils.addDebug(currentEntry, "  ✅ Info záznam vozidla aktualizovaný");

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "writeVehicleInfoRecord", error);
    }
}

/**
 * KROK 7: Auto-linkovanie zákaziek zo zastávok
 */
function autoLinkOrdersFromStops() {
    utils.addDebug(currentEntry, "\n🔗 === KROK 7: AUTO-LINKOVANIE ZÁKAZIEK ZO ZASTÁVOK ===");
    
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
                utils.addDebug(currentEntry, "    🔍 Field name: " + CONFIG.fields.place.isOrder);
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
                utils.addDebug(currentEntry, "    🔍 LinksFrom parameters:");
                utils.addDebug(currentEntry, "      Library: " + (CONFIG.libraries.orders || "Zákazky"));
                utils.addDebug(currentEntry, "      Field: " + CONFIG.fields.order.place);
                var zakazky = zastavka.linksFrom(CONFIG.libraries.orders || "Zákazky", CONFIG.fields.order.place);
                
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
        // KONTROLA 1: Dátum ukončenia - ak je vyplnený a prešiel, zákazka nie je platná
        var datumUkoncenia = utils.safeGet(zakazka, CONFIG.fields.order.endDate);
        if (datumUkoncenia && datumZaznamu) {
            if (moment(datumZaznamu).isAfter(moment(datumUkoncenia), 'day')) {
                utils.addDebug(currentEntry, "      ❌ Zákazka ukončená podľa dátumu: " + utils.formatDate(datumUkoncenia, "DD.MM.YYYY"));
                return false;
            }
        }

        // KONTROLA 2: Stav zákazky - nesmie byť "Ukončená"
        // VÝNIMKA: Ak je Dátum ukončenia <= Dátum záznamu, ignoruj stav "Ukončená" (pre spätnú evidenciu)
        var stavZakazky = utils.safeGet(zakazka, CONFIG.fields.order.state, "");
        if (stavZakazky === "Ukončená") {
            // Override: Ak má zákazka dátum ukončenia a ten je >= dátum záznamu, povoľ ju
            if (datumUkoncenia && datumZaznamu) {
                if (moment(datumUkoncenia).isSameOrAfter(moment(datumZaznamu), 'day')) {
                    utils.addDebug(currentEntry, "      ⚠️ Zákazka ukončená, ale dátum ukončenia (" + utils.formatDate(datumUkoncenia, "DD.MM.YYYY") +
                                  ") >= dátum záznamu (" + utils.formatDate(datumZaznamu, "DD.MM.YYYY") + ") - POVOLENÉ (spätná evidencia)");
                    // Pokračuj vo validácii, nevrať false
                } else {
                    utils.addDebug(currentEntry, "      ❌ Zákazka je ukončená: " + stavZakazky);
                    return false;
                }
            } else {
                utils.addDebug(currentEntry, "      ❌ Zákazka je ukončená: " + stavZakazky);
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
 * Pomocná funkcia - nastaví atribúty počtu a km pre zákazky
 */
function nastavAtributyPoctu(countZakaziek) {
    try {
        utils.addDebug(currentEntry, "\n  🔢 NASTAVOVANIE ATRIBÚTOV (POČET, KM, ÚČTOVANIE):");
        utils.addDebug(currentEntry, "  📊 Počty zákaziek: " + JSON.stringify(countZakaziek));

        // Znovu načítaj Link to Entry pole
        var linknuteZakazky = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.orders);
        if (!linknuteZakazky) {
            utils.addDebug(currentEntry, "  ❌ Žiadne linknuté zákazky nenájdené");
            return;
        }
        utils.addDebug(currentEntry, "  📋 Počet linknutých zákaziek: " + linknuteZakazky.length);

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
                    utils.addDebug(currentEntry, "    ❌ Chyba pri nastavovaní atribútu počet: " + attrError);
                }
            }

            // Nastav atribút km z linknutého miesta
            try {
                var miesto = utils.safeGetLinks(zakazkaObj, CONFIG.fields.order.place);
                if (miesto && miesto.length > 0) {
                    var vzdialenost = utils.safeGet(miesto[0], CONFIG.fields.place.distance, 0);
                    if (vzdialenost > 0) {
                        // Vynásob 2 (tam aj nazad)
                        var kmTamNazad = vzdialenost * 2;
                        linknuteZakazky[i].setAttr("km", kmTamNazad);
                        utils.addDebug(currentEntry, "    ✅ " + info.display + " → km = " + kmTamNazad + " (vzdialenosť: " + vzdialenost + " km × 2)");
                    } else {
                        utils.addDebug(currentEntry, "    ℹ️ " + info.display + " → miesto nemá vzdialenosť");
                    }
                } else {
                    utils.addDebug(currentEntry, "    ℹ️ " + info.display + " → nemá linknuté miesto");
                }
            } catch (kmError) {
                utils.addDebug(currentEntry, "    ❌ Chyba pri nastavovaní atribútu km: " + kmError);
            }

            // Nastav atribút účtovanie z cenovej ponuky
            try {
                var cenovaPonuka = utils.safeGetLinks(zakazkaObj, CONFIG.fields.order.quote);
                if (cenovaPonuka && cenovaPonuka.length > 0) {
                    var sposobUctovania = utils.safeGet(cenovaPonuka[0], CONFIG.fields.quote.rideCalculation, "");
                    if (sposobUctovania) {
                        linknuteZakazky[i].setAttr(CONFIG.attributes.rideLogOrders.billing, sposobUctovania);
                        utils.addDebug(currentEntry, "    ✅ " + info.display + " → účtovanie = " + sposobUctovania);
                    } else {
                        utils.addDebug(currentEntry, "    ℹ️ " + info.display + " → cenová ponuka nemá spôsob účtovania");
                    }
                } else {
                    utils.addDebug(currentEntry, "    ℹ️ " + info.display + " → nemá cenovú ponuku");
                }
            } catch (billingError) {
                utils.addDebug(currentEntry, "    ❌ Chyba pri nastavovaní atribútu účtovanie: " + billingError);
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

            // Pridaj detaily trasy v kompaktnom formáte
            infoMessage += "## 🛣️ DETAILY TRASY\n\n";

            // Štart
            var start = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.start) || [];
            if (start.length > 0) {
                var startName = utils.safeGet(start[0], CONFIG.fields.place.name, "N/A");
                infoMessage += "**🚀 ŠTART:** " + startName + "\n\n";
            }

            // Zastávky
            var stops = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.stops) || [];
            if (stops.length > 0) {
                infoMessage += "**📍 ZASTÁVKY:**\n";
                for (var i = 0; i < stops.length; i++) {
                    var stop = stops[i];
                    var stopName = utils.safeGet(stop, CONFIG.fields.place.name, "N/A");
                    var stopKm = 0;
                    var stopDuration = 0;
                    var isOrderStop = false;

                    try {
                        stopKm = stop.attr(CONFIG.attributes.rideLogStops.km) || 0;
                        var stopDurationMs = stop.attr(CONFIG.attributes.rideLogStops.duration) || 0;
                        stopDuration = utils.convertDurationToHours(stopDurationMs);
                        isOrderStop = stop.field(CONFIG.fields.place.isOrder) === true;
                    } catch (e) {}

                    var orderMark = isOrderStop ? " 🏢" : "";
                    infoMessage += (i + 1) + ". " + stopName + orderMark + " - " +
                                  stopKm.toFixed(2) + " km / " + stopDuration.toFixed(2) + " h\n";
                }
                infoMessage += "\n";
            }

            // Cieľ
            var destination = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.destination) || [];
            if (destination.length > 0) {
                var destName = utils.safeGet(destination[0], CONFIG.fields.place.name, "N/A");
                var destKm = 0;
                var destDuration = 0;

                try {
                    destKm = destination[0].attr(CONFIG.attributes.rideLogStops.km) || 0;
                    var destDurationMs = destination[0].attr(CONFIG.attributes.rideLogStops.duration) || 0;
                    destDuration = utils.convertDurationToHours(destDurationMs);
                } catch (e) {}

                infoMessage += "**🏁 CIEĽ:** " + destName + " - " + destKm.toFixed(2) + " km / " + destDuration.toFixed(2) + " h\n\n";
            }

            // Súhrn
            infoMessage += "**Najazdené celkom:** " + routeResult.totalKm.toFixed(2) + " km\n";
            infoMessage += "**Čas:** " + routeResult.casJazdy.toFixed(2) + " h\n\n";
        } else {
            infoMessage += "- **Trasa:** Neprepočítaná\n\n";
        }

        // Vozidlo informácie
        if (vehicleResult && vehicleResult.success && vehicleResult.message !== "Žiadne vozidlo") {
            infoMessage += "## 🚚 VOZIDLO\n";

            // Pridaj informácie o parkovacom mieste (cieli)
            var destination = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.destination) || [];
            if (destination.length > 0) {
                var destName = utils.safeGet(destination[0], CONFIG.fields.place.name, "N/A");
                var syncStatus = vehicleResult.message === "Už synchronizované" ? " - synchronizované" : "";
                infoMessage += "- **Parkovanie:** " + destName + syncStatus + "\n";
            }

            var vozidloField = currentEntry.field(CONFIG.fields.rideLog.vehicle);
            if (vozidloField && vozidloField.length > 0) {
                var vozidlo = vozidloField[0];

                // Získaj účtované ceny z linksFrom (ceny dopravy)
                var uctovanaCena = 0;
                var pausalCena = 0;

                try {
                    var currentDate = utils.safeGet(currentEntry, CONFIG.fields.rideLog.date);
                    var transportPrices = vozidlo.linksFrom(CONFIG.libraries.transportPrices, CONFIG.fields.transportPrices.vehicle);

                    if (transportPrices && transportPrices.length > 0) {
                        // Zoraď ceny podľa dátumu platnosti
                        transportPrices.sort(function(a, b) {
                            var dateA = utils.safeGet(a, CONFIG.fields.transportPrices.validFrom);
                            var dateB = utils.safeGet(b, CONFIG.fields.transportPrices.validFrom);
                            if (!dateA && !dateB) return 0;
                            if (!dateA) return -1;
                            if (!dateB) return 1;
                            return moment(dateA).diff(moment(dateB));
                        });

                        // Nájdi platnú cenu k dátumu
                        for (var i = 0; i < transportPrices.length; i++) {
                            var priceRecord = transportPrices[i];
                            var validFrom = utils.safeGet(priceRecord, CONFIG.fields.transportPrices.validFrom);

                            if (validFrom && moment(validFrom).isSameOrBefore(currentDate)) {
                                // Získaj cenu za km (skús najprv priceKm, potom price ako fallback)
                                var priceKm = utils.safeGet(priceRecord, CONFIG.fields.transportPrices.priceKm);
                                if (priceKm > 0) {
                                    uctovanaCena = priceKm;
                                } else {
                                    uctovanaCena = utils.safeGet(priceRecord, CONFIG.fields.transportPrices.price, 0);
                                }

                                // Získaj paušálnu cenu
                                pausalCena = utils.safeGet(priceRecord, CONFIG.fields.transportPrices.priceFlatRate, 0);
                            } else {
                                break;
                            }
                        }
                    }
                } catch (priceError) {
                    utils.addDebug(currentEntry, "  ⚠️ Chyba pri získavaní cien: " + priceError);
                }

                // Zobraz účtované ceny
                if (uctovanaCena > 0) {
                    infoMessage += "- **Účtovaná cena (Km):** " + uctovanaCena + " €/km\n";
                }

                if (pausalCena > 0) {
                    infoMessage += "- **Účtovaná cena (Paušál):** " + utils.formatMoney(pausalCena) + "\n";
                }

                // Pridaj informácie o nákladovej cene
                var nakladovaCena = utils.safeGet(vozidlo, CONFIG.fields.vehicle.costRate, 0);
                if (nakladovaCena > 0) {
                    infoMessage += "- **Nákladová cena:** " + nakladovaCena + " €/km\n";
                }

                // Výpočet nákladov a výnosov na trasu
                if (routeResult && routeResult.totalKm > 0) {
                    var trasaNaklady = nakladovaCena * routeResult.totalKm;
                    var trasaVynosy = uctovanaCena * routeResult.totalKm;

                    if (trasaNaklady > 0) {
                        infoMessage += "- **Náklady na trasu:** " + utils.formatMoney(trasaNaklady);
                        infoMessage += " (" + routeResult.totalKm.toFixed(2) + " km × " + nakladovaCena + " €/km)\n";
                    }

                    if (trasaVynosy > 0) {
                        infoMessage += "- **Výnosy na trasu:** " + utils.formatMoney(trasaVynosy);
                        infoMessage += " (" + routeResult.totalKm.toFixed(2) + " km × " + uctovanaCena + " €/km)\n";
                    }
                }
            }
            infoMessage += "\n";
        }

        // Spočítaj zákazky pomocou checkboxu v zastávkach
        var customerStopsCount = 0;
        var stops = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.stops) || [];
        for (var s = 0; s < stops.length; s++) {
            try {
                var isCustomerStop = stops[s].field(CONFIG.fields.place.isOrder);
                if (isCustomerStop === true) customerStopsCount++;
            } catch (e) {}
        }

        // Zákazky informácie - zobraz vždy ak sú linknuté v poli Zákazky
        var zakazky = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.orders) || [];
        if (zakazky.length > 0) {
            var zakazkyForm = zakazky.length === 1 ? "zákazka" :
                             zakazky.length < 5 ? "zákazky" : "zákaziek";
            var checkboxInfo = customerStopsCount > 0 ? " (" + customerStopsCount + " zastávok s checkboxom)" : "";
            infoMessage += "## 🛠️ ZÁKAZKY (" + zakazky.length + " " + zakazkyForm + ")\n\n";
            for (var k = 0; k < Math.min(zakazky.length, 5); k++) {
                var zakazka = zakazky[k];
                var zakazkaInfo = getZakazkaInfo(zakazka);

                infoMessage += "### 🔨 " + zakazkaInfo.display + "\n";

                // Získaj atribút počtu (počet zastávok na zákazke)
                var attrPocet = 0;
                try {
                    var zakazkyField = currentEntry.field(CONFIG.fields.rideLog.orders);
                    if (zakazkyField && zakazkyField[k]) {
                        attrPocet = zakazkyField[k].attr(CONFIG.attributes.rideLogOrders.count) || 0;
                    }
                } catch (attrError) {
                    // Ignoruj chybu atribútu
                }

                // Fallback na orderLinkResult ak atribút neexistuje
                if (attrPocet === 0 && orderLinkResult && orderLinkResult.customersWithCounts) {
                    var identifikator = zakazkaInfo.cislo ? zakazkaInfo.cislo.toString() : zakazkaInfo.nazov;
                    attrPocet = orderLinkResult.customersWithCounts[identifikator] || 0;
                }

                if (attrPocet > 0) {
                    infoMessage += "- **Počet zastávok:** " + attrPocet + "x\n";
                }

                // Získaj spôsob účtovania a ceny z cenovej ponuky
                var sposobUctovania = "";
                var cenaKm = 0;
                var cenaPausal = 0;

                try {
                    var cenovaPonuka = utils.safeGetLinks(zakazka, CONFIG.fields.order.quote);
                    if (cenovaPonuka && cenovaPonuka.length > 0) {
                        sposobUctovania = utils.safeGet(cenovaPonuka[0], CONFIG.fields.quote.rideCalculation, "");
                        if (sposobUctovania) {
                            infoMessage += "- **Spôsob účtovania:** " + sposobUctovania + "\n";
                        }

                        // Získaj cenu za km z linknutého cenníka
                        var kmPriceLinks = utils.safeGetLinks(cenovaPonuka[0], CONFIG.fields.quote.kmRidePrice);
                        if (kmPriceLinks && kmPriceLinks.length > 0) {
                            cenaKm = utils.safeGet(kmPriceLinks[0], "Cena", 0);
                        }

                        // Získaj paušálnu cenu z linknutého cenníka
                        var pausalPriceLinks = utils.safeGetLinks(cenovaPonuka[0], CONFIG.fields.quote.flatRateRidePrice);
                        if (pausalPriceLinks && pausalPriceLinks.length > 0) {
                            cenaPausal = utils.safeGet(pausalPriceLinks[0], "Cena", 0);
                        }
                    }
                } catch (quoteError) {
                    // Ignoruj chybu
                }

                // Získaj atribút km zákazky
                var zakazkaKm = 0;
                try {
                    var zakazkyField = currentEntry.field(CONFIG.fields.rideLog.orders);
                    if (zakazkyField && zakazkyField[k]) {
                        zakazkaKm = zakazkyField[k].attr(CONFIG.attributes.rideLogOrders.km) || 0;
                    }
                } catch (attrError) {
                    // Ignoruj chybu
                }

                // Vypočítaj výnosy podľa km
                if (zakazkaKm > 0 && cenaKm > 0) {
                    var vynosyKm = zakazkaKm * cenaKm;
                    infoMessage += "- **Výnosy (Km):** " + utils.formatMoney(vynosyKm);
                    infoMessage += " (" + zakazkaKm.toFixed(2) + " km × " + cenaKm + " €/km)\n";
                }

                // Vypočítaj výnosy paušál (použiť atribút počet)
                if (attrPocet > 0 && cenaPausal > 0) {
                    var vynosyPausal = attrPocet * cenaPausal;
                    infoMessage += "- **Výnosy (Paušál):** " + utils.formatMoney(vynosyPausal);
                    infoMessage += " (" + attrPocet + "x × " + utils.formatMoney(cenaPausal) + ")\n";
                }

                infoMessage += "\n";
            }

            if (zakazky.length > 5) {
                infoMessage += "_...a ďalších " + (zakazky.length - 5) + " zákaziek_\n\n";
            }

            // Súhrnné informácie (len ak existuje orderLinkResult)
            if (orderLinkResult && orderLinkResult.processedStops > 0) {
                var totalStops = (utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.stops) || []).length;
                infoMessage += "**📊 Súhrn auto-linkovania:** " + orderLinkResult.processedStops + " zastávok so zákazkami z " + totalStops + " celkovo\n";

                // Upozornenie ak niektoré zastávky označené ako zákazky neboli nalinkované
                if (customerStopsCount > orderLinkResult.processedStops) {
                    var rejectedCount = customerStopsCount - orderLinkResult.processedStops;
                    infoMessage += "⚠️ **Pozor:** " + rejectedCount + " zastávok označených ako zákazky nebolo nalinkovaných (možno sú ukončené)\n";
                }
            }
            infoMessage += "\n";
        }

        // Posádka a mzdy
        if (wageResult && wageResult.success && wageResult.detaily && wageResult.detaily.length > 0) {
            infoMessage += "## 👥 POSÁDKA (" + wageResult.detaily.length + " " +
                          utils.getPersonCountForm(wageResult.detaily.length) + ")\n\n";

            // Identifikuj vodiča zo záznamu alebo vozidla
            var vodic = null;
            var soferField = currentEntry.field(CONFIG.fields.rideLog.driver);
            if (soferField && soferField.length > 0) {
                vodic = soferField[0];
            } else {
                // Fallback - skús nájsť vodiča z vozidla
                var vozidloField = currentEntry.field(CONFIG.fields.rideLog.vehicle);
                if (vozidloField && vozidloField.length > 0) {
                    var vozidlo = vozidloField[0];
                    var vozidlaSofer = utils.safeGetLinks(vozidlo, CONFIG.fields.vehicle.driver);
                    if (vozidlaSofer && vozidlaSofer.length > 0) {
                        vodic = vozidlaSofer[0];
                    }
                }
            }

            var vodicId = vodic ? vodic.id : null;

            for (var i = 0; i < wageResult.detaily.length; i++) {
                var detail = wageResult.detaily[i];
                var jeVodic = vodicId && detail.zamestnanecId === vodicId;
                var vodicMark = jeVodic ? " 🚚" : "";

                infoMessage += "### 👤 " + detail.meno + vodicMark + "\n";
                infoMessage += "- **Hodinovka:** " + detail.hodinovka + " €/h\n";
                infoMessage += "- **Mzdové náklady:** " + utils.formatMoney(detail.mzda) + "\n\n";
            }

            infoMessage += "**💰 Celkové mzdové náklady:** " + utils.formatMoney(wageResult.celkoveMzdy) + "\n\n";
        }

        // Súhrn nákladov a výnosov
        var totalCosts = 0;
        var wageCosts = 0;
        var vehicleCosts = 0;
        var totalRevenue = 0;
        var vehicleRevenue = 0;
        var ordersRevenueKm = 0;
        var ordersRevenueFlatRate = 0;

        if (wageResult && wageResult.success && wageResult.celkoveMzdy) {
            wageCosts = wageResult.celkoveMzdy;
            totalCosts += wageCosts;
        }
        if (vehicleCostResult && vehicleCostResult.success && vehicleCostResult.vehicleCosts) {
            vehicleCosts = vehicleCostResult.vehicleCosts;
            totalCosts += vehicleCosts;
        }

        // Vypočítaj výnosy za vozidlo (už sa nepočíta do totalRevenue, len pre informáciu)
        var vozidloField = currentEntry.field(CONFIG.fields.rideLog.vehicle);
        if (vozidloField && vozidloField.length > 0 && routeResult && routeResult.totalKm > 0) {
            var vozidlo = vozidloField[0];
            var uctovanaCena = 0;

            try {
                var currentDate = utils.safeGet(currentEntry, CONFIG.fields.rideLog.date);
                var transportPrices = vozidlo.linksFrom(CONFIG.libraries.transportPrices, CONFIG.fields.transportPrices.vehicle);

                if (transportPrices && transportPrices.length > 0) {
                    // Zoraď ceny podľa dátumu platnosti
                    transportPrices.sort(function(a, b) {
                        var dateA = utils.safeGet(a, CONFIG.fields.transportPrices.validFrom);
                        var dateB = utils.safeGet(b, CONFIG.fields.transportPrices.validFrom);
                        if (!dateA && !dateB) return 0;
                        if (!dateA) return -1;
                        if (!dateB) return 1;
                        return moment(dateA).diff(moment(dateB));
                    });

                    // Nájdi platnú cenu k dátumu
                    for (var i = 0; i < transportPrices.length; i++) {
                        var priceRecord = transportPrices[i];
                        var validFrom = utils.safeGet(priceRecord, CONFIG.fields.transportPrices.validFrom);

                        if (validFrom && moment(validFrom).isSameOrBefore(currentDate)) {
                            uctovanaCena = utils.safeGet(priceRecord, CONFIG.fields.transportPrices.price, 0);
                        } else {
                            break;
                        }
                    }
                }
            } catch (priceError) {
                // Ignoruj chybu
            }

            if (uctovanaCena > 0) {
                vehicleRevenue = uctovanaCena * routeResult.totalKm;
            }
        }

        // Vypočítaj výnosy zo zákaziek podľa spôsobu účtovania
        var zakazky = utils.safeGetLinks(currentEntry, CONFIG.fields.rideLog.orders) || [];
        for (var z = 0; z < zakazky.length; z++) {
            try {
                var zakazka = zakazky[z];
                var zakazkyField = currentEntry.field(CONFIG.fields.rideLog.orders);

                // Získaj spôsob účtovania
                var sposobUctovania = "";
                var cenovaPonuka = utils.safeGetLinks(zakazka, CONFIG.fields.order.quote);
                if (cenovaPonuka && cenovaPonuka.length > 0) {
                    sposobUctovania = utils.safeGet(cenovaPonuka[0], CONFIG.fields.quote.rideCalculation, "");

                    // Ak je spôsob účtovania %, preskočiť túto zákazku
                    if (sposobUctovania && sposobUctovania.indexOf("%") >= 0) {
                        continue;
                    }

                    // Získaj atribúty
                    var zakazkaKm = zakazkyField && zakazkyField[z] ? (zakazkyField[z].attr(CONFIG.attributes.rideLogOrders.km) || 0) : 0;
                    var zakazkaPocet = zakazkyField && zakazkyField[z] ? (zakazkyField[z].attr(CONFIG.attributes.rideLogOrders.count) || 0) : 0;

                    // Km účtovanie
                    if (sposobUctovania === "Km" && zakazkaKm > 0) {
                        var kmPriceLinks = utils.safeGetLinks(cenovaPonuka[0], CONFIG.fields.quote.kmRidePrice);
                        if (kmPriceLinks && kmPriceLinks.length > 0) {
                            var cenaKm = utils.safeGet(kmPriceLinks[0], "Cena", 0);
                            if (cenaKm > 0) {
                                ordersRevenueKm += zakazkaKm * cenaKm;
                            }
                        }
                    }

                    // Paušál účtovanie
                    if (sposobUctovania === "Paušál" && zakazkaPocet > 0) {
                        var pausalPriceLinks = utils.safeGetLinks(cenovaPonuka[0], CONFIG.fields.quote.flatRateRidePrice);
                        if (pausalPriceLinks && pausalPriceLinks.length > 0) {
                            var cenaPausal = utils.safeGet(pausalPriceLinks[0], "Cena", 0);
                            if (cenaPausal > 0) {
                                ordersRevenueFlatRate += zakazkaPocet * cenaPausal;
                            }
                        }
                    }
                }
            } catch (zakazkaError) {
                // Ignoruj chybu pri spracovaní zákazky
            }
        }

        // Celkové výnosy = výnosy zo zákaziek (km + paušál)
        totalRevenue = ordersRevenueKm + ordersRevenueFlatRate;

        infoMessage += "## 💰 SÚHRN\n";
        infoMessage += "### Náklady\n";
        if (wageCosts > 0) infoMessage += "- **Mzdové náklady:** " + utils.formatMoney(wageCosts) + "\n";
        if (vehicleCosts > 0) infoMessage += "- **Náklady vozidlo:** " + utils.formatMoney(vehicleCosts) + "\n";
        infoMessage += "- **NÁKLADY CELKOM:** " + utils.formatMoney(totalCosts) + "\n\n";

        infoMessage += "### Výnosy\n";

        // Zobraz výnosy zo zákaziek podľa spôsobu účtovania
        if (ordersRevenueKm > 0) {
            infoMessage += "- **Výnosy zákazky (Km):** " + utils.formatMoney(ordersRevenueKm) + "\n";
        }
        if (ordersRevenueFlatRate > 0) {
            infoMessage += "- **Výnosy zákazky (Paušál):** " + utils.formatMoney(ordersRevenueFlatRate) + "\n";
        }

        // Zobraz výnosy vozidla len informatívne (nie sú súčasťou totalRevenue)
        if (vehicleRevenue > 0 && ordersRevenueKm === 0 && ordersRevenueFlatRate === 0) {
            infoMessage += "- **Výnosy vozidlo (informatívne):** " + utils.formatMoney(vehicleRevenue);
            if (routeResult && routeResult.totalKm > 0 && uctovanaCena > 0) {
                infoMessage += " (" + routeResult.totalKm.toFixed(2) + " km × " + uctovanaCena + " €/km)";
            }
            infoMessage += "\n";
        }

        infoMessage += "- **VÝNOSY CELKOM:** " + utils.formatMoney(totalRevenue) + "\n\n";

        // Vyhodnotenie
        if (totalRevenue > 0 || totalCosts > 0) {
            var grossProfit = totalRevenue - totalCosts;
            var margin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

            infoMessage += "### Vyhodnotenie\n";
            infoMessage += "- **Hrubý zisk:** " + utils.formatMoney(grossProfit) + "\n";
            infoMessage += "- **Marža:** " + margin.toFixed(2) + " %\n\n";
        }

        infoMessage += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
        infoMessage += "- **Script:** " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "- **Čas spracovania:** " + moment().format("HH:mm:ss") + "\n\n";

        infoMessage += "**Použité moduly:**\n";
        if (typeof MementoConfig !== 'undefined') {
            infoMessage += "- MementoConfig v" + MementoConfig.version + "\n";
        }
        if (typeof MementoCore !== 'undefined' && MementoCore.version) {
            infoMessage += "- MementoCore v" + MementoCore.version + "\n";
        }
        if (typeof MementoBusiness !== 'undefined' && MementoBusiness.version) {
            infoMessage += "- MementoBusiness v" + MementoBusiness.version + "\n";
        }
        if (typeof MementoUtils !== 'undefined' && utils.version) {
            infoMessage += "- MementoUtils v" + utils.version + "\n";
        }

        infoMessage += "\n---\n**✅ PREPOČET DOKONČENÝ ÚSPEŠNE**";

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

        utils.addDebug(currentEntry, "  🔍 Debug info:");
        utils.addDebug(currentEntry, "    - Pole zákaziek: " + CONFIG.fields.rideLog.orders);
        utils.addDebug(currentEntry, "    - Počet zákaziek: " + (zakazky ? zakazky.length : 0));
        utils.addDebug(currentEntry, "    - Dátum: " + utils.formatDate(datum));

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
            utils.addDebug(currentEntry, "    🔍 LinksFrom hľadanie:");
            utils.addDebug(currentEntry, "      - Library: " + (CONFIG.libraries.rideReport || "Výkaz dopravy"));
            utils.addDebug(currentEntry, "      - Field: " + (CONFIG.fields.rideReport.order || "Zákazka"));
            utils.addDebug(currentEntry, "      - Zákazka ID: " + zakazkaObj.id);

            var existingReports = zakazkaObj.linksFrom(CONFIG.libraries.rideReport || "Výkaz dopravy", CONFIG.fields.rideReport.order || "Zákazka");
            utils.addDebug(currentEntry, "      - Nájdené výkazy: " + (existingReports ? existingReports.length : 0));

            var rideReport = null;
            var action = "none";

            if (existingReports && existingReports.length > 0) {
                rideReport = existingReports[0];
                utils.addDebug(currentEntry, "    ✅ Existujúci výkaz nájdený");
                action = "update";
                result.updatedCount++;
            } else {
                // Vytvor nový výkaz
                utils.addDebug(currentEntry, "    🆕 Vytvárám nový výkaz pre zákazku: " + zakazkaName);
                rideReport = createNewRideReport(zakazkaObj, datum, zakazkaName);
                if (rideReport) {
                    action = "create";
                    result.createdCount++;
                    utils.addDebug(currentEntry, "    ✨ Nový výkaz vytvorený úspešne");
                } else {
                    utils.addError(currentEntry, "Nepodarilo sa vytvoriť výkaz pre zákazku: " + zakazkaName, "synchronizeRideReport");
                }
            }
            
            if (rideReport) {
                utils.addDebug(currentEntry, "    📋 Spracovávam výkaz: " + (rideReport.id || "unknown ID"));
                var zakaziekCount = zakazky.length;

                // Aktualizuj link na aktuálny záznam
                utils.addDebug(currentEntry, "    🔗 Linkujem aktuálny záznam...");
                linkCurrentRecordToReport(rideReport);

                // Aktualizuj atribúty s pomernými hodnotami
                utils.addDebug(currentEntry, "    📊 Aktualizujem atribúty...");
                updateRideReportAttributesProportional(rideReport, routeResult, wageResult, vehicleCostResult, zakaziekCount);

                // Aktualizuj info pole
                utils.addDebug(currentEntry, "    📝 Aktualizujem info...");
                updateRideReportInfo(rideReport);

                result.rideReports.push(rideReport);
                result.actions.push({
                    zakazka: zakazkaName,
                    action: action
                });
                result.processedCount++;

                utils.addDebug(currentEntry, "    ✅ Výkaz " + (action === "create" ? "vytvorený" : "aktualizovaný"));
            } else {
                utils.addDebug(currentEntry, "    ❌ rideReport je null - nemôžem pokračovať");
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
        var dopravaPole = rideReport.field(CONFIG.fields.rideReport.rides);
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
        utils.addDebug(currentEntry, "    🔍 DEBUG createNewRideReport:");
        utils.addDebug(currentEntry, "      - zakazkaName: " + zakazkaName);
        utils.addDebug(currentEntry, "      - datum: " + utils.formatDate(datum));
        utils.addDebug(currentEntry, "      - zakazkaObj ID: " + (zakazkaObj ? zakazkaObj.id : "null"));

        var reportLib = libByName("Výkaz dopravy");
        utils.addDebug(currentEntry, "      - reportLib hľadanie: libByName('Výkaz dopravy')");
        utils.addDebug(currentEntry, "      - reportLib result: " + (reportLib ? "FOUND" : "NOT FOUND"));

        if (!reportLib) {
            utils.addError(currentEntry, "Knižnica 'Výkaz dopravy' nenájdená", "createNewRideReport");
            utils.addDebug(currentEntry, "      - ❌ CHYBA: Knižnica 'Výkaz dopravy' nenájdená");
            return null;
        }

        utils.addDebug(currentEntry, "      - Pokúšam sa vytvoriť nový výkaz...");

        // Vytvor nový výkaz
        var rideReport = reportLib.create({});
        utils.addDebug(currentEntry, "      - rideReport.create result: " + (rideReport ? "SUCCESS" : "FAILED"));

        if (!rideReport) {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť nový výkaz", "createNewRideReport");
            return null;
        }
        
        utils.addDebug(currentEntry, "      - Nastavujem základné polia...");

        // Nastav základné polia
        var reportNumber = "VD-" + moment(datum).format("YYYYMMDD");
        utils.addDebug(currentEntry, "      - reportNumber: " + reportNumber);

        utils.safeSet(rideReport, CONFIG.fields.rideReport.date, datum);
        utils.addDebug(currentEntry, "        ✅ Dátum nastavený: " + CONFIG.fields.rideReport.date);

        utils.safeSet(rideReport, CONFIG.fields.rideReport.number, reportNumber);
        utils.addDebug(currentEntry, "        ✅ Číslo nastavené: " + CONFIG.fields.rideReport.number);

        utils.safeSet(rideReport, CONFIG.fields.rideReport.description, "Výkaz dopravy - " + zakazkaName);
        utils.addDebug(currentEntry, "        ✅ Popis nastavený: " + CONFIG.fields.rideReport.description);

        utils.safeSet(rideReport, CONFIG.fields.rideReport.reportType, "% zo zákazky");
        utils.addDebug(currentEntry, "        ✅ Typ výkazu nastavený: " + CONFIG.fields.rideReport.reportType);

        utils.safeSet(rideReport, CONFIG.fields.rideReport.order, [zakazkaObj]);
        utils.addDebug(currentEntry, "        ✅ Zákazka nastavená: " + CONFIG.fields.rideReport.order);
        
        // Info záznam podľa štandardu MementoUtils ekosystému

        var info = "# 🚗 VÝKAZ DOPRAVY - AUTOMATICKÝ PREPOČET\n\n";

        info += "## 📅 Základné údaje\n";
        info += "- **Číslo výkazu:** " + reportNumber + "\n";
        info += "- **Dátum:** " + utils.formatDate(datum, "DD.MM.YYYY") + "\n";
        info += "- **Zákazka:** " + zakazkaName + "\n";
        info += "- **Počet jázd:** 0 (bude aktualizované)\n\n";

        info += "## 📊 SÚHRN\n";
        info += "- **Celkové km:** 0 km (bude aktualizované)\n";
        info += "- **Celkové hodiny:** 0 h (bude aktualizované)\n";
        info += "- **Mzdové náklady:** 0 € (bude aktualizované)\n";
        info += "- **Náklady vozidla:** 0 € (bude aktualizované)\n\n";

        info += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
        info += "- **Script:** " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "- **Čas spracovania:** " + moment().format("HH:mm:ss") + "\n";
        info += "- **MementoUtils:** v" + (utils.version || "N/A") + "\n";

        if (typeof MementoConfig !== 'undefined') {
            info += "- **MementoConfig:** v" + MementoConfig.version + "\n";
        }

        info += "\n---\n**✅ VÝKAZ VYTVORENÝ ÚSPEŠNE**";

        utils.safeSet(rideReport, CONFIG.fields.common.info, info);
        utils.addDebug(currentEntry, "        ✅ Info nastavené: " + CONFIG.fields.common.info);

        utils.addDebug(currentEntry, "      ✅ Všetky polia úspešne nastavené");
        utils.addDebug(currentEntry, "      ✅ rideReport ID: " + (rideReport ? rideReport.id : "null"));

        utils.addDebug(currentEntry, "  ✅ Nový výkaz vytvorený úspešne!");

        return rideReport;
        
    } catch (error) {
        utils.addError(currentEntry, "CHYBA v createNewRideReport: " + error.toString(), "createNewRideReport", error);
        utils.addDebug(currentEntry, "      ❌ EXCEPTION: " + error.toString());
        return null;
    }
}

/**
 * Prepojí aktuálny záznam s výkazom
 */
function linkCurrentRecordToReport(rideReport) {
    try {
        var dopravaPole = rideReport.field(CONFIG.fields.rideReport.rides) || [];
                    
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
            rideReport.set(CONFIG.fields.rideReport.ride, dopravaPole);
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
        var dopravaPole = rideReport.field(CONFIG.fields.rideReport.rides);
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
        var dopravaPole = rideReport.field(CONFIG.fields.rideReport.rides);
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

        // Regeneruj kompletný info záznam podľa štandardu MementoUtils
        if (true) {  // Vždy regeneruj kompletný info
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

            var newInfo = "# 🚗 VÝKAZ DOPRAVY - AUTOMATICKÝ PREPOČET\n\n";

            newInfo += "## 📅 Základné údaje\n";
            newInfo += "- **Číslo výkazu:** " + reportNumber + "\n";
            newInfo += "- **Dátum:** " + utils.formatDate(reportDate, "DD.MM.YYYY") + "\n";
            newInfo += "- **Popis:** " + reportDescription + "\n";
            newInfo += "- **Počet jázd:** " + rideCount + "\n\n";

            if (totalKm > 0 || totalHours > 0 || totalWageCosts > 0) {
                newInfo += "## 📊 SÚHRN\n";
                if (totalKm > 0) newInfo += "- **Celkové km:** " + totalKm.toFixed(2) + " km\n";
                if (totalHours > 0) newInfo += "- **Celkové hodiny:** " + totalHours.toFixed(2) + " h\n";
                if (totalWageCosts > 0) newInfo += "- **Mzdové náklady:** " + utils.formatMoney(totalWageCosts) + "\n";
                if (totalVehicleCosts > 0) newInfo += "- **Náklady vozidla:** " + utils.formatMoney(totalVehicleCosts) + "\n";
                newInfo += "\n";
            }

            newInfo += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
            newInfo += "- **Script:** " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
            newInfo += "- **Čas spracovania:** " + moment().format("HH:mm:ss") + "\n";
            newInfo += "- **MementoUtils:** v" + (utils.version || "N/A") + "\n";

            if (typeof MementoConfig !== 'undefined') {
                newInfo += "- **MementoConfig:** v" + MementoConfig.version + "\n";
            }

            newInfo += "- **Posledná aktualizácia:** Kniha jázd #" + entryId + " (" + timestamp + ")\n";
            newInfo += "\n---\n**✅ PREPOČET DOKONČENÝ ÚSPEŠNE**";

            existingInfo = newInfo;
        }

        // Obmedzenie dĺžky nie je potrebné pri kompletnej regenerácii

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

        // Vyčisti pole ikon na začiatku
        utils.safeSet(currentEntry, CONFIG.fields.rideLog.icons, "");
        var entryIcons = "";

        // Test HTTP funkcionality
        try {
            var testHttp = http();
            if (testHttp) {
                utils.addDebug(currentEntry, "✅ HTTP funkcia dostupná v Memento");
            }
        } catch (httpError) {
            utils.addDebug(currentEntry, "❌ HTTP funkcia chyba: " + httpError);
        }

        // Uloženie pôvodnej hodnoty km pre správnu aktualizáciu tachometra
        var originalKm = utils.safeGet(currentEntry, CONFIG.fields.rideLog.totalKm, 0);
        utils.addDebug(currentEntry, "📏 Pôvodná hodnota km v zázname: " + originalKm);

        // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Výpočet trasy" },
            step2: { success: false, name: "Spracovanie šoféra" },
            step3: { success: false, name: "Výpočet nákladov vozidla" },
            step4: { success: false, name: "Výpočet mzdových nákladov" },
            step5: { success: false, name: "Synchronizácia stanovišťa vozidla" },
            step6: { success: false, name: "Aktualizácia tachometra vozidla" },
            step7: { success: false, name: "Linkovanie zákaziek" },
            step8: { success: false, name: "Vytvorenie info záznamu" },
            step9: { success: false, name: "Synchronizácia výkazu jázd" },
            step10: { success: false, name: "Synchronizácia denného reportu" }
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

        // KROK 6: Aktualizácia tachometra vozidla
        var odometerResult = updateVehicleOdometer(originalKm, routeResult);
        steps.step6.success = odometerResult.success;

        // Zapíš zjednotený info záznam do vozidla (stanovište + tachometer)
        writeVehicleInfoRecord(vehicleResult, odometerResult);

        // KROK 7: Linkovanie zákaziek
        var orderLinkResult = autoLinkOrdersFromStops();
        steps.step7.success = orderLinkResult.success;

        // KROK 8: Vytvorenie info záznamu
        steps.step8.success = createInfoRecord(routeResult, wageResult, vehicleResult, vehicleCostResult, orderLinkResult);

        // KROK 9: Synchronizácia výkazu jázd (TESTOVANIE NOVEJ ARCHITEKTÚRY)
        utils.addDebug(currentEntry, "\n📊 === KROK 9: SYNCHRONIZÁCIA VÝKAZU JÁZD ===");
        utils.addDebug(currentEntry, "🧪 TESTOVANIE: Porovnávam starú a novú architektúru...");

        // Stará architektúra
        var vykazResult = synchronizeRideReport(routeResult, wageResult, vehicleCostResult);

        // NOVÁ ARCHITEKTÚRA - TEST
        //var newResult = testNewReportArchitecture(routeResult, wageResult, vehicleCostResult);

        // Porovnanie výsledkov
        utils.addDebug(currentEntry, "\n🔍 POROVNANIE VÝSLEDKOV:");
        utils.addDebug(currentEntry, "  📊 Stará architektúra: " + (vykazResult.success ? "✅" : "❌") + " (" + vykazResult.processedCount + " spracovaných)");
        //utils.addDebug(currentEntry, "  🚀 Nová architektúra: " + (newResult.success ? "✅" : "❌") + " (" + newResult.processedCount + " spracovaných)");

        steps.step9.success = vykazResult.success;

        // KROK 10: Synchronizácia denného reportu
        utils.addDebug(currentEntry, "\n📅 === KROK 10: SYNCHRONIZÁCIA DENNÉHO REPORTU ===");

        utils.addDebug(currentEntry, "🔍 Debug PRED volaním createOrUpdateDailyReport:");
        utils.addDebug(currentEntry, "  - entryIcons pred volaním: '" + entryIcons + "' (length: " + entryIcons.length + ")");
        utils.addDebug(currentEntry, "  - CONFIG.icons.daily_report: '" + CONFIG.icons.daily_report + "'");

        var dailyReportResult = utils.createOrUpdateDailyReport(currentEntry, 'rideLog', {
            debugEntry: currentEntry,
            createBackLink: true  // Vytvor spätný link na denný report
        });

        utils.addDebug(currentEntry, "🔍 Debug PO volaní createOrUpdateDailyReport:");
        utils.addDebug(currentEntry, "  - dailyReportResult existuje: " + (dailyReportResult ? "ÁNO" : "NIE"));
        if (dailyReportResult) {
            utils.addDebug(currentEntry, "  - dailyReportResult.success: " + dailyReportResult.success);
            utils.addDebug(currentEntry, "  - dailyReportResult.created: " + dailyReportResult.created);
            utils.addDebug(currentEntry, "  - dailyReportResult.updated: " + dailyReportResult.updated);
            utils.addDebug(currentEntry, "  - dailyReportResult.backLinkCreated: " + dailyReportResult.backLinkCreated);
            utils.addDebug(currentEntry, "  - dailyReportResult.dailyReportEntry existuje: " + (dailyReportResult.dailyReportEntry ? "ÁNO" : "NIE"));
            utils.addDebug(currentEntry, "  - dailyReportResult.error: " + (dailyReportResult.error || "žiadna"));
        }

        if (dailyReportResult && dailyReportResult.success) {
            var action = dailyReportResult.created ? "vytvorený" : "aktualizovaný";
            utils.addDebug(currentEntry, "✅ Denný report " + action + " úspešne");

            // Pridaj ikonu pre denný report
            utils.addDebug(currentEntry, "🔍 PRED pridaním ikony: entryIcons = '" + entryIcons + "'");
            entryIcons += CONFIG.icons.daily_report;
            utils.addDebug(currentEntry, "🔍 PO pridaní ikony: entryIcons = '" + entryIcons + "' (length: " + entryIcons.length + ")");
            utils.addDebug(currentEntry, "  " + CONFIG.icons.daily_report + " Pridaná ikona pre denný report");

            // Ulož link na denný report ak existuje
            if (dailyReportResult.dailyReportEntry) {
                utils.safeSet(currentEntry, CONFIG.fields.rideLog.dailyReport, [dailyReportResult.dailyReportEntry]);
                utils.addDebug(currentEntry, "  🔗 Link na denný report uložený");
            } else {
                utils.addDebug(currentEntry, "  ⚠️ dailyReportEntry neexistuje - link sa neukladá");
            }

            steps.step10.success = true;
        } else {
            var errorMsg = dailyReportResult ? dailyReportResult.error : "Neznáma chyba";
            utils.addError(currentEntry, "Chyba pri synchronizácii denného reportu: " + errorMsg);
            utils.addDebug(currentEntry, "❌ Denný report sync zlyhal - ikona sa NEPRIDÁ");
            steps.step10.success = false;
        }

        // Ulož ikony do poľa
        utils.addDebug(currentEntry, "🔍 Debug pred uložením ikon:");
        utils.addDebug(currentEntry, "  - entryIcons hodnota: '" + entryIcons + "'");
        utils.addDebug(currentEntry, "  - entryIcons.length: " + entryIcons.length);
        utils.addDebug(currentEntry, "  - Pole ikony: " + CONFIG.fields.rideLog.icons);

        if (entryIcons) {
            utils.safeSet(currentEntry, CONFIG.fields.rideLog.icons, entryIcons);
            utils.addDebug(currentEntry, "📌 Uložené ikony záznamu: " + entryIcons);
        } else {
            utils.addDebug(currentEntry, "⚠️ entryIcons je prázdny - neukladám");
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