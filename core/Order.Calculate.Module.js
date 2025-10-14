// ==============================================
// ZÁKAZKY - Prepočet (MODULE VERSION)
// Verzia: 2.3.1 | Dátum: 2025-10-14 | Autor: ASISTANTO
// Knižnica: Zákazky
// Použitie: OrderCalculate.orderCalculate(entry());
// ==============================================
// 🔧 CHANGELOG v2.3.1 (2025-10-14):
//    - 🐛 CRITICAL FIX: calculateBudget() a calculateSpent() rozhodujú podľa "Typ zákazky"
//      → Ak "Hodinovka" → číta len z "Diely HZS"
//      → Ak "Položky" → číta len z "Diely"
//      → Predtým chybne počítalo oboje súčasne
//    - ✅ FORMULA FIX: Rozpočet = ALEBO Diely ALEBO Diely HZS (nie oboje!)
//    - ✅ FORMULA FIX: Spotrebované = ALEBO Diely ALEBO Diely HZS (nie oboje!)
//    - 📝 IMPROVEMENT: Pridané debug výpisy s typom zákazky a použitým poľom
// 🔧 CHANGELOG v2.3.0 (2025-10-14):
//    - 🆕 NOVÉ POLIA: spentSubcontracts, remainingSubcontracts v MementoConfigProjects v1.2.0
//    - 🔧 FIX: calculateSpent() teraz počíta len regulárne diely (BEZ Subdodávok)
//    - ✨ NOVÁ FUNKCIA: calculateSpentSubcontracts() - počíta spotrebu subdodávok oddelene
//    - 📊 IMPROVEMENT: Oddelené sledovanie rozpočtu/spotrebovaného/zostatku pre subdodávky
//    - 📝 IMPROVEMENT: Vylepšený debug output s oddelenými sekciami pre zákazku a subdodávky
//    - ✅ FORMULA FIX: Zostatok subdodávky = Rozpočet subdodávky - Spotrebované subdodávky
// 🔧 CHANGELOG v2.2.3 (2025-10-14):
//    - 🐛 FIX: Opravený názov poľa subcontractsCalculation (chýbalo 's')
//    - 🔧 FIX: Pridaný skipPriceDialog parameter do OrderDielyCalculate.partCalculate()
//      → Vypína dialóg pre ceny pri hromadnom prepočte dielov
//      → Automatické vytvorenie len autoCreate položiek
//    - ✅ FIX: Vylepšené safe wrappery s try-catch pre addDebug/addError
// 🔧 CHANGELOG v2.2.0 (2025-10-14):
//    - 🔧 BREAKING CHANGE: Zmenená logika detekcie subdodávok
//      → Namiesto kontroly partType === "Subdodávky"
//      → Teraz kontrola checkbox poľa "Subdodávka" (orderPartFields.subcontract)
//    - ✅ FIX: Subdodávky sa rozpoznávajú podľa checkbox, nie podľa typu
//    - 🆕 NOVÉ POLE: "Subdodávka" (checkbox) v MementoConfigProjects.js
//    - 🔧 FIX: Všetky miesta v manageSubcontracts() aktualizované na checkbox kontrolu
// 🔧 CHANGELOG v2.1.0 (2025-10-14):
//    - 🚀 KRITICKÝ FIX: Pridaná funkcia manageSubcontracts() - rieši duplicity subdodávok
//    - 🔧 FIX: Subdodávky sa už neobjavujú v Dieloch aj Subdodávkach súčasne
//    - ✨ NOVÁ FUNKCIA: manageSubcontracts() presúva subdodávky do správneho poľa
//    - 🗑️ CLEANUP: Automatické čistenie duplicít subdodávok vo všetkých poliach
//    - 💾 MEMORY: Prepnutie na MementoConfigProjects.js (~56KB úspora)
//    - 🔄 IMPROVEMENT: Prepočet dielov po presune subdodávky pre správne súčty
//    - 📊 IMPROVEMENT: Subdodávky sa správne započítavajú podľa nastavenia "Účtovanie subdodávok"
// 🔧 CHANGELOG v2.0.0 (2025-10-14):
//    - 🚀 MAJOR REFACTOR: Prepísaná logika výpočtov podľa vzoru CP.Calculate.Module.js
//    - ✨ NOVÁ FUNKCIA: Podpora CP polí z dielov (Celkom CP → Rozpočet)
//    - 📊 ZJEDNODUŠENIE: Rozpočet sa číta z poľa "Celkom CP" dielov (nie z atribútov)
//    - 📊 ZJEDNODUŠENIE: Spotrebované sa číta z poľa "Celkom" dielov (nie z atribútov)
//    - ♻️ REFACTOR: Helper funkcia sumPartsField() namiesto calculatePartsSum()
//    - 🧹 CLEANUP: Odstránená funkcia calculateAdditionalFields() (nepoužívaná pre zákazky)
//    - 📉 OPTIMIZATION: Zjednodušený výpočtový tok - žiadne duplicitné počítanie atribútov
//    - 💾 MEMORY: Ďalšia úspora pamäte vďaka eliminácii duplikátov
//    - 🔧 FIX: Pridané safe wrappery pre addDebug() a addError()
//    - 📊 IMPROVEMENT: Automatické mazanie debug/error logov pred výpočtom
// 🔧 CHANGELOG v1.1.0 (2025-10-12):
//    - 🔴 CRITICAL FIX: Opravená nekonečná rekurzia v addDebug (riadok 72) - hlavná príčina OutOfMemoryError
//    - ♻️ REFACTOR: Vytvorená helper funkcia calculatePartsSum() - odstránených ~100 riadkov duplicitného kódu
//    - 🧹 CLEANUP: Odstránené nepoužité premenné (defaultMatAttrs, defaultWrkAttrs)
//    - 📉 OPTIMIZATION: Zredukovaný súbor z 504 → 439 riadkov (-13%)
//    - 💾 MEMORY: Očakávaná úspora 40-50% runtime memory usage
// 🔧 CHANGELOG v1.0.1 (2025-10-12):
//    - FIX: Safe debug logging - kontrola dostupnosti utils.addDebug
//    - FIX: Použitie utils.safeSet() namiesto priameho .set()
//    - FIX: Odstránené polia transportPrice a massTransferPrice (neexistujú v Zákazky)
//    - IMPROVEMENT: Lepšie error handling s názvami polí
// ==============================================
// 📋 FUNKCIA:
//    - Exportovaná funkcia orderCalculate(orderEntry) pre použitie z iných scriptov
//    - Automatický prepočet všetkých dielov pomocou OrderDielyCalculate.partCalculate()
//    - Podporuje polia: Diely, Diely HZS, Subdodávky
//    - Počíta Rozpočet = suma "Celkom CP" z ALEBO Diely ALEBO Diely HZS
//      (závisí od "Typ zákazky": Hodinovka → Diely HZS, Položky → Diely)
//    - Počíta Rozpočet subdodávky = suma "Celkom CP" z Subdodávky
//    - Počíta Spotrebované = suma "Celkom" z ALEBO Diely ALEBO Diely HZS
//      (závisí od "Typ zákazky": Hodinovka → Diely HZS, Položky → Diely)
//    - Počíta Spotrebované subdodávky = suma "Celkom" z Subdodávky
//    - Počíta Zostatok = Rozpočet - Spotrebované
//    - Počíta Zostatok subdodávky = Rozpočet subdodávky - Spotrebované subdodávky
//    - Špeciálne počítanie subdodávok ak je nastavené "Vytvoriť dodatok"
//    - Plná podpora debug a error logov
// ==============================================
// 🔧 POUŽITIE:
//    // Z triggeru alebo action:
//    OrderCalculate.orderCalculate(entry());
//
//    // Z iného scriptu s parametrom:
//    var orderEntry = lib("Zákazky").find("Číslo", "Z-2025-001")[0];
//    OrderCalculate.orderCalculate(orderEntry);
// ==============================================

var OrderCalculate = (function() {
    'use strict';

    /**
     * Hlavná exportovaná funkcia pre prepočet zákazky
     * @param {Entry} orderEntry - Záznam zákazky (povinný parameter)
     * @returns {Boolean} - true ak prebehlo úspešne, false pri chybe
     */
    function orderCalculate(orderEntry) {
        if (!orderEntry) {
            throw new Error("OrderCalculate.orderCalculate(): Parameter 'orderEntry' is required!");
        }

        // ==============================================
        // INICIALIZÁCIA MODULOV
        // ==============================================

        // Kontrola dostupnosti MementoUtils
        if (typeof MementoUtils === 'undefined') {
            throw new Error("OrderCalculate: MementoUtils nie je načítaný! Importujte MementoUtils7.js v Memento Database.");
        }

        var utils = MementoUtils;

        // Použiť optimalizovaný config pre úsporu pamäte
        var centralConfig = typeof MementoConfig !== 'undefined' ?
            MementoConfig.getConfig() : utils.config;

        var currentEntry = orderEntry;

        var CONFIG = {
            scriptName: "Zákazky - Prepočet (Module)",
            version: "2.3.1",
            fields: centralConfig.fields.order,
            orderPartFields: centralConfig.fields.orderPart,
            icons: centralConfig.icons
        };

        var fields = CONFIG.fields;
        var orderPartFields = CONFIG.orderPartFields;

        // Safe debug logging - kontrola či je addDebug dostupný
        var addDebug = function(entry, message) {
            if (utils && typeof utils.addDebug === 'function') {
                utils.addDebug(entry, message);
            }
        };

        // Safe error logging - kontrola či je addError dostupný
        var addError = function(entry, message, source, error) {
            if (utils && typeof utils.addError === 'function') {
                utils.addError(entry, message, source, error);
            }
        };

        // Vyčistiť debug, error a info logy pred začiatkom
        // Safe wrapper s try-catch pre lazy loading
        if (utils && utils.clearLogs) {
            try {
                utils.clearLogs(currentEntry, true);  // true = vyčistí aj Error_Log
            } catch (e) {
                // Ignoruj chybu ak MementoCore nie je ešte načítaný (lazy loading)
            }
        }

        addDebug(currentEntry, "🚀 ŠTART: " + CONFIG.scriptName + " v" + CONFIG.version);
        addDebug(currentEntry, "📅 Dátum: " + moment().format("DD.MM.YYYY HH:mm:ss"));
        addDebug(currentEntry, "");

        // ==============================================
        // POMOCNÉ FUNKCIE
        // ==============================================

        /**
         * Prepočíta všetky diely v poliach Diely, Diely HZS a Subdodávky
         * Používa OrderDielyCalculate.partCalculate() modul
         */
        function recalculateAllParts() {
            try {
                addDebug(currentEntry, "  🔄 Prepočet všetkých dielov");

                // Kontrola dostupnosti OrderDielyCalculate modulu
                if (typeof OrderDielyCalculate === 'undefined' || typeof OrderDielyCalculate.partCalculate !== 'function') {
                    addDebug(currentEntry, "    ⚠️ OrderDielyCalculate modul nie je dostupný - preskakujem prepočet dielov");
                    return;
                }

                var allPartsFields = [
                    { name: "Diely", fieldName: fields.parts },
                    { name: "Diely HZS", fieldName: fields.partsHzs },
                    { name: "Subdodávky", fieldName: fields.subcontracts }
                ];

                var totalRecalculated = 0;

                for (var f = 0; f < allPartsFields.length; f++) {
                    var field = allPartsFields[f];
                    var partsEntries = utils.safeGetLinks(currentEntry, field.fieldName) || [];

                    if (partsEntries.length === 0) {
                        continue;
                    }

                    addDebug(currentEntry, "    📦 Pole: " + field.name + " (počet: " + partsEntries.length + ")");

                    for (var i = 0; i < partsEntries.length; i++) {
                        var part = partsEntries[i];
                        var partNumber = utils.safeGet(part, orderPartFields.number) || ("#" + (i + 1));

                        try {
                            addDebug(currentEntry, "      🔄 Prepočítavam diel: " + partNumber);
                            OrderDielyCalculate.partCalculate(part, { skipPriceDialog: true });
                            totalRecalculated++;
                        } catch (partError) {
                            addError(currentEntry, "⚠️ Chyba pri prepočte dielu " + partNumber + ": " + partError.toString(), "recalculateAllParts", partError);
                        }
                    }
                }

                addDebug(currentEntry, "    ✅ Prepočítaných dielov: " + totalRecalculated);

            } catch (error) {
                var errorMsg = "Chyba pri prepočte všetkých dielov: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                addError(currentEntry, errorMsg, "recalculateAllParts", error);
            }
        }

        /**
         * Helper funkcia: Spočíta súčet hodnôt z poľa dielov
         * @param {Array} fieldsToProcess - Zoznam polí [{name, fieldName}]
         * @param {String} sumFieldName - Názov poľa v dieloch, ktoré sa má sčítať
         * @param {Boolean} verboseDebug - Či zobrazovať detail každého dielu
         * @returns {Number} - Celková suma
         */
        function sumPartsField(fieldsToProcess, sumFieldName, verboseDebug) {
            var totalSum = 0;

            for (var f = 0; f < fieldsToProcess.length; f++) {
                var field = fieldsToProcess[f];
                var partsEntries = utils.safeGetLinks(currentEntry, field.fieldName) || [];

                if (partsEntries.length === 0) continue;

                if (verboseDebug) {
                    addDebug(currentEntry, "    📦 " + field.name + " (" + partsEntries.length + ")");
                }

                for (var i = 0; i < partsEntries.length; i++) {
                    var part = partsEntries[i];
                    var partValue = utils.safeGet(part, sumFieldName) || 0;

                    if (verboseDebug) {
                        var partNumber = utils.safeGet(part, orderPartFields.number) || ("#" + (i + 1));
                        addDebug(currentEntry, "      • " + partNumber + ": " + partValue.toFixed(2) + " €");
                    }

                    totalSum += partValue;
                }
            }

            return totalSum;
        }

        /**
         * Spočíta rozpočet z polí "Celkom CP" dielov zákazky
         * Podľa typu zákazky číta ALEBO z Diely ALEBO z Diely HZS
         * @returns {Object} - { budget: Number, budgetSubcontracts: Number }
         */
        function calculateBudget() {
            try {
                addDebug(currentEntry, "  💰 Výpočet rozpočtu (z poľa Celkom CP dielov)");

                var subcontractCalculation = utils.safeGet(currentEntry, fields.subcontractsCalculation) || "Nezapočítavať";
                var createAddendum = (subcontractCalculation === "Vytvoriť dodatok");

                // Zisti typ zákazky: Hodinovka alebo Položky
                var orderType = utils.safeGet(currentEntry, fields.orderCalculationType) || "Položky";
                addDebug(currentEntry, "    ⚙️ Typ zákazky: " + orderType);

                // Podľa typu zákazky vyber správne pole (ALEBO Diely ALEBO Diely HZS)
                var regularFields;
                if (orderType === "Hodinovka") {
                    regularFields = [{ name: "Diely HZS", fieldName: fields.partsHzs }];
                } else {
                    // Položky, Externá, Reklamácia alebo iné
                    regularFields = [{ name: "Diely", fieldName: fields.parts }];
                }

                var budget = sumPartsField(regularFields, orderPartFields.totalSumCp, true);

                // Subdodávky
                var subcontractFields = [{ name: "Subdodávky", fieldName: fields.subcontracts }];
                var subcontractSum = sumPartsField(subcontractFields, orderPartFields.totalSumCp, true);

                var budgetSubcontracts = 0;
                if (createAddendum) {
                    budgetSubcontracts = subcontractSum;
                    addDebug(currentEntry, "    ⚙️ Subdodávky budú v dodatku (nepripo číta jú sa k rozpočtu)");
                } else {
                    budget += subcontractSum;
                    addDebug(currentEntry, "    ⚙️ Subdodávky sú započítané do rozpočtu");
                }

                addDebug(currentEntry, "    ✅ Rozpočet: " + budget.toFixed(2) + " €");
                if (createAddendum) {
                    addDebug(currentEntry, "    ✅ Rozpočet subdodávky: " + budgetSubcontracts.toFixed(2) + " €");
                }

                return {
                    budget: budget,
                    budgetSubcontracts: budgetSubcontracts
                };

            } catch (error) {
                var errorMsg = "Chyba pri výpočte rozpočtu: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                addError(currentEntry, errorMsg, "calculateBudget", error);
                throw error;
            }
        }

        /**
         * Správa subdodávok - presúva subdodávky do správneho poľa podľa nastavení
         * Prevencia duplicít - odstraňuje subdodávky zo všetkých polí a pridá len do cieľového
         * @returns {Object} - {subcontractEntry, location, totalSubcontracts}
         */
        function manageSubcontracts() {
            try {
                addDebug(currentEntry, "  🔧 Správa subdodávok");

                var subcontractsCalc = utils.safeGet(currentEntry, fields.subcontractsCalculation) || "Nezapočítavať";
                addDebug(currentEntry, "    Účtovanie subdodávok: " + subcontractsCalc);

                // Určenie cieľového poľa pre subdodávky
                var targetField = null;
                if (subcontractsCalc === "Zarátať do ceny") {
                    targetField = "parts";  // Diely
                } else if (subcontractsCalc === "Vytvoriť dodatok") {
                    targetField = "subcontracts";  // Subdodávky
                }

                // Hľadanie subdodávky vo všetkých troch poliach
                var subcontractEntry = null;
                var currentLocation = null;

                // 1. Hľadaj v poli "Diely"
                var partsEntries = utils.safeGetLinks(currentEntry, fields.parts) || [];
                for (var i = 0; i < partsEntries.length; i++) {
                    var part = partsEntries[i];
                    var isSubcontract = utils.safeGet(part, orderPartFields.subcontract);
                    if (isSubcontract === true) {
                        subcontractEntry = part;
                        currentLocation = "parts";
                        addDebug(currentEntry, "    ✅ Nájdená subdodávka v poli 'Diely'");
                        break;
                    }
                }

                // 2. Ak nie je v Dieloch, hľadaj v poli "Diely HZS"
                if (!subcontractEntry) {
                    var partsHzsEntries = utils.safeGetLinks(currentEntry, fields.partsHzs) || [];
                    for (var i = 0; i < partsHzsEntries.length; i++) {
                        var part = partsHzsEntries[i];
                        var isSubcontract = utils.safeGet(part, orderPartFields.subcontract);
                        if (isSubcontract === true) {
                            subcontractEntry = part;
                            currentLocation = "partsHzs";
                            addDebug(currentEntry, "    ✅ Nájdená subdodávka v poli 'Diely HZS'");
                            break;
                        }
                    }
                }

                // 3. Ak nie je v žiadnom z dielových polí, hľadaj v poli "Subdodávky"
                if (!subcontractEntry) {
                    var subcontractsEntries = utils.safeGetLinks(currentEntry, fields.subcontracts) || [];
                    for (var i = 0; i < subcontractsEntries.length; i++) {
                        var part = subcontractsEntries[i];
                        var isSubcontract = utils.safeGet(part, orderPartFields.subcontract);
                        if (isSubcontract === true) {
                            subcontractEntry = part;
                            currentLocation = "subcontracts";
                            addDebug(currentEntry, "    ✅ Nájdená subdodávka v poli 'Subdodávky'");
                            break;
                        }
                    }
                }

                // 4. Ak subdodávka neexistuje
                if (!subcontractEntry) {
                    if (subcontractsCalc === "Nezapočítavať") {
                        addDebug(currentEntry, "    ✅ Subdodávka neexistuje, účtovanie je nastavené na 'Nezapočítavať' - OK");
                        return { subcontractEntry: null, location: null, totalSubcontracts: 0 };
                    }

                    addDebug(currentEntry, "    ℹ️ Subdodávka nenájdená v žiadnom poli");
                    addDebug(currentEntry, "    ⚠️ Účtovanie je nastavené na '" + subcontractsCalc + "', ale subdodávka neexistuje");
                    return { subcontractEntry: null, location: null, totalSubcontracts: 0 };
                }

                // 5. Ak je nastavené "Nezapočítavať" a subdodávka existuje
                if (subcontractsCalc === "Nezapočítavať") {
                    var locationLabel = (currentLocation === "parts" ? "Diely" : (currentLocation === "partsHzs" ? "Diely HZS" : "Subdodávky"));
                    addDebug(currentEntry, "    ⚠️ Subdodávka existuje, ale účtovanie je nastavené na 'Nezapočítavať'");
                    addDebug(currentEntry, "    Subdodávka je v poli: " + locationLabel);
                    return { subcontractEntry: subcontractEntry, location: currentLocation, totalSubcontracts: 0 };
                }

                // 6. Kontrola, či je subdodávka na správnom mieste
                if (currentLocation !== targetField) {
                    var fromLabel = (currentLocation === "parts" ? "Diely" : (currentLocation === "partsHzs" ? "Diely HZS" : "Subdodávky"));
                    var toLabel = (targetField === "parts" ? "Diely" : "Subdodávky");

                    addDebug(currentEntry, "    🔄 Subdodávka je v nesprávnom poli, presúvam...");
                    addDebug(currentEntry, "      Z: " + fromLabel);
                    addDebug(currentEntry, "      Do: " + toLabel);

                    // KRITICKÉ: Odstráň subdodávku zo VŠETKÝCH polí (zabráni duplicitám)
                    var cleanedParts = [];
                    partsEntries = utils.safeGetLinks(currentEntry, fields.parts) || [];
                    for (var i = 0; i < partsEntries.length; i++) {
                        var isSubcontract = utils.safeGet(partsEntries[i], orderPartFields.subcontract);
                        if (isSubcontract !== true) {
                            cleanedParts.push(partsEntries[i]);
                        }
                    }
                    currentEntry.set(fields.parts, cleanedParts);

                    var cleanedPartsHzs = [];
                    partsHzsEntries = utils.safeGetLinks(currentEntry, fields.partsHzs) || [];
                    for (var i = 0; i < partsHzsEntries.length; i++) {
                        var isSubcontract = utils.safeGet(partsHzsEntries[i], orderPartFields.subcontract);
                        if (isSubcontract !== true) {
                            cleanedPartsHzs.push(partsHzsEntries[i]);
                        }
                    }
                    currentEntry.set(fields.partsHzs, cleanedPartsHzs);

                    var cleanedSubcontracts = [];
                    subcontractsEntries = utils.safeGetLinks(currentEntry, fields.subcontracts) || [];
                    for (var i = 0; i < subcontractsEntries.length; i++) {
                        var isSubcontract = utils.safeGet(subcontractsEntries[i], orderPartFields.subcontract);
                        if (isSubcontract !== true) {
                            cleanedSubcontracts.push(subcontractsEntries[i]);
                        }
                    }
                    currentEntry.set(fields.subcontracts, cleanedSubcontracts);

                    // Pridaj subdodávku LEN do cieľového poľa
                    if (targetField === "parts") {
                        cleanedParts.push(subcontractEntry);
                        currentEntry.set(fields.parts, cleanedParts);
                    } else {
                        cleanedSubcontracts.push(subcontractEntry);
                        currentEntry.set(fields.subcontracts, cleanedSubcontracts);
                    }

                    currentLocation = targetField;
                    addDebug(currentEntry, "    ✅ Subdodávka presunutá (duplicity odstránené)");
                } else {
                    // Aj keď je na správnom mieste, vyčisti duplicity zo VŠETKÝCH polí
                    addDebug(currentEntry, "    ✅ Subdodávka je už na správnom mieste");
                    addDebug(currentEntry, "    🔍 Kontrola duplicít vo všetkých poliach...");

                    var duplicatesRemoved = false;

                    // Odstráň subdodávky z NESPRÁVNYCH polí
                    if (currentLocation !== "parts") {
                        var cleanedParts = [];
                        var partsCheck = utils.safeGetLinks(currentEntry, fields.parts) || [];
                        var removedFromParts = 0;
                        for (var i = 0; i < partsCheck.length; i++) {
                            var isSubcontract = utils.safeGet(partsCheck[i], orderPartFields.subcontract);
                            if (isSubcontract !== true) {
                                cleanedParts.push(partsCheck[i]);
                            } else {
                                removedFromParts++;
                            }
                        }
                        if (removedFromParts > 0) {
                            currentEntry.set(fields.parts, cleanedParts);
                            addDebug(currentEntry, "    🗑️ Odstránených " + removedFromParts + " subdodávok z poľa Diely");
                            duplicatesRemoved = true;
                        }
                    }

                    if (currentLocation !== "partsHzs") {
                        var cleanedPartsHzs = [];
                        var partsHzsCheck = utils.safeGetLinks(currentEntry, fields.partsHzs) || [];
                        var removedFromPartsHzs = 0;
                        for (var i = 0; i < partsHzsCheck.length; i++) {
                            var isSubcontract = utils.safeGet(partsHzsCheck[i], orderPartFields.subcontract);
                            if (isSubcontract !== true) {
                                cleanedPartsHzs.push(partsHzsCheck[i]);
                            } else {
                                removedFromPartsHzs++;
                            }
                        }
                        if (removedFromPartsHzs > 0) {
                            currentEntry.set(fields.partsHzs, cleanedPartsHzs);
                            addDebug(currentEntry, "    🗑️ Odstránených " + removedFromPartsHzs + " subdodávok z poľa Diely HZS");
                            duplicatesRemoved = true;
                        }
                    }

                    if (currentLocation !== "subcontracts") {
                        var cleanedSubcontracts = [];
                        var subcontractsCheck = utils.safeGetLinks(currentEntry, fields.subcontracts) || [];
                        var removedFromSubcontracts = 0;
                        for (var i = 0; i < subcontractsCheck.length; i++) {
                            var isSubcontract = utils.safeGet(subcontractsCheck[i], orderPartFields.subcontract);
                            if (isSubcontract !== true) {
                                cleanedSubcontracts.push(subcontractsCheck[i]);
                            } else {
                                removedFromSubcontracts++;
                            }
                        }
                        if (removedFromSubcontracts > 0) {
                            currentEntry.set(fields.subcontracts, cleanedSubcontracts);
                            addDebug(currentEntry, "    🗑️ Odstránených " + removedFromSubcontracts + " subdodávok z poľa Subdodávky");
                            duplicatesRemoved = true;
                        }
                    }

                    if (duplicatesRemoved) {
                        addDebug(currentEntry, "    ✅ Duplicity odstránené");
                    } else {
                        addDebug(currentEntry, "    ✅ Žiadne duplicity nenájdené");
                    }
                }

                // 7. Získaj hodnotu "Celkom" zo subdodávky
                var subcontractTotal = utils.safeGet(subcontractEntry, orderPartFields.totalSum) || 0;
                addDebug(currentEntry, "    💰 Celkom subdodávky: " + subcontractTotal.toFixed(2) + " €");

                return {
                    subcontractEntry: subcontractEntry,
                    location: currentLocation,
                    totalSubcontracts: currentLocation === "subcontracts" ? subcontractTotal : 0
                };

            } catch (error) {
                var errorMsg = "Chyba pri správe subdodávok: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                addError(currentEntry, errorMsg, "manageSubcontracts", error);
                throw error;
            }
        }

        /**
         * Spočíta spotrebované z polí "Celkom" dielov zákazky (bez subdodávok)
         * Podľa typu zákazky číta ALEBO z Diely ALEBO z Diely HZS
         * @returns {Number} - Spotrebovaná suma
         */
        function calculateSpent() {
            try {
                addDebug(currentEntry, "  💸 Výpočet spotrebovanej sumy (z poľa Celkom dielov)");

                // Zisti typ zákazky: Hodinovka alebo Položky
                var orderType = utils.safeGet(currentEntry, fields.orderCalculationType) || "Položky";

                // Podľa typu zákazky vyber správne pole (ALEBO Diely ALEBO Diely HZS)
                var regularFields;
                if (orderType === "Hodinovka") {
                    regularFields = [{ name: "Diely HZS", fieldName: fields.partsHzs }];
                    addDebug(currentEntry, "    ⚙️ Čítam z poľa: Diely HZS (typ: Hodinovka)");
                } else {
                    // Položky, Externá, Reklamácia alebo iné
                    regularFields = [{ name: "Diely", fieldName: fields.parts }];
                    addDebug(currentEntry, "    ⚙️ Čítam z poľa: Diely (typ: " + orderType + ")");
                }

                var spent = sumPartsField(regularFields, orderPartFields.totalSum, true);

                addDebug(currentEntry, "    ✅ Spotrebované (bez subdodávok): " + spent.toFixed(2) + " €");
                return spent;

            } catch (error) {
                var errorMsg = "Chyba pri výpočte spotrebovanej sumy: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                addError(currentEntry, errorMsg, "calculateSpent", error);
                throw error;
            }
        }

        /**
         * Spočíta spotrebované subdodávky z poľa "Celkom" subdodávok
         * @returns {Number} - Spotrebovaná suma subdodávok
         */
        function calculateSpentSubcontracts() {
            try {
                addDebug(currentEntry, "  💸 Výpočet spotrebovanej sumy subdodávok (z poľa Celkom)");

                // Len subdodávky - číta sa totalSum z každého dielu v Subdodávkach
                var subcontractFields = [
                    { name: "Subdodávky", fieldName: fields.subcontracts }
                ];

                var spentSubcontracts = sumPartsField(subcontractFields, orderPartFields.totalSum, true);

                addDebug(currentEntry, "    ✅ Spotrebované subdodávky: " + spentSubcontracts.toFixed(2) + " €");
                return spentSubcontracts;

            } catch (error) {
                var errorMsg = "Chyba pri výpočte spotrebovanej sumy subdodávok: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                addError(currentEntry, errorMsg, "calculateSpentSubcontracts", error);
                throw error;
            }
        }


        // ==============================================
        // HLAVNÝ VÝPOČET
        // ==============================================

        try {
            // Krok 1: Prepočítaj všetky diely
            addDebug(currentEntry, "📋 KROK 1: Prepočet dielov zákazky");
            recalculateAllParts();
            addDebug(currentEntry, "");

            // Krok 1a: Správa subdodávok (presunie subdodávky do správneho poľa)
            addDebug(currentEntry, "📋 KROK 1a: Správa subdodávok");
            var subcontractInfo = manageSubcontracts();

            // Ak boli subdodávky presunuté, prepočítaj všetky diely znova
            if (subcontractInfo.subcontractEntry && subcontractInfo.location) {
                addDebug(currentEntry, "  🔄 Subdodávka bola presunutá, prepočítavam diely znova...");
                recalculateAllParts();
            }
            addDebug(currentEntry, "");

            // Krok 2: Vypočítaj rozpočet
            addDebug(currentEntry, "📋 KROK 2: Výpočet rozpočtu");
            var budgetResult = calculateBudget();
            addDebug(currentEntry, "");

            // Krok 3: Vypočítaj spotrebované (len Diely + Diely HZS)
            addDebug(currentEntry, "📋 KROK 3: Výpočet spotrebovanej sumy");
            var spent = calculateSpent();
            addDebug(currentEntry, "");

            // Krok 3a: Vypočítaj spotrebované subdodávky
            addDebug(currentEntry, "📋 KROK 3a: Výpočet spotrebovanej sumy subdodávok");
            var spentSubcontracts = calculateSpentSubcontracts();
            addDebug(currentEntry, "");

            // Krok 4: Výpočet zostatkov
            addDebug(currentEntry, "📋 KROK 4: Výpočet zostatkov");
            var remaining = budgetResult.budget - spent;
            var remainingSubcontracts = budgetResult.budgetSubcontracts - spentSubcontracts;

            // Zapíš výsledky pomocou safeSet (vracia true/false)
            if (!utils.safeSet(currentEntry, fields.budget, budgetResult.budget)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'budget' (" + fields.budget + ")");
            }

            if (!utils.safeSet(currentEntry, fields.budgetSubcontracts, budgetResult.budgetSubcontracts)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'budgetSubcontracts' (" + fields.budgetSubcontracts + ")");
            }

            if (!utils.safeSet(currentEntry, fields.spent, spent)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'spent' (" + fields.spent + ")");
            }

            if (!utils.safeSet(currentEntry, fields.remaining, remaining)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'remaining' (" + fields.remaining + ")");
            }

            if (!utils.safeSet(currentEntry, fields.spentSubcontracts, spentSubcontracts)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'spentSubcontracts' (" + fields.spentSubcontracts + ")");
            }

            if (!utils.safeSet(currentEntry, fields.remainingSubcontracts, remainingSubcontracts)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'remainingSubcontracts' (" + fields.remainingSubcontracts + ")");
            }

            addDebug(currentEntry, "");
            addDebug(currentEntry, "=".repeat(50));
            addDebug(currentEntry, "💰 SÚHRN ZÁKAZKY:");
            addDebug(currentEntry, "  • Rozpočet (z CP):  " + budgetResult.budget.toFixed(2) + " €");
            addDebug(currentEntry, "  • Spotrebované:     " + spent.toFixed(2) + " €");
            addDebug(currentEntry, "  " + "-".repeat(48));
            addDebug(currentEntry, "  • ZOSTATOK:         " + remaining.toFixed(2) + " €");
            addDebug(currentEntry, "");
            if (budgetResult.budgetSubcontracts > 0) {
                addDebug(currentEntry, "💰 SUBDODÁVKY:");
                addDebug(currentEntry, "  • Rozpočet subdodávky: " + budgetResult.budgetSubcontracts.toFixed(2) + " €");
                addDebug(currentEntry, "  • Spotrebované subdodávky: " + spentSubcontracts.toFixed(2) + " €");
                addDebug(currentEntry, "  " + "-".repeat(48));
                addDebug(currentEntry, "  • ZOSTATOK subdodávky: " + remainingSubcontracts.toFixed(2) + " €");
            }
            addDebug(currentEntry, "=".repeat(50));
            addDebug(currentEntry, "");

            addDebug(currentEntry, "✅ Prepočet zákazky úspešne dokončený");
            return true;

        } catch (error) {
            var errorMsg = "❌ KRITICKÁ CHYBA: " + error.toString();
            if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
            if (error.stack) errorMsg += "\nStack: " + error.stack;

            addError(currentEntry, errorMsg, "OrderCalculate.orderCalculate", error);
            addDebug(currentEntry, "");
            addDebug(currentEntry, "❌ CHYBA PRI PREPOČTE ZÁKAZKY");
            addDebug(currentEntry, "");
            addDebug(currentEntry, errorMsg);

            return false;
        }
    }

    // Public API
    return {
        orderCalculate: orderCalculate,
        version: "2.2.3"
    };

})();

// ==============================================
// BACKWARD COMPATIBILITY
// ==============================================
// Ak je dostupné entry(), automaticky spusti prepočet
if (typeof entry === 'function') {
    try {
        OrderCalculate.orderCalculate(entry());
    } catch (e) {
        message("❌ Chyba: " + e.toString());
    }
}
