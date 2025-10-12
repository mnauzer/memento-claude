// ==============================================
// ZÁKAZKY - Prepočet (MODULE VERSION)
// Verzia: 1.0.0 | Dátum: 2025-10-12 | Autor: ASISTANTO
// Knižnica: Zákazky
// Použitie: OrderCalculate.orderCalculate(entry());
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

        var utils = MementoUtils;
        var centralConfig = utils.config;
        var currentEntry = orderEntry;

        var CONFIG = {
            scriptName: "Zákazky - Prepočet (Module)",
            version: "1.0.0",
            fields: centralConfig.fields.order,
            orderPartFields: centralConfig.fields.orderPart,
            icons: centralConfig.icons
        };

        var fields = CONFIG.fields;
        var orderPartFields = CONFIG.orderPartFields;

        utils.addDebug(currentEntry, "🚀 ŠTART: " + CONFIG.scriptName + " v" + CONFIG.version);
        utils.addDebug(currentEntry, "📅 Dátum: " + moment().format("DD.MM.YYYY HH:mm:ss"));
        utils.addDebug(currentEntry, "");

        // ==============================================
        // POMOCNÉ FUNKCIE
        // ==============================================

        /**
         * Prepočíta všetky diely v poliach Diely, Diely HZS a Subdodávky
         * Používa OrderDielyCalculate.partCalculate() modul
         */
        function recalculateAllParts() {
            try {
                utils.addDebug(currentEntry, "  🔄 Prepočet všetkých dielov");

                // Kontrola dostupnosti OrderDielyCalculate modulu
                if (typeof OrderDielyCalculate === 'undefined' || typeof OrderDielyCalculate.partCalculate !== 'function') {
                    utils.addDebug(currentEntry, "    ⚠️ OrderDielyCalculate modul nie je dostupný - preskakujem prepočet dielov");
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

                    utils.addDebug(currentEntry, "    📦 Pole: " + field.name + " (počet: " + partsEntries.length + ")");

                    for (var i = 0; i < partsEntries.length; i++) {
                        var part = partsEntries[i];
                        var partNumber = utils.safeGet(part, orderPartFields.number) || ("#" + (i + 1));

                        try {
                            utils.addDebug(currentEntry, "      🔄 Prepočítavam diel: " + partNumber);
                            OrderDielyCalculate.partCalculate(part);
                            totalRecalculated++;
                        } catch (partError) {
                            utils.addError(currentEntry, "⚠️ Chyba pri prepočte dielu " + partNumber + ": " + partError.toString(), "recalculateAllParts", partError);
                        }
                    }
                }

                utils.addDebug(currentEntry, "    ✅ Prepočítaných dielov: " + totalRecalculated);

            } catch (error) {
                var errorMsg = "Chyba pri prepočte všetkých dielov: " + error.toString();
                if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
                if (error.stack) errorMsg += "\nStack: " + error.stack;
                utils.addError(currentEntry, errorMsg, "recalculateAllParts", error);
            }
        }

        /**
         * Spočíta rozpočet z atribútov množstvo cp * cena cp = cena celkom cp
         * @returns {Object} - { budget: Number, budgetSubcontracts: Number }
         */
        function calculateBudget() {
            try {
                utils.addDebug(currentEntry, "  💰 Výpočet rozpočtu (z atribútov CP)");

                var subcontractCalculation = utils.safeGet(currentEntry, fields.subcontractCalculation) || "Nezapočítavať";
                var createAddendum = (subcontractCalculation === "Vytvoriť dodatok");

                utils.addDebug(currentEntry, "    Účtovanie subdodávok: " + subcontractCalculation);

                var budget = 0;
                var budgetSubcontracts = 0;
                var orderMatAttrs = centralConfig.attributes.orderPartMaterials;
                var orderWrkAttrs = centralConfig.attributes.orderPartWorks;

                // Diely a Diely HZS
                var regularFields = [
                    { name: "Diely", fieldName: fields.parts },
                    { name: "Diely HZS", fieldName: fields.partsHzs }
                ];

                for (var f = 0; f < regularFields.length; f++) {
                    var field = regularFields[f];
                    var partsEntries = utils.safeGetLinks(currentEntry, field.fieldName) || [];

                    if (partsEntries.length === 0) continue;

                    utils.addDebug(currentEntry, "    📦 Pole: " + field.name + " (počet: " + partsEntries.length + ")");

                    for (var i = 0; i < partsEntries.length; i++) {
                        var part = partsEntries[i];
                        var partType = utils.safeGet(part, orderPartFields.partType) || ("Diel #" + (i + 1));
                        var partSum = 0;

                        // Spočítaj materiály z atribútov
                        var materials = utils.safeGetLinks(part, orderPartFields.materials) || [];
                        for (var m = 0; m < materials.length; m++) {
                            var mat = materials[m];
                            var qty = mat.attr(orderMatAttrs.quantity) || 0;
                            var price = mat.attr(orderMatAttrs.price) || 0;
                            var total = qty * price;
                            mat.setAttr(orderMatAttrs.totalPrice, total);
                            partSum += total;
                        }

                        // Spočítaj práce z atribútov
                        var works = utils.safeGetLinks(part, orderPartFields.works) || [];
                        for (var w = 0; w < works.length; w++) {
                            var wrk = works[w];
                            var qty = wrk.attr(orderWrkAttrs.quantity) || 0;
                            var price = wrk.attr(orderWrkAttrs.price) || 0;
                            var total = qty * price;
                            wrk.setAttr(orderWrkAttrs.totalPrice, total);
                            partSum += total;
                        }

                        utils.addDebug(currentEntry, "      • " + partType + ": " + partSum.toFixed(2) + " €");
                        budget += partSum;
                    }
                }

                // Subdodávky
                var subcontractParts = utils.safeGetLinks(currentEntry, fields.subcontracts) || [];
                if (subcontractParts.length > 0) {
                    utils.addDebug(currentEntry, "    📦 Pole: Subdodávky (počet: " + subcontractParts.length + ")");

                    for (var s = 0; s < subcontractParts.length; s++) {
                        var part = subcontractParts[s];
                        var partType = utils.safeGet(part, orderPartFields.partType) || ("Subdodávka #" + (s + 1));
                        var partSum = 0;

                        // Spočítaj materiály z atribútov
                        var materials = utils.safeGetLinks(part, orderPartFields.materials) || [];
                        for (var m = 0; m < materials.length; m++) {
                            var mat = materials[m];
                            var qty = mat.attr(orderMatAttrs.quantity) || 0;
                            var price = mat.attr(orderMatAttrs.price) || 0;
                            var total = qty * price;
                            mat.setAttr(orderMatAttrs.totalPrice, total);
                            partSum += total;
                        }

                        // Spočítaj práce z atribútov
                        var works = utils.safeGetLinks(part, orderPartFields.works) || [];
                        for (var w = 0; w < works.length; w++) {
                            var wrk = works[w];
                            var qty = wrk.attr(orderWrkAttrs.quantity) || 0;
                            var price = wrk.attr(orderWrkAttrs.price) || 0;
                            var total = qty * price;
                            wrk.setAttr(orderWrkAttrs.totalPrice, total);
                            partSum += total;
                        }

                        utils.addDebug(currentEntry, "      • " + partType + ": " + partSum.toFixed(2) + " €");

                        if (createAddendum) {
                            budgetSubcontracts += partSum;
                        } else {
                            budget += partSum;
                        }
                    }
                }

                utils.addDebug(currentEntry, "    ✅ Rozpočet: " + budget.toFixed(2) + " €");
                if (createAddendum) {
                    utils.addDebug(currentEntry, "    ✅ Rozpočet subdodávky: " + budgetSubcontracts.toFixed(2) + " €");
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
                utils.addDebug(currentEntry, "  💸 Výpočet spotrebovanej sumy (z skutočných atribútov)");

                var spent = 0;
                var defaultMatAttrs = centralConfig.attributes.orderPartMaterials;
                var defaultWrkAttrs = centralConfig.attributes.orderPartWorks;

                // Použijeme štandardné atribúty pre skutočné hodnoty
                // Ak máš iné názvy atribútov pre skutočné hodnoty, zmeň tu
                var actualMatAttrs = {
                    quantity: "množstvo",  // skutočné množstvo
                    price: "cena",         // skutočná cena
                    totalPrice: "cena celkom"  // skutočná cena celkom
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

                for (var f = 0; f < allFields.length; f++) {
                    var field = allFields[f];
                    var partsEntries = utils.safeGetLinks(currentEntry, field.fieldName) || [];

                    if (partsEntries.length === 0) continue;

                    utils.addDebug(currentEntry, "    📦 Pole: " + field.name + " (počet: " + partsEntries.length + ")");

                    for (var i = 0; i < partsEntries.length; i++) {
                        var part = partsEntries[i];
                        var partType = utils.safeGet(part, orderPartFields.partType) || ("Diel #" + (i + 1));
                        var partSum = 0;

                        // Spočítaj materiály z atribútov
                        var materials = utils.safeGetLinks(part, orderPartFields.materials) || [];
                        for (var m = 0; m < materials.length; m++) {
                            var mat = materials[m];
                            var qty = mat.attr(actualMatAttrs.quantity) || 0;
                            var price = mat.attr(actualMatAttrs.price) || 0;
                            var total = qty * price;
                            mat.setAttr(actualMatAttrs.totalPrice, total);
                            partSum += total;
                        }

                        // Spočítaj práce z atribútov
                        var works = utils.safeGetLinks(part, orderPartFields.works) || [];
                        for (var w = 0; w < works.length; w++) {
                            var wrk = works[w];
                            var qty = wrk.attr(actualWrkAttrs.quantity) || 0;
                            var price = wrk.attr(actualWrkAttrs.price) || 0;
                            var total = qty * price;
                            wrk.setAttr(actualWrkAttrs.totalPrice, total);
                            partSum += total;
                        }

                        utils.addDebug(currentEntry, "      • " + partType + ": " + partSum.toFixed(2) + " €");
                        spent += partSum;
                    }
                }

                utils.addDebug(currentEntry, "    ✅ Spotrebované: " + spent.toFixed(2) + " €");
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
                utils.addDebug(currentEntry, "  🚛 Výpočet dodatočných nákladov");

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

                utils.addDebug(currentEntry, "    Doprava: " + transportPrice.toFixed(2) + " €");
                utils.addDebug(currentEntry, "    Presun hmôt: " + massTransferPrice.toFixed(2) + " €");

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
            utils.addDebug(currentEntry, "📋 KROK 1: Prepočet dielov zákazky");
            recalculateAllParts();
            utils.addDebug(currentEntry, "");

            // Krok 2: Vypočítaj rozpočet
            utils.addDebug(currentEntry, "📋 KROK 2: Výpočet rozpočtu");
            var budgetResult = calculateBudget();
            utils.addDebug(currentEntry, "");

            // Krok 3: Vypočítaj spotrebované
            utils.addDebug(currentEntry, "📋 KROK 3: Výpočet spotrebovanej sumy");
            var spent = calculateSpent();
            utils.addDebug(currentEntry, "");

            // Krok 4: Vypočítaj dodatočné náklady
            utils.addDebug(currentEntry, "📋 KROK 4: Výpočet dodatočných nákladov");
            var additional = calculateAdditionalFields(budgetResult.budget);
            utils.addDebug(currentEntry, "");

            // Krok 5: Celkové sumy
            utils.addDebug(currentEntry, "📋 KROK 5: Zápis výsledkov");

            var totalBudget = budgetResult.budget + additional.transportPrice + additional.massTransferPrice;
            var remaining = totalBudget - spent;

            // Zapíš výsledky
            currentEntry.set(fields.budget, budgetResult.budget);
            currentEntry.set(fields.budgetSubcontracts, budgetResult.budgetSubcontracts);
            currentEntry.set(fields.spent, spent);
            currentEntry.set(fields.remaining, remaining);
            currentEntry.set(fields.transportPrice, additional.transportPrice);
            currentEntry.set(fields.massTransferPrice, additional.massTransferPrice);

            utils.addDebug(currentEntry, "  ✅ Rozpočet: " + budgetResult.budget.toFixed(2) + " €");
            if (budgetResult.budgetSubcontracts > 0) {
                utils.addDebug(currentEntry, "  ✅ Rozpočet subdodávky: " + budgetResult.budgetSubcontracts.toFixed(2) + " €");
            }
            utils.addDebug(currentEntry, "  ✅ Spotrebované: " + spent.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  ✅ Zostatok: " + remaining.toFixed(2) + " €");
            utils.addDebug(currentEntry, "");

            utils.addDebug(currentEntry, "✅ Prepočet zákazky úspešne dokončený");
            return true;

        } catch (error) {
            var errorMsg = "❌ KRITICKÁ CHYBA: " + error.toString();
            if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
            if (error.stack) errorMsg += "\nStack: " + error.stack;

            utils.addError(currentEntry, errorMsg, "OrderCalculate.orderCalculate", error);
            utils.addDebug(currentEntry, "");
            utils.addDebug(currentEntry, "❌ CHYBA PRI PREPOČTE ZÁKAZKY");
            utils.addDebug(currentEntry, "");
            utils.addDebug(currentEntry, errorMsg);

            return false;
        }
    }

    // Public API
    return {
        orderCalculate: orderCalculate,
        version: "1.0.0"
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
