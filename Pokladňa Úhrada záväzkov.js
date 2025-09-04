// ==============================================
// MEMENTO DATABASE - POKLADŇA ÚHRADA ZÁVÄZKOV
// Verzia: 8.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Pokladňa | Trigger: After Save + Action Script
// ==============================================
// 📋 FUNKCIA:
//    - Automatická úhrada záväzkov zo zadanej sumy
//    - Možnosť započítania pohľadávok
//    - Vytvorenie preplatkov (záloha/prémia/pohľadávka)
//    - Synchronizácia s knižnicami Záväzky a Pohľadávky
//    - Info záznamy pre audit trail
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoCore (základné funkcie)
//    - MementoBusiness (business logika)
// ==============================================
// ✅ OPTIMALIZOVANÉ v8.0:
//    - Využitie centrálneho CONFIG z MementoConfig
//    - Štandardné logging funkcie z MementoCore
//    - Business logika pomocou MementoBusiness
//    - Čistá štruktúra bez duplicít
//    - Kompatibilita s MementoUtils ekosystémom
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Pokladňa Úhrada Záväzkov",
    version: "8.0.2",
    
    // Referencie na centrálny config
    fields: {
        // Pokladňa polia
        cashBook: centralConfig.fields.cashBook,
        
        // Záväzky polia - používame priame názvy polí
        obligations: {
            date: "Dátum",
            type: "Typ",
            state: "Stav",
            creditor: "Veriteľ",
            employee: "Zamestnanec",
            supplier: "Dodávateľ",
            partner: "Partner",
            client: "Klient",
            amount: "Suma",
            paid: "Zaplatené",
            balance: "Zostatok",
            description: "Popis",
            info: "info"
        },
        
        // Pohľadávky polia
        receivables: {
            date: "Dátum",
            type: "Typ",
            state: "Stav",
            creditor: "Veriteľ",
            employee: "Zamestnanec",
            supplier: "Dodávateľ",
            partner: "Partner",
            client: "Klient",
            amount: "Suma",
            paid: "Zaplatené",
            balance: "Zostatok",
            description: "Popis",
            info: "info"
        },
        
        // Spoločné polia
        common: centralConfig.fields.common,
        
        // Mapovanie pre rýchly prístup
        uhradaZavazku: "Úhrada záväzku",
        zapocitatPohladavku: "Započítať pohľadávku",
        zavazky: "Záväzky",
        pohladavky: "Pohľadávky",
        suma: "Suma",
        zPreplatkulytvoriť: "Z preplatku vytvoriť",
        info: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.info) || "info"
    },
    
    // Knižnice
    libraries: {
        cashBook: centralConfig.libraries.cashBook || "Pokladňa",
        obligations: centralConfig.libraries.obligations || "Záväzky",
        receivables: centralConfig.libraries.receivables || "Pohľadávky",
        employees: centralConfig.libraries.employees || "Zamestnanci"
    },
    
    // Ikony
    icons: centralConfig.icons,
    
    // Konštanty
    constants: {
        // Stavy
        stavy: {
            neuhradene: "Neuhradené",
            ciastocneUhradene: "Čiastočne uhradené",
            uhradene: "Uhradené"
        },
        
        // Typy preplatkov
        typyPreplatku: {
            pohladavka: "Pohľadávku",
            premia: "Prémiu",
            zaloha: "Zálohu"
        },
        
        // Účel výdaja
        ucelVydaja: {
            mzda: "Mzda",
            mzdaPremia: "Mzda prémia",
            mzdaZaloha: "Mzda záloha",
            fakturyDodavatelov: "Faktúry dodávateľov",
            ostatneVydavky: "Ostatné výdavky"
        },
        
        // Pohyb
        pohyb: {
            prijem: "Príjem",
            vydavok: "Výdavok"
        }
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()));
        
        // Kroky spracovania
        var steps = {
            step1: { success: false, name: "Kontrola spúšťacích podmienok" },
            step2: { success: false, name: "Validácia a filtrovanie záväzkov" },
            step3: { success: false, name: "Kontrola a spracovanie pohľadávok" },
            step4: { success: false, name: "Proces úhrad záväzkov" },
            step5: { success: false, name: "Spracovanie preplatku" },
            step6: { success: false, name: "Finalizácia transakcie" }
        };
        
        // KROK 1: Kontrola spúšťacích podmienok
        utils.addDebug(currentEntry, utils.getIcon("validation") + " KROK 1: Kontrola spúšťacích podmienok");
        
        var uhradaZavazku = utils.safeGet(currentEntry, CONFIG.fields.uhradaZavazku, false);
        
        if (!uhradaZavazku) {
            utils.addDebug(currentEntry, "❌ Script ukončený - 'Úhrada záväzku' nie je zaškrtnutá");
            return true; // Nekončíme chybou, len preskakujeme
        }
        
        // Kontrola či už nebola úhrada spracovaná
        var infoContent = utils.safeGet(currentEntry, CONFIG.fields.info, "");
        if (infoContent.indexOf("ÚHRADA ZÁVÄZKOV DOKONČENÁ") !== -1) {
            utils.addDebug(currentEntry, "✅ Úhrada už bola spracovaná - preskakujem");
            return true;
        }
        
        steps.step1.success = true;
        
        // KROK 2: Validácia a filtrovanie záväzkov
        utils.addDebug(currentEntry, utils.getIcon("validation") + " KROK 2: Validácia záväzkov");
        
        var validationResult = validateObligations();
        if (!validationResult.success) {
            utils.addError(currentEntry, validationResult.error, "main");
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step2.success = true;
        
        // KROK 3: Kontrola a spracovanie pohľadávok
        utils.addDebug(currentEntry, utils.getIcon("search") + " KROK 3: Kontrola pohľadávok");
        
        var pohladavkyResult = checkAndProcessReceivables(validationResult.ownerInfo, validationResult.dostupnaSuma);
        var finalAmount = pohladavkyResult.finalAmount;
        var usedReceivables = pohladavkyResult.usedAmount;
        
        steps.step3.success = true;
        
        // KROK 4: Proces úhrad záväzkov
        utils.addDebug(currentEntry, utils.getIcon("money") + " KROK 4: Proces úhrady záväzkov");
        
        var paymentResult = processPayments(validationResult.validZavazky, finalAmount, validationResult.ownerInfo);
        steps.step4.success = paymentResult.success;
        
        // KROK 5: Spracovanie preplatku
        if (paymentResult.preplatokSuma > 0) {
            utils.addDebug(currentEntry, utils.getIcon("create") + " KROK 5: Spracovanie preplatku");
            
            var typPreplatku = utils.safeGet(currentEntry, CONFIG.fields.zPreplatkulytvoriť);
            var preplatokResult = processOverpayment(paymentResult.preplatokSuma, typPreplatku, validationResult.ownerInfo);
            steps.step5.success = preplatokResult.success;
        } else {
            steps.step5.success = true;
        }
        
        // KROK 6: Finalizácia transakcie
        utils.addDebug(currentEntry, utils.getIcon("save") + " KROK 6: Finalizácia transakcie");
        finalizeTransaction(validationResult.dostupnaSuma, paymentResult, validationResult.ownerInfo, usedReceivables);
        steps.step6.success = true;
        
        // Záverečné zhrnutie
        logFinalSummary(steps);
        
        // Zobraz report užívateľovi
        var finalReport = generateFinalReport(
            validationResult.dostupnaSuma, 
            paymentResult.preplatokSuma, 
            paymentResult, 
            validationResult.ownerInfo,
            typPreplatku,
            usedReceivables
        );
        
        message(finalReport);
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// KROK 2: VALIDÁCIA ZÁVÄZKOV
// ==============================================

function validateObligations() {
    try {
        var zavazkyArray = utils.safeGetLinks(currentEntry, CONFIG.fields.zavazky);
        
        if (!zavazkyArray || zavazkyArray.length === 0) {
            return { success: false, error: "Nie sú vybrané žiadne záväzky!" };
        }
        
        utils.addDebug(currentEntry, "  📋 Počet vybraných záväzkov: " + zavazkyArray.length);
        
        // Získanie sumy
        var suma = utils.safeGet(currentEntry, CONFIG.fields.suma, 0);
        suma = parseFloat(suma);
        
        if (isNaN(suma) || suma <= 0) {
            return { success: false, error: "Suma musí byť väčšia ako 0€!" };
        }
        
        // Filtrovanie platných záväzkov
        var validZavazky = [];
        var ownerInfo = null;
        var totalZostatok = 0;
        
        for (var i = 0; i < zavazkyArray.length; i++) {
            var zavazok = zavazkyArray[i];
            var stav = utils.safeGet(zavazok, CONFIG.fields.obligations.state);
            
            // Kontrola stavu
            if (stav !== CONFIG.constants.stavy.neuhradene && 
                stav !== CONFIG.constants.stavy.ciastocneUhradene) {
                utils.addDebug(currentEntry, "  ⚠️ Záväzok #" + zavazok.field("ID") + 
                             " preskočený - stav: " + stav, "warning");
                continue;
            }
            
            // Získanie vlastníka
            var currentOwner = getObligationOwner(zavazok);
            if (!currentOwner) {
                utils.addDebug(currentEntry, "  ⚠️ Záväzok #" + zavazok.field("ID") + 
                             " nemá vlastníka", "warning");
                continue;
            }
            
            // Kontrola konzistentnosti vlastníka
            if (!ownerInfo) {
                ownerInfo = currentOwner;
            } else if (ownerInfo.id !== currentOwner.id) {
                return { 
                    success: false, 
                    error: "Všetky záväzky musia mať rovnakého vlastníka!\n" +
                          "Prvý vlastník: " + ownerInfo.displayName + "\n" +
                          "Konfliktný vlastník: " + currentOwner.displayName 
                };
            }
            
            var zostatok = utils.safeGet(zavazok, CONFIG.fields.obligations.balance, 0);
            totalZostatok += zostatok;
            validZavazky.push(zavazok);
        }
        
        if (validZavazky.length === 0) {
            return { success: false, error: "Žiadne platné záväzky na uhradenie!" };
        }
        
        utils.addDebug(currentEntry, "✅ Validácia úspešná:");
        utils.addDebug(currentEntry, "  • Platné záväzky: " + validZavazky.length);
        utils.addDebug(currentEntry, "  • Vlastník: " + ownerInfo.displayName);
        utils.addDebug(currentEntry, "  • Celkový zostatok: " + utils.formatMoney(totalZostatok));
        utils.addDebug(currentEntry, "  • Dostupná suma: " + utils.formatMoney(suma));
        
        return {
            success: true,
            validZavazky: validZavazky,
            ownerInfo: ownerInfo,
            totalZostatok: totalZostatok,
            dostupnaSuma: suma
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "validateObligations", error);
        return { success: false, error: "Chyba validácie: " + error.toString() };
    }
}

// ==============================================
// POMOCNÁ FUNKCIA: ZÍSKANIE VLASTNÍKA ZÁVÄZKU
// ==============================================

function getObligationOwner(zavazok) {
    try {
        // Kontrola typu veriteľa a získanie vlastníka
        var creditorType = utils.safeGet(zavazok, CONFIG.fields.obligations.creditor);
        
        var owner = null;
        var type = null;
        var displayName = "Neznámy";
        
        // Zamestnanec
        var employees = utils.safeGetLinks(zavazok, CONFIG.fields.obligations.employee);
        if (employees && employees.length > 0) {
            owner = employees[0];
            type = "employee";
            displayName = utils.formatEmployeeName(owner);
        }
        
        // Dodávateľ
        if (!owner) {
            var suppliers = utils.safeGetLinks(zavazok, CONFIG.fields.obligations.supplier);
            if (suppliers && suppliers.length > 0) {
                owner = suppliers[0];
                type = "supplier";
                displayName = utils.safeGet(owner, "Názov") || "Dodávateľ";
            }
        }
        
        // Partner
        if (!owner) {
            var partners = utils.safeGetLinks(zavazok, CONFIG.fields.obligations.partner);
            if (partners && partners.length > 0) {
                owner = partners[0];
                type = "partner";
                displayName = utils.safeGet(owner, "Názov") || "Partner";
            }
        }
        
        // Klient
        if (!owner) {
            var clients = utils.safeGetLinks(zavazok, CONFIG.fields.obligations.client);
            if (clients && clients.length > 0) {
                owner = clients[0];
                type = "client";
                displayName = utils.safeGet(owner, "Názov") || "Klient";
            }
        }
        
        if (!owner) {
            return null;
        }
        
        return {
            owner: owner,
            type: type,
            displayName: displayName,
            id: owner.field("ID") || owner.field("id"),
            creditorType: creditorType
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní vlastníka", "getObligationOwner", error);
        return null;
    }
}

// ==============================================
// KROK 3: KONTROLA A SPRACOVANIE POHĽADÁVOK
// ==============================================

function checkAndProcessReceivables(ownerInfo, zakladnaSuma) {
    try {
        var zapocitat = utils.safeGet(currentEntry, CONFIG.fields.zapocitatPohladavku, false);
        
        if (!zapocitat) {
            utils.addDebug(currentEntry, "  ℹ️ Započítanie pohľadávok nie je požadované");
            return { finalAmount: zakladnaSuma, usedAmount: 0 };
        }
        
        // Získanie pohľadávok
        var pohladavkyArray = utils.safeGetLinks(currentEntry, CONFIG.fields.pohladavky);
        
        if (!pohladavkyArray || pohladavkyArray.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Žiadne pohľadávky na započítanie", "warning");
            return { finalAmount: zakladnaSuma, usedAmount: 0 };
        }
        
        // Filtrovanie platných pohľadávok
        var validPohladavky = [];
        var totalPohladavky = 0;
        
        for (var i = 0; i < pohladavkyArray.length; i++) {
            var pohladavka = pohladavkyArray[i];
            var pohladavkaOwner = getReceivableOwner(pohladavka);
            
            // Kontrola vlastníka
            if (!pohladavkaOwner || pohladavkaOwner.id !== ownerInfo.id) {
                utils.addDebug(currentEntry, "  ⚠️ Pohľadávka #" + pohladavka.field("ID") + 
                             " má iného vlastníka", "warning");
                continue;
            }
            
            var zostatok = utils.safeGet(pohladavka, CONFIG.fields.receivables.balance, 0);
            if (zostatok > 0) {
                validPohladavky.push({
                    entry: pohladavka,
                    zostatok: zostatok
                });
                totalPohladavky += zostatok;
            }
        }
        
        if (validPohladavky.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Žiadne platné pohľadávky rovnakého vlastníka", "warning");
            return { finalAmount: zakladnaSuma, usedAmount: 0 };
        }
        
        // Spracovanie pohľadávok
        var usedAmount = 0;
        var potrebnaSuma = Math.min(totalPohladavky, zakladnaSuma);
        
        for (var j = 0; j < validPohladavky.length && potrebnaSuma > 0; j++) {
            var pohladavkaInfo = validPohladavky[j];
            var pouzit = Math.min(pohladavkaInfo.zostatok, potrebnaSuma);
            
            // Aktualizácia pohľadávky
            var novyZostatok = pohladavkaInfo.zostatok - pouzit;
            var noveZaplatene = utils.safeGet(pohladavkaInfo.entry, CONFIG.fields.receivables.paid, 0) + pouzit;
            
            utils.safeSet(pohladavkaInfo.entry, CONFIG.fields.receivables.paid, noveZaplatene);
            utils.safeSet(pohladavkaInfo.entry, CONFIG.fields.receivables.balance, novyZostatok);
            utils.safeSet(pohladavkaInfo.entry, CONFIG.fields.receivables.state, 
                         novyZostatok > 0 ? CONFIG.constants.stavy.ciastocneUhradene : CONFIG.constants.stavy.uhradene);
            
            // Info záznam
            utils.addInfo(pohladavkaInfo.entry, "ZAPOČÍTANIE POHĽADÁVKY", {
                suma: pouzit,
                zostatok: novyZostatok,
                zdrojZaznam: "Pokladňa #" + currentEntry.field("ID")
            });
            
            usedAmount += pouzit;
            potrebnaSuma -= pouzit;
            
            utils.addDebug(currentEntry, "  ✅ Použitá pohľadávka #" + pohladavkaInfo.entry.field("ID") + 
                         ": " + utils.formatMoney(pouzit));
        }
        
        var finalAmount = zakladnaSuma + usedAmount;
        
        utils.addDebug(currentEntry, "✅ Pohľadávky spracované:");
        utils.addDebug(currentEntry, "  • Použitá suma: " + utils.formatMoney(usedAmount));
        utils.addDebug(currentEntry, "  • Finálna suma: " + utils.formatMoney(finalAmount));
        
        return { finalAmount: finalAmount, usedAmount: usedAmount };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "checkAndProcessReceivables", error);
        return { finalAmount: zakladnaSuma, usedAmount: 0 };
    }
}

// ==============================================
// POMOCNÁ FUNKCIA: ZÍSKANIE VLASTNÍKA POHĽADÁVKY
// ==============================================

function getReceivableOwner(pohladavka) {
    try {
        var owner = null;
        var type = null;
        var displayName = "Neznámy";
        
        // Podobná logika ako pri záväzkoch
        var employees = utils.safeGetLinks(pohladavka, CONFIG.fields.receivables.employee);
        if (employees && employees.length > 0) {
            owner = employees[0];
            type = "employee";
            displayName = utils.formatEmployeeName(owner);
        }
        
        if (!owner) {
            var suppliers = utils.safeGetLinks(pohladavka, CONFIG.fields.receivables.supplier);
            if (suppliers && suppliers.length > 0) {
                owner = suppliers[0];
                type = "supplier";
                displayName = utils.safeGet(owner, "Názov") || "Dodávateľ";
            }
        }
        
        if (!owner) {
            var partners = utils.safeGetLinks(pohladavka, CONFIG.fields.receivables.partner);
            if (partners && partners.length > 0) {
                owner = partners[0];
                type = "partner";
                displayName = utils.safeGet(owner, "Názov") || "Partner";
            }
        }
        
        if (!owner) {
            var clients = utils.safeGetLinks(pohladavka, CONFIG.fields.receivables.client);
            if (clients && clients.length > 0) {
                owner = clients[0];
                type = "client";
                displayName = utils.safeGet(owner, "Názov") || "Klient";
            }
        }
        
        if (!owner) {
            return null;
        }
        
        return {
            owner: owner,
            type: type,
            displayName: displayName,
            id: owner.field("ID") || owner.field("id")
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní vlastníka pohľadávky", "getReceivableOwner", error);
        return null;
    }
}

// ==============================================
// KROK 4: PROCES ÚHRAD ZÁVÄZKOV
// ==============================================

function processPayments(validZavazky, dostupnaSuma, ownerInfo) {
    try {
        utils.addDebug(currentEntry, "Spúšťam proces úhrad...");
        utils.addDebug(currentEntry, "  • Dostupná suma: " + utils.formatMoney(dostupnaSuma));
        utils.addDebug(currentEntry, "  • Počet záväzkov: " + validZavazky.length);
        
        var uhradeneZavazky = [];
        var datumyZavazkov = [];
        var zbyvajucaSuma = dostupnaSuma;
        
        // Zoradenie záväzkov chronologicky
        validZavazky.sort(function(a, b) {
            var dateA = utils.safeGet(a, CONFIG.fields.obligations.date, new Date(0));
            var dateB = utils.safeGet(b, CONFIG.fields.obligations.date, new Date(0));
            return new Date(dateA) - new Date(dateB);
        });
        
        // Spracovanie každého záväzku
        for (var i = 0; i < validZavazky.length && zbyvajucaSuma > 0.01; i++) {
            var zavazok = validZavazky[i];
            var zostatok = utils.safeGet(zavazok, CONFIG.fields.obligations.balance, 0);
            var datum = utils.safeGet(zavazok, CONFIG.fields.obligations.date);
            
            utils.addDebug(currentEntry, "  📋 Záväzok " + (i + 1) + "/" + validZavazky.length + 
                         ": " + utils.formatMoney(zostatok));
            
            if (zbyvajucaSuma >= zostatok) {
                // Úplná úhrada
                processFullPayment(zavazok, zostatok, ownerInfo);
                
                uhradeneZavazky.push({
                    zavazok: zavazok,
                    amount: zostatok,
                    type: "úplná"
                });
                
                zbyvajucaSuma = Math.round((zbyvajucaSuma - zostatok) * 100) / 100;
                
            } else if (zbyvajucaSuma > 0) {
                // Čiastočná úhrada
                processPartialPayment(zavazok, zbyvajucaSuma, ownerInfo);
                
                uhradeneZavazky.push({
                    zavazok: zavazok,
                    amount: zbyvajucaSuma,
                    type: "čiastočná"
                });
                
                zbyvajucaSuma = 0;
            }
            
            // Zaznamenanie dátumu
            if (datum) {
                datumyZavazkov.push(utils.formatDate(datum));
            }
        }
        
        utils.addDebug(currentEntry, "✅ Proces úhrad dokončený:");
        utils.addDebug(currentEntry, "  • Uhradené záväzky: " + uhradeneZavazky.length);
        utils.addDebug(currentEntry, "  • Preplatok: " + utils.formatMoney(zbyvajucaSuma));
        
        return {
            success: true,
            uhradeneZavazky: uhradeneZavazky,
            datumyZavazkov: datumyZavazkov,
            preplatokSuma: zbyvajucaSuma
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processPayments", error);
        return {
            success: false,
            uhradeneZavazky: [],
            datumyZavazkov: [],
            preplatokSuma: 0
        };
    }
}

// ==============================================
// POMOCNÉ FUNKCIE PRE PLATBY
// ==============================================

function processFullPayment(zavazok, suma, ownerInfo) {
    try {
        var pvodneZaplatene = utils.safeGet(zavazok, CONFIG.fields.obligations.paid, 0);
        var noveZaplatene = pvodneZaplatene + suma;
        
        // Aktualizácia záväzku
        utils.safeSet(zavazok, CONFIG.fields.obligations.paid, noveZaplatene);
        utils.safeSet(zavazok, CONFIG.fields.obligations.balance, 0);
        utils.safeSet(zavazok, CONFIG.fields.obligations.state, CONFIG.constants.stavy.uhradene);
        
        // Info záznam
        utils.addInfo(zavazok, "ÚPLNÁ ÚHRADA ZÁVÄZKU", {
            suma: suma,
            zostatok: 0,
            vlastnik: ownerInfo.displayName,
            zdrojZaznam: "Pokladňa #" + currentEntry.field("ID")
        });
        
        utils.addDebug(currentEntry, "    ✅ Úplná úhrada: " + utils.formatMoney(suma));
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processFullPayment", error);
    }
}

function processPartialPayment(zavazok, suma, ownerInfo) {
    try {
        var zostatok = utils.safeGet(zavazok, CONFIG.fields.obligations.balance, 0);
        var pvodneZaplatene = utils.safeGet(zavazok, CONFIG.fields.obligations.paid, 0);
        var noveZaplatene = pvodneZaplatene + suma;
        var novyZostatok = zostatok - suma;
        
        // Aktualizácia záväzku
        utils.safeSet(zavazok, CONFIG.fields.obligations.paid, noveZaplatene);
        utils.safeSet(zavazok, CONFIG.fields.obligations.balance, novyZostatok);
        utils.safeSet(zavazok, CONFIG.fields.obligations.state, CONFIG.constants.stavy.ciastocneUhradene);
        
        // Info záznam
        utils.addInfo(zavazok, "ČIASTOČNÁ ÚHRADA ZÁVÄZKU", {
            suma: suma,
            zostatok: novyZostatok,
            vlastnik: ownerInfo.displayName,
            zdrojZaznam: "Pokladňa #" + currentEntry.field("ID")
        });
        
        utils.addDebug(currentEntry, "    🔄 Čiastočná úhrada: " + utils.formatMoney(suma) + 
                     ", zostáva: " + utils.formatMoney(novyZostatok));
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processPartialPayment", error);
    }
}

// ==============================================
// KROK 5: SPRACOVANIE PREPLATKU
// ==============================================

function processOverpayment(preplatokSuma, typPreplatku, ownerInfo) {
    try {
        utils.addDebug(currentEntry, "Spracovávam preplatok: " + utils.formatMoney(preplatokSuma));
        
        if (!typPreplatku) {
            utils.addDebug(currentEntry, "  ⚠️ Typ preplatku nie je nastavený", "warning");
            return { success: false };
        }
        
        var result = { success: false };
        
        switch (typPreplatku) {
            case CONFIG.constants.typyPreplatku.pohladavka:
                result = createReceivableFromOverpayment(preplatokSuma, ownerInfo);
                break;
                
            case CONFIG.constants.typyPreplatku.zaloha:
                result = createAdvancePayment(preplatokSuma, ownerInfo);
                break;
                
            case CONFIG.constants.typyPreplatku.premia:
                result = createBonusPayment(preplatokSuma, ownerInfo);
                break;
                
            default:
                utils.addError(currentEntry, "Neznámy typ preplatku: " + typPreplatku, "processOverpayment");
        }
        
        if (result.success) {
            utils.addDebug(currentEntry, "✅ Preplatok spracovaný ako: " + typPreplatku);
        }
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processOverpayment", error);
        return { success: false };
    }
}

// ==============================================
// FUNKCIE PRE VYTVORENIE PREPLATKOV
// ==============================================

function createReceivableFromOverpayment(suma, ownerInfo) {
    try {
        var pohladavkyLib = libByName(CONFIG.libraries.receivables);
        if (!pohladavkyLib) {
            utils.addError(currentEntry, "Knižnica Pohľadávky nenájdená", "createReceivableFromOverpayment");
            return { success: false };
        }
        
        var novaPohladavka = pohladavkyLib.create({});
        
        // Nastavenie základných údajov
        utils.safeSet(novaPohladavka, CONFIG.fields.receivables.date, moment().toDate());
        utils.safeSet(novaPohladavka, CONFIG.fields.receivables.type, "Preplatok z úhrady záväzkov");
        utils.safeSet(novaPohladavka, CONFIG.fields.receivables.state, CONFIG.constants.stavy.neuhradene);
        utils.safeSet(novaPohladavka, CONFIG.fields.receivables.amount, suma);
        utils.safeSet(novaPohladavka, CONFIG.fields.receivables.paid, 0);
        utils.safeSet(novaPohladavka, CONFIG.fields.receivables.balance, suma);
        
        // Nastavenie vlastníka
        if (ownerInfo.type === "employee") {
            utils.safeSet(novaPohladavka, CONFIG.fields.receivables.employee, [ownerInfo.owner]);
        } else if (ownerInfo.type === "supplier") {
            utils.safeSet(novaPohladavka, CONFIG.fields.receivables.supplier, [ownerInfo.owner]);
        } else if (ownerInfo.type === "partner") {
            utils.safeSet(novaPohladavka, CONFIG.fields.receivables.partner, [ownerInfo.owner]);
        } else if (ownerInfo.type === "client") {
            utils.safeSet(novaPohladavka, CONFIG.fields.receivables.client, [ownerInfo.owner]);
        }
        
        // Popis
        var popis = "Preplatok z úhrady záväzkov - " + ownerInfo.displayName;
        utils.safeSet(novaPohladavka, CONFIG.fields.receivables.description, popis);
        
        // Info záznam
        utils.addInfo(novaPohladavka, "AUTOMATICKY VYTVORENÁ POHĽADÁVKA", {
            dovod: "Preplatok z úhrady záväzkov",
            suma: suma,
            vlastnik: ownerInfo.displayName,
            zdrojZaznam: "Pokladňa #" + currentEntry.field("ID"),
            zdrojKniznica: CONFIG.libraries.cashBook
        });
        
        // Linknutie pohľadávky na pokladňu
        var existingPohladavky = utils.safeGetLinks(currentEntry, CONFIG.fields.pohladavky) || [];
        existingPohladavky.push(novaPohladavka);
        utils.safeSet(currentEntry, CONFIG.fields.pohladavky, existingPohladavky);
        
        utils.addDebug(currentEntry, "  ✅ Vytvorená pohľadávka #" + novaPohladavka.field("ID"));
        
        return { success: true, pohladavka: novaPohladavka };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createReceivableFromOverpayment", error);
        return { success: false };
    }
}

function createAdvancePayment(suma, ownerInfo) {
    try {
        // Pre zálohu vytvárame aj pohľadávku a nový pokladničný záznam
        var pohladavkaResult = createReceivableFromOverpayment(suma, ownerInfo);
        if (!pohladavkaResult.success) {
            return { success: false };
        }
        
        // Vytvorenie nového pokladničného záznamu pre zálohu
        var pokladnaLib = libByName(CONFIG.libraries.cashBook);
        if (!pokladnaLib) {
            utils.addError(currentEntry, "Knižnica Pokladňa nenájdená", "createAdvancePayment");
            return { success: false };
        }
        
        var novyZaznam = pokladnaLib.create({});
        
        // Nastavenie údajov
        utils.safeSet(novyZaznam, CONFIG.fields.cashBook.date, moment().toDate());
        utils.safeSet(novyZaznam, CONFIG.fields.cashBook.transactionType, CONFIG.constants.pohyb.vydavok);
        utils.safeSet(novyZaznam, CONFIG.fields.cashBook.sum, suma);
        
        // Účel výdaja
        var ucelVydaja = CONFIG.constants.ucelVydaja.ostatneVydavky;
        if (ownerInfo.type === "employee") {
            ucelVydaja = CONFIG.constants.ucelVydaja.mzdaZaloha;
        }
        utils.safeSet(novyZaznam, "Účel výdaja", ucelVydaja);
        
        // Popis platby
        var popisZalohy = ownerInfo.displayName + ", záloha na mzdu";
        utils.safeSet(novyZaznam, "Popis platby", popisZalohy);
        
        // Vlastník
        if (ownerInfo.type === "employee") {
            utils.safeSet(novyZaznam, CONFIG.fields.cashBook.employee, [ownerInfo.owner]);
        } else if (ownerInfo.type === "supplier") {
            utils.safeSet(novyZaznam, CONFIG.fields.cashBook.supplier, [ownerInfo.owner]);
        }
        
        // Prepojenie s pohľadávkou
        utils.safeSet(novyZaznam, CONFIG.fields.pohladavky, [pohladavkaResult.pohladavka]);
        
        // Z pokladne
        var zPokladne = utils.safeGetLinks(currentEntry, "Z pokladne");
        if (zPokladne && zPokladne.length > 0) {
            utils.safeSet(novyZaznam, "Z pokladne", zPokladne);
        }
        
        // Info záznam
        utils.addInfo(novyZaznam, "AUTOMATICKY VYTVORENÁ ZÁLOHA", {
            dovod: "Preplatok z úhrady záväzkov",
            suma: suma,
            vlastnik: ownerInfo.displayName,
            zdrojZaznam: "Pokladňa #" + currentEntry.field("ID")
        });
        
        utils.addDebug(currentEntry, "  ✅ Vytvorený pokladničný záznam pre zálohu #" + novyZaznam.field("ID"));
        
        return { success: true, pohladavka: pohladavkaResult.pohladavka, pokladna: novyZaznam };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createAdvancePayment", error);
        return { success: false };
    }
}

function createBonusPayment(suma, ownerInfo) {
    try {
        // Pre prémiu vytvárame nový pokladničný záznam
        var pokladnaLib = libByName(CONFIG.libraries.cashBook);
        if (!pokladnaLib) {
            utils.addError(currentEntry, "Knižnica Pokladňa nenájdená", "createBonusPayment");
            return { success: false };
        }
        
        var novyZaznam = pokladnaLib.create({});
        
        // Nastavenie údajov
        utils.safeSet(novyZaznam, CONFIG.fields.cashBook.date, moment().toDate());
        utils.safeSet(novyZaznam, CONFIG.fields.cashBook.transactionType, CONFIG.constants.pohyb.vydavok);
        utils.safeSet(novyZaznam, CONFIG.fields.cashBook.sum, suma);
        utils.safeSet(novyZaznam, "Účel výdaja", CONFIG.constants.ucelVydaja.mzdaPremia);
        
        // Popis platby
        var popis = ownerInfo.displayName + ", prémia z preplatku";
        utils.safeSet(novyZaznam, "Popis platby", popis);
        
        // Vlastník
        if (ownerInfo.type === "employee") {
            utils.safeSet(novyZaznam, CONFIG.fields.cashBook.employee, [ownerInfo.owner]);
        }
        
        // Z pokladne
        var zPokladne = utils.safeGetLinks(currentEntry, "Z pokladne");
        if (zPokladne && zPokladne.length > 0) {
            utils.safeSet(novyZaznam, "Z pokladne", zPokladne);
        }
        
        // Info záznam
        utils.addInfo(novyZaznam, "AUTOMATICKY VYTVORENÁ PRÉMIA", {
            dovod: "Preplatok z úhrady záväzkov",
            suma: suma,
            vlastnik: ownerInfo.displayName,
            zdrojZaznam: "Pokladňa #" + currentEntry.field("ID")
        });
        
        utils.addDebug(currentEntry, "  ✅ Vytvorený pokladničný záznam pre prémiu #" + novyZaznam.field("ID"));
        
        return { success: true, pokladna: novyZaznam };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createBonusPayment", error);
        return { success: false };
    }
}

// ==============================================
// KROK 6: FINALIZÁCIA TRANSAKCIE
// ==============================================

function finalizeTransaction(dostupnaSuma, paymentResult, ownerInfo, usedReceivables) {
    try {
        utils.addDebug(currentEntry, "Finalizujem transakciu...");
        
        // Nastavenie vlastníka v pokladni
        clearOwnerFields();
        setOwnerField(ownerInfo);
        
        // Vytvorenie popisu platby
        var datumyStr = "";
        if (paymentResult.datumyZavazkov && paymentResult.datumyZavazkov.length > 0) {
            var uniqueDates = [];
            for (var i = 0; i < paymentResult.datumyZavazkov.length; i++) {
                if (uniqueDates.indexOf(paymentResult.datumyZavazkov[i]) === -1) {
                    uniqueDates.push(paymentResult.datumyZavazkov[i]);
                }
            }
            datumyStr = uniqueDates.join(", ");
        }
        
        var popis = generatePaymentDescription(ownerInfo, datumyStr);
        utils.safeSet(currentEntry, "Popis platby", popis);
        
        // Nastavenie účelu výdaja
        var ucelVydaja = CONFIG.constants.ucelVydaja.ostatneVydavky;
        if (ownerInfo.type === "employee") {
            ucelVydaja = CONFIG.constants.ucelVydaja.mzda;
        } else if (ownerInfo.type === "supplier") {
            ucelVydaja = CONFIG.constants.ucelVydaja.fakturyDodavatelov;
        }
        utils.safeSet(currentEntry, "Účel výdaja", ucelVydaja);
        
        // Info záznam
        var infoData = {
            suma: dostupnaSuma,
            vlastnik: ownerInfo.displayName,
            uhradenychZavazkov: paymentResult.uhradeneZavazky.length,
            preplatok: paymentResult.preplatokSuma
        };
        
        if (usedReceivables > 0) {
            infoData.pouzitePohladavky = usedReceivables;
        }
        
        utils.addInfo(currentEntry, "ÚHRADA ZÁVÄZKOV DOKONČENÁ", infoData);
        
        utils.addDebug(currentEntry, "✅ Transakcia finalizovaná");
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "finalizeTransaction", error);
    }
}

// ==============================================
// POMOCNÉ FUNKCIE PRE FINALIZÁCIU
// ==============================================

function clearOwnerFields() {
    try {
        utils.safeSet(currentEntry, CONFIG.fields.cashBook.employee, []);
        utils.safeSet(currentEntry, CONFIG.fields.cashBook.supplier, []);
        utils.safeSet(currentEntry, CONFIG.fields.cashBook.partner, []);
        utils.safeSet(currentEntry, CONFIG.fields.cashBook.client || "Klient", []);
    } catch (error) {
        utils.addDebug(currentEntry, "  ⚠️ Niektoré polia vlastníkov sa nepodarilo vymazať", "warning");
    }
}

function setOwnerField(ownerInfo) {
    try {
        if (ownerInfo.type === "employee") {
            utils.safeSet(currentEntry, CONFIG.fields.cashBook.employee, [ownerInfo.owner]);
        } else if (ownerInfo.type === "supplier") {
            utils.safeSet(currentEntry, CONFIG.fields.cashBook.supplier, [ownerInfo.owner]);
        } else if (ownerInfo.type === "partner") {
            utils.safeSet(currentEntry, CONFIG.fields.cashBook.partner, [ownerInfo.owner]);
        } else if (ownerInfo.type === "client") {
            utils.safeSet(currentEntry, CONFIG.fields.cashBook.client || "Klient", [ownerInfo.owner]);
        }
        
        utils.addDebug(currentEntry, "  ✅ Nastavený " + ownerInfo.type + ": " + ownerInfo.displayName);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri nastavení vlastníka", "setOwnerField", error);
    }
}

function generatePaymentDescription(ownerInfo, datumyStr) {
    var popis = ownerInfo.displayName;
    
    if (ownerInfo.type === "employee") {
        // Pokús sa získať Nick
        var nick = utils.safeGet(ownerInfo.owner, "Nick");
        if (nick) {
            popis = "Mzda " + nick;
        }
    }
    
    popis += ", úhrada záväzkov";
    
    if (datumyStr) {
        popis += " zo " + datumyStr;
    }
    
    return popis;
}

// ==============================================
// ZÁVEREČNÉ FUNKCIE
// ==============================================

function generateFinalReport(originalAmount, preplatokSuma, paymentResult, ownerInfo, typPreplatku, usedReceivables) {
    try {
        var finalUsedAmount = originalAmount - preplatokSuma;
        
        var report = utils.getIcon("success") + " ÚHRADA ZÁVÄZKOV DOKONČENÁ (v" + CONFIG.version + ")\n\n";
        report += "👤 Vlastník: " + ownerInfo.displayName + "\n";
        
        if (usedReceivables > 0) {
            report += utils.getIcon("money") + " Použité pohľadávky: " + utils.formatMoney(usedReceivables) + "\n";
            report += utils.getIcon("money") + " Zadaná suma: " + utils.formatMoney(originalAmount - usedReceivables) + "\n";
            report += utils.getIcon("money") + " Celková suma na úhrady: " + utils.formatMoney(originalAmount) + "\n";
        } else {
            report += utils.getIcon("money") + " Pôvodná suma: " + utils.formatMoney(originalAmount) + "\n";
        }
        
        report += "📋 Uhradené záväzky: " + paymentResult.uhradeneZavazky.length + "\n";
        report += "💵 Použitá suma na úhrady: " + utils.formatMoney(finalUsedAmount) + "\n";
        
        if (preplatokSuma > 0) {
            report += "\n" + utils.getIcon("create") + " Preplatok: " + utils.formatMoney(preplatokSuma) + "\n";
            
            if (typPreplatku === CONFIG.constants.typyPreplatku.pohladavka) {
                report += "📝 Vytvorená pohľadávka\n";
            } else if (typPreplatku === CONFIG.constants.typyPreplatku.zaloha) {
                report += "📝 Vytvorené:\n";
                report += "  • Pohľadávka\n";
                report += "  • Pokladňa - záloha na mzdu\n";
            } else if (typPreplatku === CONFIG.constants.typyPreplatku.premia) {
                report += "📝 Vytvorený pokladničný záznam - prémia\n";
            }
        } else {
            report += "\n✅ Bez preplatku - presná suma\n";
        }
        
        report += "\n📊 Detaily v Debug_Log a info poliach";
        
        return report;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "generateFinalReport", error);
        return "❌ Chyba pri generovaní reportu";
    }
}

function logFinalSummary(steps) {
    try {
        utils.addDebug(currentEntry, "\n🎯 === SÚHRN SPRACOVANIA ===");
        
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
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
var dependencyCheck = utils.checkDependencies(['config', 'core', 'business']);
if (!dependencyCheck.success) {
    message("❌ Chýbajú potrebné moduly: " + dependencyCheck.missing.join(", "));
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
    cancel();
}