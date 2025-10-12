// ==============================================
// ZÁKAZKY - Prepočet (MODULE VERSION)
// Verzia: 1.1.0 | Dátum: 2025-10-12 | Autor: ASISTANTO
// Knižnica: Zákazky
// Použitie: OrderCalculate.orderCalculate(entry());
// ==============================================
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
//    - Počíta Rozpočet (z atribútov množstvo cp * cena cp)
//    - Počíta Spotrebované (z atribútov množstvo * cena)
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
            version: "1.1.0",
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
         * Helper funkcia: Spočíta sumu z dielov použitím špecifikovaných atribútov
         * @param {Array} fieldsToProcess - Zoznam polí [{name, fieldName}]
         * @param {Object} materialAttrs - Atribúty pre materiály {quantity, price, totalPrice}
         * @param {Object} workAttrs - Atribúty pre práce {quantity, price, totalPrice}
         * @param {Boolean} verboseDebug - Či zobrazovať detail každého dielu
         * @returns {Number} - Celková suma
         */
        function calculatePartsSum(fieldsToProcess, materialAttrs, workAttrs, verboseDebug) {
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
                    var partSum = 0;

                    // Materiály
                    var materials = utils.safeGetLinks(part, orderPartFields.materials) || [];
                    for (var m = 0; m < materials.length; m++) {
                        var mat = materials[m];
                        var qty = mat.attr(materialAttrs.quantity) || 0;
                        var price = mat.attr(materialAttrs.price) || 0;
                        var total = qty * price;
                        mat.setAttr(materialAttrs.totalPrice, total);
                        partSum += total;
                    }

                    // Práce
                    var works = utils.safeGetLinks(part, orderPartFields.works) || [];
                    for (var w = 0; w < works.length; w++) {
                        var wrk = works[w];
                        var qty = wrk.attr(workAttrs.quantity) || 0;
                        var price = wrk.attr(workAttrs.price) || 0;
                        var total = qty * price;
                        wrk.setAttr(workAttrs.totalPrice, total);
                        partSum += total;
                    }

                    totalSum += partSum;
                }
            }

            return totalSum;
        }

        /**
         * Spočíta rozpočet z atribútov množstvo cp * cena cp = cena celkom cp
         * @returns {Object} - { budget: Number, budgetSubcontracts: Number }
         */
        function calculateBudget() {
            try {
                addDebug(currentEntry, "  💰 Výpočet rozpočtu (z atribútov CP)");

                var subcontractCalculation = utils.safeGet(currentEntry, fields.subcontractCalculation) || "Nezapočítavať";
                var createAddendum = (subcontractCalculation === "Vytvoriť dodatok");
                var orderMatAttrs = centralConfig.attributes.orderPartMaterials;
                var orderWrkAttrs = centralConfig.attributes.orderPartWorks;

                // Diely a Diely HZS
                var regularFields = [
                    { name: "Diely", fieldName: fields.parts },
                    { name: "Diely HZS", fieldName: fields.partsHzs }
                ];
                var budget = calculatePartsSum(regularFields, orderMatAttrs, orderWrkAttrs, false);

                // Subdodávky
                var subcontractFields = [{ name: "Subdodávky", fieldName: fields.subcontracts }];
                var subcontractSum = calculatePartsSum(subcontractFields, orderMatAttrs, orderWrkAttrs, false);

                var budgetSubcontracts = 0;
                if (createAddendum) {
                    budgetSubcontracts = subcontractSum;
                } else {
                    budget += subcontractSum;
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
         * Spočíta spotrebované z atribútov množstvo * cena = cena celkom
         * @returns {Number} - Spotrebovaná suma
         */
        function calculateSpent() {
            try {
                addDebug(currentEntry, "  💸 Výpočet spotrebovanej sumy (z skutočných atribútov)");

                // Atribúty pre skutočné hodnoty (nie CP atribúty)
                var actualMatAttrs = {
                    quantity: "množstvo",
                    price: "cena",
                    totalPrice: "cena celkom"
                };
                var actualWrkAttrs = {
                    quantity: "množstvo",
                    price: "cena",
                    totalPrice: "cena celkom"
                };

                var allFields = [
                    { name: "Diely", fieldName: fields.parts },
                    { name: "Diely HZS", fieldName: fields.partsHzs },
                    { name: "Subdodávky", fieldName: fields.subcontracts }
                ];

                var spent = calculatePartsSum(allFields, actualMatAttrs, actualWrkAttrs, false);

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

        /**
         * Vypočíta ďalšie polia zákazky (doprava, presun hmôt atď.)
         * Podobné ako v CP.Calculate.Module.js
         */
        function calculateAdditionalFields(budget) {
            try {
                addDebug(currentEntry, "  🚛 Výpočet dodatočných nákladov");

                var transportPrice = 0;
                var massTransferPrice = 0;

                // Doprava
                var rideCalculation = utils.safeGet(currentEntry, fields.rideCalculation) || "Nezapočítavať";
                if (rideCalculation !== "Nezapočítavať") {
                    if (rideCalculation === "Percentuálne") {
                        var transportPercentage = utils.safeGet(currentEntry, fields.transportPercentage) || 0;
                        transportPrice = budget * (transportPercentage / 100);
                    } else if (rideCalculation === "Paušál") {
                        var flatRateEntries = utils.safeGetLinks(currentEntry, fields.transportFlatRate) || [];
                        if (flatRateEntries.length > 0) {
                            transportPrice = utils.safeGet(flatRateEntries[0], "Cena") || 0;
                        }
                    } else if (rideCalculation === "Fixná suma") {
                        transportPrice = utils.safeGet(currentEntry, fields.fixedTransportPrice) || 0;
                    }
                }

                // Presun hmôt
                var massTransferCalculation = utils.safeGet(currentEntry, fields.massTransferCalculation) || "Nezapočítavať";
                if (massTransferCalculation !== "Nezapočítavať") {
                    if (massTransferCalculation === "Percentuálne") {
                        var massTransferPercentage = utils.safeGet(currentEntry, fields.massTransferPercentage) || 0;
                        massTransferPrice = budget * (massTransferPercentage / 100);
                    } else if (massTransferCalculation === "Paušál") {
                        var flatRateEntries = utils.safeGetLinks(currentEntry, fields.massTransferFlatRate) || [];
                        if (flatRateEntries.length > 0) {
                            massTransferPrice = utils.safeGet(flatRateEntries[0], "Cena") || 0;
                        }
                    } else if (massTransferCalculation === "Fixná suma") {
                        massTransferPrice = utils.safeGet(currentEntry, fields.massTransferFixedPrice) || 0;
                    }
                }

                addDebug(currentEntry, "    Doprava: " + transportPrice.toFixed(2) + " €");
                addDebug(currentEntry, "    Presun hmôt: " + massTransferPrice.toFixed(2) + " €");

                return {
                    transportPrice: transportPrice,
                    massTransferPrice: massTransferPrice
                };

            } catch (error) {
                var errorMsg = "Chyba pri výpočte dodatočných nákladov: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                utils.addError(currentEntry, errorMsg, "calculateAdditionalFields", error);
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

            // Krok 4: Vypočítaj dodatočné náklady
            addDebug(currentEntry, "📋 KROK 4: Výpočet dodatočných nákladov");
            var additional = calculateAdditionalFields(budgetResult.budget);
            addDebug(currentEntry, "");

            // Krok 5: Celkové sumy
            addDebug(currentEntry, "📋 KROK 5: Zápis výsledkov");

            var totalBudget = budgetResult.budget + additional.transportPrice + additional.massTransferPrice;
            var remaining = totalBudget - spent;

            // Zapíš výsledky pomocou safeSet (vracia true/false)
            if (!utils.safeSet(currentEntry, fields.budget, budgetResult.budget)) {
                addDebug(currentEntry, "❌ Nepodarilo sa nastaviť pole 'budget' (" + fields.budget + ")");
            }

            if (!utils.safeSet(currentEntry, fields.budgetSubcontracts, budgetResult.budgetSubcontracts)) {
                addDebug(currentEntry, "❌ Nepodarilo sa nastaviť pole 'budgetSubcontracts' (" + fields.budgetSubcontracts + ")");
            }

            if (!utils.safeSet(currentEntry, fields.spent, spent)) {
                addDebug(currentEntry, "❌ Nepodarilo sa nastaviť pole 'spent' (" + fields.spent + ")");
            }

            if (!utils.safeSet(currentEntry, fields.remaining, remaining)) {
                addDebug(currentEntry, "❌ Nepodarilo sa nastaviť pole 'remaining' (" + fields.remaining + ")");
            }

            // Polia transportPrice a massTransferPrice sú len v Cenové ponuky, nie v Zákazky
            // Pre Zákazky sa tieto údaje počítajú inak alebo nie sú potrebné

            addDebug(currentEntry, "  ✅ Rozpočet: " + budgetResult.budget.toFixed(2) + " €");
            if (budgetResult.budgetSubcontracts > 0) {
                addDebug(currentEntry, "  ✅ Rozpočet subdodávky: " + budgetResult.budgetSubcontracts.toFixed(2) + " €");
            }
            addDebug(currentEntry, "  ✅ Spotrebované: " + spent.toFixed(2) + " €");
            addDebug(currentEntry, "  ✅ Zostatok: " + remaining.toFixed(2) + " €");
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
        version: "1.1.0"
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
