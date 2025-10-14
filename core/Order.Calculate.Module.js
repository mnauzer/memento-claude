// ==============================================
// ZÁKAZKY - Prepočet (MODULE VERSION)
// Verzia: 2.0.0 | Dátum: 2025-10-14 | Autor: ASISTANTO
// Knižnica: Zákazky
// Použitie: OrderCalculate.orderCalculate(entry());
// ==============================================
// 🔧 CHANGELOG v2.0.0 (2025-10-14):
//    - 🚀 MAJOR REFACTOR: Prepísaná logika výpočtov podľa vzoru CP.Calculate.Module.js
//    - ✨ NOVÁ FUNKCIA: Podpora CP polí z dielov (Celkom CP → Rozpočet)
//    - 📊 ZJEDNODUŠENIE: Rozpočet sa číta z poľa "Celkom CP" dielov (nie z atribútov)
//    - 📊 ZJEDNODUŠENIE: Spotrebované sa číta z poľa "Celkom" dielov (nie z atribútov)
//    - ♻️ REFACTOR: Helper funkcia sumPartsField() namiesto calculatePartsSum()
//    - 🧹 CLEANUP: Odstránená funkcia calculateAdditionalFields() (nepoužívaná pre zákazky)
//    - 📉 OPTIMIZATION: Zjednodušený výpočtový tok - žiadne duplicitné počítanie atribútov
//    - 💾 MEMORY: Ďalšia úspora pamäte vďaka eliminácii duplikátov
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
//    - Počíta Rozpočet z polí "Celkom CP" dielov (OrderDielyCalculate v2.1.0)
//    - Počíta Spotrebované z polí "Celkom" dielov
//    - Počíta Zostatok (Rozpočet - Spotrebované)
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
        var centralConfig = utils.config;
        var currentEntry = orderEntry;

        var CONFIG = {
            scriptName: "Zákazky - Prepočet (Module)",
            version: "2.0.0",
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
                            OrderDielyCalculate.partCalculate(part);
                            totalRecalculated++;
                        } catch (partError) {
                            utils.addError(currentEntry, "⚠️ Chyba pri prepočte dielu " + partNumber + ": " + partError.toString(), "recalculateAllParts", partError);
                        }
                    }
                }

                addDebug(currentEntry, "    ✅ Prepočítaných dielov: " + totalRecalculated);

            } catch (error) {
                var errorMsg = "Chyba pri prepočte všetkých dielov: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                utils.addError(currentEntry, errorMsg, "recalculateAllParts", error);
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
         * @returns {Object} - { budget: Number, budgetSubcontracts: Number }
         */
        function calculateBudget() {
            try {
                addDebug(currentEntry, "  💰 Výpočet rozpočtu (z poľa Celkom CP dielov)");

                var subcontractCalculation = utils.safeGet(currentEntry, fields.subcontractCalculation) || "Nezapočítavať";
                var createAddendum = (subcontractCalculation === "Vytvoriť dodatok");

                // Diely a Diely HZS - číta sa totalSumCp z každého dielu
                var regularFields = [
                    { name: "Diely", fieldName: fields.parts },
                    { name: "Diely HZS", fieldName: fields.partsHzs }
                ];
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
                utils.addError(currentEntry, errorMsg, "calculateBudget", error);
                throw error;
            }
        }

        /**
         * Spočíta spotrebované z polí "Celkom" dielov zákazky
         * @returns {Number} - Spotrebovaná suma
         */
        function calculateSpent() {
            try {
                addDebug(currentEntry, "  💸 Výpočet spotrebovanej sumy (z poľa Celkom dielov)");

                // Všetky polia dielov - číta sa totalSum z každého dielu
                var allFields = [
                    { name: "Diely", fieldName: fields.parts },
                    { name: "Diely HZS", fieldName: fields.partsHzs },
                    { name: "Subdodávky", fieldName: fields.subcontracts }
                ];

                var spent = sumPartsField(allFields, orderPartFields.totalSum, true);

                addDebug(currentEntry, "    ✅ Spotrebované: " + spent.toFixed(2) + " €");
                return spent;

            } catch (error) {
                var errorMsg = "Chyba pri výpočte spotrebovanej sumy: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                utils.addError(currentEntry, errorMsg, "calculateSpent", error);
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

            // Krok 2: Vypočítaj rozpočet
            addDebug(currentEntry, "📋 KROK 2: Výpočet rozpočtu");
            var budgetResult = calculateBudget();
            addDebug(currentEntry, "");

            // Krok 3: Vypočítaj spotrebované
            addDebug(currentEntry, "📋 KROK 3: Výpočet spotrebovanej sumy");
            var spent = calculateSpent();
            addDebug(currentEntry, "");

            // Krok 4: Výpočet zostatku
            addDebug(currentEntry, "📋 KROK 4: Výpočet zostatku");
            var remaining = budgetResult.budget - spent;

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

            addDebug(currentEntry, "");
            addDebug(currentEntry, "=".repeat(50));
            addDebug(currentEntry, "💰 SÚHRN ZÁKAZKY:");
            addDebug(currentEntry, "  • Rozpočet (z CP):  " + budgetResult.budget.toFixed(2) + " €");
            if (budgetResult.budgetSubcontracts > 0) {
                addDebug(currentEntry, "  • Rozpočet subdodávky: " + budgetResult.budgetSubcontracts.toFixed(2) + " €");
            }
            addDebug(currentEntry, "  • Spotrebované:     " + spent.toFixed(2) + " €");
            addDebug(currentEntry, "  " + "-".repeat(48));
            addDebug(currentEntry, "  • ZOSTATOK:         " + remaining.toFixed(2) + " €");
            addDebug(currentEntry, "=".repeat(50));
            addDebug(currentEntry, "");

            addDebug(currentEntry, "✅ Prepočet zákazky úspešne dokončený");
            return true;

        } catch (error) {
            var errorMsg = "❌ KRITICKÁ CHYBA: " + error.toString();
            if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
            if (error.stack) errorMsg += "\nStack: " + error.stack;

            utils.addError(currentEntry, errorMsg, "OrderCalculate.orderCalculate", error);
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
        version: "2.0.0"
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
