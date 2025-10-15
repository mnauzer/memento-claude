// ==============================================
// ZÁKAZKY - Prepočet (MODULE VERSION)
// Verzia: 2.4.0 | Dátum: 2025-10-14 | Autor: ASISTANTO
// Knižnica: Zákazky
// Použitie: OrderCalculate.orderCalculate(entry());
// ==============================================
// 🔧 CHANGELOG v2.4.0 (2025-10-14):
//    - ✨ NOVÝ VÝPOČET: DPH = Celkom × (Sadzba DPH / 100)
//      → Číta sadzbu DPH z poľa "Sadzba DPH" (fields.vatRate)
//      → Ak je sadzba 0% alebo Celkom = 0, DPH = 0
//    - ✨ NOVÝ VÝPOČET: Celkom s DPH = Celkom + DPH
//      → Ukladá sa do poľa "Celkom s DPH" (fields.totalWithVat)
//    - 📋 NOVÝ KROK 8: Výpočet DPH
//    - 📋 NOVÝ KROK 9: Výpočet Celkom s DPH
//    - 💾 SAVE: Ukladajú sa nové polia vat a totalWithVat
//    - 📝 IMPROVEMENT: SÚHRN ZÁKAZKY obsahuje DPH a Celkom s DPH
// 🔧 CHANGELOG v2.3.3 (2025-10-14):
//    - ✨ NOVÁ FUNKCIA: calculateTransportPrice(spent) - výpočet Cena dopravy
//      → Podporuje metódy: Neúčtovať, % zo zákazky (zo Spotrebované!), Pevná cena
//    - ✨ NOVÁ FUNKCIA: calculateMassTransferPrice(spent) - výpočet Cena presunu hmôt
//      → Podporuje metódy: Neúčtovať, % zo zákazky (zo Spotrebované!), Pevná cena
//    - 🔧 CRITICAL FIX: Percentá dopravy a presunu hmôt sa počítajú zo SPOTREBOVANÉ
//      → Predtým neboli implementované vôbec
//      → Teraz počítajú zo skutočne dodaného množstva (Spotrebované), nie z Rozpočet
//    - ✨ NOVÝ VÝPOČET: Celkom = Spotrebované + Cena dopravy + Cena presunu hmôt
//    - 📝 IMPROVEMENT: Rozšírený debug output s cenami dopravy, presunu hmôt a celkom
// 🔧 CHANGELOG v2.3.2 (2025-10-14):
//    - 🐛 CRITICAL FIX: calculateBudget() odstránená logika createAddendum
//      → Rozpočet = vždy len z Diely alebo Diely HZS (podľa typu zákazky)
//      → Rozpočet subdodávky = vždy z poľa Subdodávky (bez podmienok)
//      → Subdodávky sa NIKDY nepripočítavajú k Rozpočtu
//    - ✅ FIX: Rozpočet subdodávky už nie je nulový
//    - 📝 SIMPLIFICATION: Jednoduché počítanie bez kontroly checkbox "Subdodávka"
//      → Len spočíta záznamy v príslušnom poli (Diely/Diely HZS/Subdodávky)
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
//    - IMPROVEMENT: Lepšie error handling s názvami polí
// ==============================================
// 📋 FUNKCIA:
//    - Exportovaná funkcia orderCalculate(orderEntry) pre použitie z iných scriptov
//    - Automatický prepočet všetkých dielov pomocou OrderDielyCalculate.partCalculate()
//    - Podporuje polia: Diely, Diely HZS, Subdodávky
//    - Počíta Rozpočet = suma "Celkom CP" z ALEBO Diely ALEBO Diely HZS
//      (závisí od "Typ zákazky": Hodinovka → Diely HZS, Položky → Diely)
//    - Počíta Rozpočet subdodávky = suma "Celkom CP" z poľa Subdodávky (vždy)
//    - Počíta Spotrebované = suma "Celkom" z ALEBO Diely ALEBO Diely HZS
//      (závisí od "Typ zákazky": Hodinovka → Diely HZS, Položky → Diely)
//    - Počíta Spotrebované subdodávky = suma "Celkom" z poľa Subdodávky (vždy)
//    - Počíta Zostatok = Rozpočet - Spotrebované
//    - Počíta Zostatok subdodávky = Rozpočet subdodávky - Spotrebované subdodávky
//    - Počíta Cena dopravy = % zo Spotrebované (skutočné dodané množstvo)
//    - Počíta Cena presunu hmôt = % zo Spotrebované (skutočné dodané množstvo)
//    - Počíta Celkom = Spotrebované + Cena dopravy + Cena presunu hmôt
//    - Počíta DPH = Celkom × (Sadzba DPH / 100)
//    - Počíta Celkom s DPH = Celkom + DPH
//    - Jednoduché počítanie: len spočíta záznamy v príslušnom poli (bez kontroly checkbox)
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
            version: "2.4.0",
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
         * Rozpočet = ALEBO Diely ALEBO Diely HZS (podľa typu zákazky)
         * Rozpočet subdodávky = vždy z poľa Subdodávky
         * @returns {Object} - { budget: Number, budgetSubcontracts: Number }
         */
        function calculateBudget() {
            try {
                addDebug(currentEntry, "  💰 Výpočet rozpočtu (z poľa Celkom CP dielov)");

                // Zisti typ zákazky: Hodinovka alebo Položky
                var orderType = utils.safeGet(currentEntry, fields.orderCalculationType) || "Položky";
                addDebug(currentEntry, "    ⚙️ Typ zákazky: " + orderType);

                // Podľa typu zákazky vyber správne pole (ALEBO Diely ALEBO Diely HZS)
                var regularFields;
                if (orderType === "Hodinovka") {
                    regularFields = [{ name: "Diely HZS", fieldName: fields.partsHzs }];
                    addDebug(currentEntry, "    📋 Počítam rozpočet z poľa: Diely HZS");
                } else {
                    // Položky, Externá, Reklamácia alebo iné
                    regularFields = [{ name: "Diely", fieldName: fields.parts }];
                    addDebug(currentEntry, "    📋 Počítam rozpočet z poľa: Diely");
                }

                // Rozpočet = len z Diely alebo Diely HZS (podľa typu)
                var budget = sumPartsField(regularFields, orderPartFields.totalSumCp, true);

                // Rozpočet subdodávky = vždy z poľa Subdodávky (bez ohľadu na nastavenia)
                var subcontractFields = [{ name: "Subdodávky", fieldName: fields.subcontracts }];
                var budgetSubcontracts = sumPartsField(subcontractFields, orderPartFields.totalSumCp, true);

                addDebug(currentEntry, "    ✅ Rozpočet: " + budget.toFixed(2) + " €");
                addDebug(currentEntry, "    ✅ Rozpočet subdodávky: " + budgetSubcontracts.toFixed(2) + " €");

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

        /**
         * Spočíta cenu dopravy podľa metódy účtovania
         * Pri metóde "% zo zákazky" počíta zo Spotrebované (skutočné dodané množstvo)
         * @param {Number} spent - Spotrebovaná suma (základ pre percentuálny výpočet)
         * @returns {Number} - Cena dopravy
         */
        function calculateTransportPrice(spent) {
            try {
                addDebug(currentEntry, "  🚗 Výpočet ceny dopravy");

                var rideCalc = utils.safeGet(currentEntry, fields.rideCalculation) || "Neúčtovať";
                addDebug(currentEntry, "    ⚙️ Typ účtovania: " + rideCalc);

                var transportPrice = 0;

                // ========== NEÚČTOVAŤ ==========
                if (rideCalc === "Neúčtovať" || !rideCalc) {
                    addDebug(currentEntry, "    ✅ Cena dopravy: 0.00 € (Neúčtovať)");
                    return 0;
                }

                // ========== PERCENTO ZO ZÁKAZKY ==========
                else if (rideCalc === "% zo zákazky") {
                    var transportPercentage = utils.safeGet(currentEntry, fields.transportPercentage) || 0;

                    if (transportPercentage <= 0) {
                        addDebug(currentEntry, "    ⚠️ Doprava %: 0%");
                        return 0;
                    }

                    transportPrice = spent * (transportPercentage / 100);
                    addDebug(currentEntry, "    📊 Výpočet: " + spent.toFixed(2) + " € (Spotrebované) × " + transportPercentage + "%");
                    addDebug(currentEntry, "    ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
                }

                // ========== PEVNÁ CENA ==========
                else if (rideCalc === "Pevná cena") {
                    transportPrice = utils.safeGet(currentEntry, fields.fixedTransportPrice) || 0;

                    if (transportPrice <= 0) {
                        addDebug(currentEntry, "    ⚠️ Pole 'Doprava pevná cena' nie je vyplnené");
                        return 0;
                    }

                    addDebug(currentEntry, "    ✅ Cena dopravy: " + transportPrice.toFixed(2) + " € (Pevná cena)");
                }

                // ========== INÉ METÓDY (Paušál, Km) ==========
                else {
                    addDebug(currentEntry, "    ⚠️ Metóda '" + rideCalc + "' nie je podporovaná v Order.Calculate");
                    addDebug(currentEntry, "    ℹ️ Zadajte cenu manuálne do poľa 'Doprava pevná cena'");
                    return 0;
                }

                return transportPrice;

            } catch (error) {
                var errorMsg = "Chyba pri výpočte ceny dopravy: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                addError(currentEntry, errorMsg, "calculateTransportPrice", error);
                throw error;
            }
        }

        /**
         * Spočíta cenu presunu hmôt podľa metódy účtovania
         * Pri metóde "% zo zákazky" počíta zo Spotrebované (skutočné dodané množstvo)
         * @param {Number} spent - Spotrebovaná suma (základ pre percentuálny výpočet)
         * @returns {Number} - Cena presunu hmôt
         */
        function calculateMassTransferPrice(spent) {
            try {
                addDebug(currentEntry, "  📦 Výpočet ceny presunu hmôt");

                var massTransferCalc = utils.safeGet(currentEntry, fields.massTransferCalculation) || "Neúčtovať";
                addDebug(currentEntry, "    ⚙️ Typ účtovania: " + massTransferCalc);

                var massTransferPrice = 0;

                // ========== NEÚČTOVAŤ ==========
                if (massTransferCalc === "Neúčtovať" || !massTransferCalc) {
                    addDebug(currentEntry, "    ✅ Cena presunu hmôt: 0.00 € (Neúčtovať)");
                    return 0;
                }

                // ========== PERCENTO ZO ZÁKAZKY ==========
                else if (massTransferCalc === "% zo zákazky") {
                    var massTransferPercentage = utils.safeGet(currentEntry, fields.massTransferPercentage) || 0;

                    if (massTransferPercentage <= 0) {
                        addDebug(currentEntry, "    ⚠️ Presun hmôt %: 0%");
                        return 0;
                    }

                    massTransferPrice = spent * (massTransferPercentage / 100);
                    addDebug(currentEntry, "    📊 Výpočet: " + spent.toFixed(2) + " € (Spotrebované) × " + massTransferPercentage + "%");
                    addDebug(currentEntry, "    ✅ Cena presunu hmôt: " + massTransferPrice.toFixed(2) + " €");
                }

                // ========== PEVNÁ CENA ==========
                else if (massTransferCalc === "Pevná cena") {
                    massTransferPrice = utils.safeGet(currentEntry, fields.fixedMassTransferPrice) || 0;

                    if (massTransferPrice <= 0) {
                        addDebug(currentEntry, "    ⚠️ Pole 'Pevná cena presunu hmôt' nie je vyplnené");
                        return 0;
                    }

                    addDebug(currentEntry, "    ✅ Cena presunu hmôt: " + massTransferPrice.toFixed(2) + " € (Pevná cena)");
                }

                // ========== INÉ METÓDY (Paušál, Podľa hmotnosti) ==========
                else {
                    addDebug(currentEntry, "    ⚠️ Metóda '" + massTransferCalc + "' nie je podporovaná v Order.Calculate");
                    addDebug(currentEntry, "    ℹ️ Zadajte cenu manuálne do poľa 'Pevná cena presunu hmôt'");
                    return 0;
                }

                return massTransferPrice;

            } catch (error) {
                var errorMsg = "Chyba pri výpočte ceny presunu hmôt: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                addError(currentEntry, errorMsg, "calculateMassTransferPrice", error);
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
            addDebug(currentEntry, "");

            // Krok 5: Výpočet ceny dopravy (% zo Spotrebované)
            addDebug(currentEntry, "📋 KROK 5: Výpočet ceny dopravy");
            var transportPrice = calculateTransportPrice(spent);
            addDebug(currentEntry, "");

            // Krok 6: Výpočet ceny presunu hmôt (% zo Spotrebované)
            addDebug(currentEntry, "📋 KROK 6: Výpočet ceny presunu hmôt");
            var massTransferPrice = calculateMassTransferPrice(spent);
            addDebug(currentEntry, "");

            // Krok 7: Výpočet celkovej sumy
            addDebug(currentEntry, "📋 KROK 7: Výpočet celkovej sumy");
            var total = spent + transportPrice + massTransferPrice;
            addDebug(currentEntry, "    📊 Výpočet: " + spent.toFixed(2) + " € (Spotrebované) + " +
                                                    transportPrice.toFixed(2) + " € (Doprava) + " +
                                                    massTransferPrice.toFixed(2) + " € (Presun hmôt)");
            addDebug(currentEntry, "    ✅ Celkom: " + total.toFixed(2) + " €");
            addDebug(currentEntry, "");

            // Krok 8: Výpočet DPH
            addDebug(currentEntry, "📋 KROK 8: Výpočet DPH");
            var vatRate = utils.safeGet(currentEntry, fields.vatRate) || 0;
            addDebug(currentEntry, "    ⚙️ Sadzba DPH: " + vatRate + "%");

            var vat = 0;
            if (vatRate > 0 && total > 0) {
                vat = total * (vatRate / 100);
                addDebug(currentEntry, "    📊 Výpočet: " + total.toFixed(2) + " € (Celkom) × " + vatRate + "%");
                addDebug(currentEntry, "    ✅ DPH: " + vat.toFixed(2) + " €");
            } else {
                addDebug(currentEntry, "    ℹ️ DPH sa nepočíta (sadzba DPH = 0% alebo Celkom = 0 €)");
                addDebug(currentEntry, "    ✅ DPH: 0.00 €");
            }
            addDebug(currentEntry, "");

            // Krok 9: Výpočet Celkom s DPH
            addDebug(currentEntry, "📋 KROK 9: Výpočet Celkom s DPH");
            var totalWithVat = total + vat;
            addDebug(currentEntry, "    📊 Výpočet: " + total.toFixed(2) + " € (Celkom) + " + vat.toFixed(2) + " € (DPH)");
            addDebug(currentEntry, "    ✅ Celkom s DPH: " + totalWithVat.toFixed(2) + " €");
            addDebug(currentEntry, "");

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

            if (!utils.safeSet(currentEntry, fields.transportPrice, transportPrice)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'transportPrice' (" + fields.transportPrice + ")");
            }

            if (!utils.safeSet(currentEntry, fields.massTransferPrice, massTransferPrice)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'massTransferPrice' (" + fields.massTransferPrice + ")");
            }

            if (!utils.safeSet(currentEntry, fields.total, total)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'total' (" + fields.total + ")");
            }

            if (!utils.safeSet(currentEntry, fields.vat, vat)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'vat' (" + fields.vat + ")");
            }

            if (!utils.safeSet(currentEntry, fields.totalWithVat, totalWithVat)) {
                addDebug(currentEntry, "  ❌ Nepodarilo sa nastaviť pole 'totalWithVat' (" + fields.totalWithVat + ")");
            }

            addDebug(currentEntry, "");
            addDebug(currentEntry, "=".repeat(50));
            addDebug(currentEntry, "💰 SÚHRN ZÁKAZKY:");
            addDebug(currentEntry, "  • Rozpočet (z CP):  " + budgetResult.budget.toFixed(2) + " €");
            addDebug(currentEntry, "  • Spotrebované:     " + spent.toFixed(2) + " €");
            addDebug(currentEntry, "  • Cena dopravy:     " + transportPrice.toFixed(2) + " €");
            addDebug(currentEntry, "  • Cena presunu hmôt:" + massTransferPrice.toFixed(2) + " €");
            addDebug(currentEntry, "  " + "-".repeat(48));
            addDebug(currentEntry, "  • CELKOM:           " + total.toFixed(2) + " €");
            addDebug(currentEntry, "  • DPH (" + vatRate.toFixed(0) + "%):        " + vat.toFixed(2) + " €");
            addDebug(currentEntry, "  • CELKOM s DPH:     " + totalWithVat.toFixed(2) + " €");
            addDebug(currentEntry, "  " + "-".repeat(48));
            addDebug(currentEntry, "  • ZOSTATOK:         " + remaining.toFixed(2) + " €");
            addDebug(currentEntry, "");
            if (budgetResult.budgetSubcontracts > 0 || spentSubcontracts > 0) {
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
