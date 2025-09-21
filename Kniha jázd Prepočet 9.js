// ==============================================
// MEMENTO DATABASE - KNIHA JÁZD (ROUTE CALCULATION & PAYROLL)
// Verzia: 9.0 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Kniha jázd | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet vzdialenosti, času jazdy a miezd posádky
//    - Výpočet trasy pomocou OSRM API s fallback na vzdušnú vzdialenosť
//    - Automatické nastavenie default zdržania na zastávkach
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
    version: "9.0",
    
    // Referencie na centrálny config
    fields: {
        defaultZdrzanie: centralConfig.fields.defaults.defaultZdrzanie,
        place: centralConfig.fields.place,
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
        miesta: centralConfig.libraries.places,
        zamestnanci: centralConfig.libraries.employees,
        defaults: centralConfig.libraries.defaults
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
            var defaultZdrz = defaultsEntries[0].field(CONFIG.fields.defaultZdrzanie);
            
            if (defaultZdrz !== null && defaultZdrz !== undefined) {
                utils.addDebug("  📋 Našiel default zdržanie Duration: " + defaultZdrz + " ms");
                return utils.convertDurationToHours(defaultZdrz);
            }
        }
        
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

        var start = utils.safeGetLinks(currentEntry, CONFIG.fields.start);
        var zastavky = utils.safeGetLinks(currentEntry, CONFIG.fields.zastavky);
        var ciel = utils.safeGetLinks(currentEntry, CONFIG.fields.ciel);
        
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
        var lastSegment = utils.calculateSegment(currentPoint, cielGPS, "Úsek do cieľa");
        
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
 * KROK 5: Auto-linkovanie zákaziek zo zastávok
 */
function autoLinkCustomersFromStops() {
    utils.addDebug(currentEntry, "\n🔗 === KROK 5: AUTO-LINKOVANIE ZÁKAZIEK ZO ZASTÁVOK ===");
    
    var result = {
        success: false,
        linkedCount: 0,
        uniqueCustomers: 0,
        processedStops: 0,
        customersWithCounts: {}
    };
    
    try {
        var zastavky = currentEntry.field(CONFIG.fields.zastavky);
        var existingZakazky = currentEntry.field(CONFIG.fields.zakazky) || [];
        var datum = utils.safeGet(currentEntry, CONFIG.fields.datum, new Date());
        
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
            
            var nazovMiesta = utils.safeGet(zastavka, CONFIG.miestalFields.nazov, "Neznáme");
            utils.addDebug(currentEntry, "\n  [" + (i + 1) + "/" + zastavky.length + "] Zastávka: " + nazovMiesta);
            
            // Kontrola checkbox "Zákazka"
            var jeZakazka = false;
            try {
                var checkboxValue = zastavka.field(CONFIG.miestalFields.jeZakazka);
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
                var zakazky = zastavka.linksFrom(CONFIG.libraries.zakazky || "Zákazky", CONFIG.zakazkyFields.miesto);
                
                if (!zakazky || zakazky.length === 0) {
                    utils.addDebug(currentEntry, "    ❌ Žiadne zákazky nenájdené pre toto miesto");
                    continue;
                }
                
                utils.addDebug(currentEntry, "    🔗 LinksFrom našiel: " + zakazky.length + " zákaziek");
                
                // Vyber najlepšiu zákazku
                var vybranaZakazka = najdiNajnovsieZakazku(zakazky, datum);
                
                if (!vybranaZakazka) {
                    utils.addDebug(currentEntry, "    ❌ Nepodarilo sa vybrať zákazku");
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
            utils.safeSet(currentEntry, CONFIG.fields.zakazky, kombinovaneZakazky);
            utils.addDebug(currentEntry, "  ✅ Zákazky úspešne nastavené");
            
            // Nastav atribúty s počtom výskytov
            nastavAtributyPoctu(kombinovaneZakazky, countZakaziek);
        }
        
        result.success = true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "autoLinkCustomersFromStops", error);
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
        
        utils.safeSet(currentEntry, CONFIG.fields.info, info);
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