// ==============================================
// MEMENTO DATABASE - MATERIÁL PREPOČET CENY BULK ACTION
// Verzia: 1.0.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Materiál | Trigger: Bulk Action
// ==============================================
// 📋 FUNKCIA:
//    - Hromadný prepočet cien materiálov
//    - Argumenty: "nákupná cena" (číslo) + "dph" (s DPH/bez DPH)
//    - Automatický prepočet ceny bez DPH ak je zadaná s DPH
//    - Kontrola zmeny nákupnej ceny podľa nastavení
//    - Automatický prepočet predajných cien
//    - Aktualizácia ikon podľa zmeny ceny
//    - Automatické vytvorenie/aktualizácia cenovej histórie
//    - Dialog so zhrnutím len na konci operácie
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoBusiness (business logika pre ceny materiálu)
// 📝 ARGUMENTY:
//    - "nákupná cena" (Number): Nová nákupná cena materiálu (voliteľné - ak nie je zadaná, použije sa cena z poľa)
//    - "dph" (Options: "s DPH", "bez DPH"): Či je zadaná cena s/bez DPH (voliteľné - ak nie je zadané, určí sa podľa sadzby DPH)
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;

var CONFIG = {
    scriptName: "Materiál Prepočet ceny Bulk Action",
    version: "1.0.0",

    // Knižnice
    libraries: {
        inventory: (centralConfig.libraries && centralConfig.libraries.inventory) || "Materiál",
        vatRates: (centralConfig.libraries && centralConfig.libraries.vatRatesLib) || "sadzby DPH"
    },

    // Polia Materiál
    materialFields: {
        name: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.name) || "Názov",
        purchasePrice: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePrice) || "Nákupná cena",
        purchasePriceWithVat: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePriceWithVat) || "Nákupná cena s DPH",
        price: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.price) || "Cena",
        priceWithVat: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceWithVat) || "Cena s DPH",
        priceCalculation: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceCalculation) || "Prepočet ceny",
        markupPercentage: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.markupPercentage) || "Obchodná prirážka",
        priceRounding: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceRounding) || "Zaokrúhľovanie cien",
        roundingValue: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.roundingValue) || "Hodnota zaokrúhenia",
        vatRate: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.vatRate) || "sadzba DPH",
        purchasePriceChange: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePriceChange) || "Zmena nákupnej ceny",
        changePercentage: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.changePercentage) || "Percento zmeny",
        icons: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.icons) || "icons",

        // Spoločné polia
        debugLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.debugLog) || "Debug_Log",
        errorLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.errorLog) || "Error_Log",
        info: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.info) || "info"
    },

    // Ikony
    icons: (centralConfig.icons) || {
        start: "🚀",
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        money: "💰",
        calculation: "🧮",
        material: "📦",
        bulk: "📋"
    }
};

// ==============================================
// GLOBÁLNE PREMENNÉ PRE SLEDOVANIE VÝSLEDKOV
// ==============================================

var bulkResults = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    details: [],
    startTime: new Date()
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Získanie argumentov
        var newPurchasePrice = null;
        var dphOption = null;

        // Bezpečné získanie argumentov
        try {
            newPurchasePrice = arg("nákupná cena");
        } catch (e) {
            // Argument nie je definovaný, použijeme null
            newPurchasePrice = null;
        }

        try {
            dphOption = arg("dph");
        } catch (e) {
            dphOption = null;
        }

        // Získanie všetkých vybraných materiálov (Bulk Action API)
        var materialEntries = selectedEntries();
        bulkResults.total = materialEntries.length;

        // Ak nie je zadaný DPH argument, určíme ho podľa prvého materiálu
        if (dphOption === null || dphOption === undefined || dphOption === "") {
            dphOption = determineDphOptionFromMaterials(materialEntries);
            if (!dphOption) {
                utils.showErrorDialog("❌ CHYBA ARGUMENTU\n\nArgument 'dph' nie je zadaný a nie je možné ho určiť automaticky!\n\nVyberte: 's DPH' alebo 'bez DPH' alebo nastavte sadzbu DPH v materiáloch.");
                return false;
            }
        }

        // Validácia hodnoty DPH argumentu
        if (dphOption !== "s DPH" && dphOption !== "bez DPH") {
            utils.showErrorDialog("❌ CHYBA ARGUMENTU\n\nArgument 'dph' má neplatnú hodnotu: '" + dphOption + "'\n\nPovolené hodnoty: 's DPH', 'bez DPH'.");
            return false;
        }

        if (bulkResults.total === 0) {
            utils.showErrorDialog("❌ ŽIADNE MATERIÁLY\n\nNie sú vybrané žiadne materiály na spracovanie!");
            return false;
        }

        // Spracovanie všetkých vybraných materiálov
        for (var i = 0; i < materialEntries.length; i++) {
            var currentEntry = materialEntries[i];
            var materialName = utils.safeGet(currentEntry, CONFIG.materialFields.name, "Materiál #" + (i + 1));

            try {
                bulkResults.processed++;

                // Spracovanie materiálu
                var success = processMaterial(currentEntry, newPurchasePrice, dphOption, materialName, i + 1);

                if (success) {
                    bulkResults.successful++;
                } else {
                    bulkResults.failed++;
                }

            } catch (error) {
                bulkResults.failed++;
                bulkResults.errors.push({
                    material: materialName,
                    error: error.toString()
                });

                utils.addError(currentEntry, "Chyba pri spracovaní materiálu: " + error.toString(), "main", error);
            }
        }

        // Zobrazenie finálneho zhrnutía
        showFinalSummary();

        return true;

    } catch (error) {
        utils.showErrorDialog("Kritická chyba v bulk akcii!\\n\\n" + error.toString());
        return false;
    }
}

// ==============================================
// SPRACOVANIE JEDNÉHO MATERIÁLU
// ==============================================

/**
 * Spracuje jeden materiál v rámci bulk akcie
 */
function processMaterial(currentEntry, inputPrice, dphOption, materialName, materialIndex) {
    try {
        // Čistenie logov pre aktuálny materiál
        utils.clearLogs(currentEntry, [CONFIG.materialFields.debugLog, CONFIG.materialFields.errorLog]);
        utils.addDebug(currentEntry, CONFIG.icons.bulk + " [" + materialIndex + "/" + bulkResults.total + "] " + CONFIG.scriptName + " v" + CONFIG.version);

        var currentPurchasePrice = parseFloat(utils.safeGet(currentEntry, CONFIG.materialFields.purchasePrice, 0));
        utils.addDebug(currentEntry, CONFIG.icons.material + " Materiál: " + materialName);
        utils.addDebug(currentEntry, CONFIG.icons.info + " Aktuálna nákupná cena: " + utils.formatMoney(currentPurchasePrice));

        // Spracovanie argumentov
        var finalPurchasePrice = processPurchasePriceFromArguments(currentEntry, inputPrice, dphOption, materialName, currentPurchasePrice);

        if (finalPurchasePrice === null) {
            bulkResults.skipped++;
            bulkResults.details.push({
                material: materialName,
                status: "preskočený",
                reason: "neplatná nákupná cena alebo chyba argumentov"
            });
            return false;
        }

        // Vykonanie prepočtu
        var result = executeCalculation(currentEntry, finalPurchasePrice, materialName);

        if (result && result.success) {
            bulkResults.details.push({
                material: materialName,
                status: "úspešný",
                oldPrice: currentPurchasePrice,
                newPrice: finalPurchasePrice,
                sellingPrice: result.sellingPrice,
                priceWithVat: result.priceWithVat
            });
            return true;
        } else {
            bulkResults.details.push({
                material: materialName,
                status: "neúspešný",
                reason: result ? result.message : "neznáma chyba"
            });
            return false;
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní materiálu: " + error.toString(), "processMaterial", error);
        bulkResults.details.push({
            material: materialName,
            status: "chyba",
            reason: error.toString()
        });
        return false;
    }
}

// ==============================================
// SPRACOVANIE ARGUMENTOV
// ==============================================

/**
 * Spracuje nákupnú cenu a DPH option z argumentov akcie
 */
function processPurchasePriceFromArguments(currentEntry, inputPrice, dphOption, materialName, currentPurchasePrice) {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.info + " Argumenty - nákupná cena: " + (inputPrice || "nie je zadaná") + ", dph: " + dphOption);

        var inputPriceValue = null;

        // Logika pre určenie finálnej ceny:
        // 1. Ak je zadaný argument a je platný, použiť ho
        // 2. Ak nie je zadaný argument alebo je neplatný, použiť cenu z poľa
        // 3. Ak ani pole nemá cenu, pridať varovnú ikonu a preskočiť materiál

        if (inputPrice !== null && inputPrice !== undefined && inputPrice !== "") {
            inputPriceValue = parseFloat(inputPrice);
            if (!isNaN(inputPriceValue) && inputPriceValue > 0) {
                utils.addDebug(currentEntry, CONFIG.icons.money + " Použitá cena z argumentu: " + utils.formatMoney(inputPriceValue));
            } else {
                // Neplatný argument, použiť cenu z poľa
                inputPriceValue = null;
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Neplatný argument ceny, použijem cenu z poľa");
            }
        }

        // Ak nemáme platnú cenu z argumentu, použiť cenu z poľa
        if (inputPriceValue === null) {
            if (currentPurchasePrice > 0) {
                inputPriceValue = currentPurchasePrice;
                utils.addDebug(currentEntry, CONFIG.icons.info + " Použitá nákupná cena z poľa materiálu: " + utils.formatMoney(inputPriceValue));
            } else {
                // Pridať varovnú ikonu do poľa icons
                addWarningIcon(currentEntry, materialName);
                var error = new Error("Materiál " + materialName + " - nie je nastavená nákupná cena v poli ani argumente");
                utils.addError(currentEntry, error.message, "processPurchasePriceFromArguments", error);
                return null;
            }
        }

        // Finálna validácia
        if (isNaN(inputPriceValue) || inputPriceValue <= 0) {
            addWarningIcon(currentEntry, materialName);
            var error = new Error("Materiál " + materialName + " - neplatná nákupná cena: " + inputPriceValue);
            utils.addError(currentEntry, error.message, "processPurchasePriceFromArguments", error);
            return null;
        }

        var finalPurchasePrice = inputPriceValue;

        // Ak je zadaná cena s DPH, prepočítaj na cenu bez DPH
        if (dphOption === "s DPH") {
            // Získanie DPH sadzby pre materiál s fallback na "Základná"
            var vatRate = utils.safeGet(currentEntry, CONFIG.materialFields.vatRate, "");
            if (!vatRate || vatRate.trim() === "") {
                vatRate = "Základná";
                utils.addDebug(currentEntry, CONFIG.icons.info + " Použitá default DPH sadzba: " + vatRate);
            }

            var vatRatePercentage = utils.getValidVatRate(vatRate, new Date());
            if (vatRatePercentage === null) {
                var error = new Error("Materiál " + materialName + " - nie je možné získať DPH sadzbu pre: " + vatRate);
                utils.addError(currentEntry, error.message, "processPurchasePriceFromArguments", error);
                return null;
            }

            // Prepočet ceny bez DPH: cena s DPH / (1 + sadzba DPH)
            var vatMultiplier = 1 + (vatRatePercentage / 100);
            finalPurchasePrice = inputPriceValue / vatMultiplier;

            utils.addDebug(currentEntry, CONFIG.icons.calculation + " Prepočet z ceny s DPH:");
            utils.addDebug(currentEntry, "  • Zadaná cena s DPH: " + utils.formatMoney(inputPriceValue));
            utils.addDebug(currentEntry, "  • DPH sadzba: " + vatRatePercentage + "%");
            utils.addDebug(currentEntry, "  • Prepočítaná cena bez DPH: " + utils.formatMoney(finalPurchasePrice));
        } else {
            utils.addDebug(currentEntry, CONFIG.icons.money + " Nákupná cena bez DPH (priamo zadaná): " + utils.formatMoney(finalPurchasePrice));
        }

        return finalPurchasePrice;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní argumentov pre materiál " + materialName + ": " + error.toString(), "processPurchasePriceFromArguments", error);
        return null;
    }
}

// ==============================================
// VYKONANIE PREPOČTU
// ==============================================

/**
 * Vykoná skutočný prepočet cien
 */
function executeCalculation(currentEntry, purchasePrice, materialName) {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.calculation + " Spúšťam prepočet cien...");

        // Použitie funkcie z MementoBusiness modulu s vynúteným prepočtom
        var result = utils.calculateAndUpdateMaterialPrices(
            currentEntry,
            purchasePrice,
            new Date(), // Použije aktuálny dátum
            true, // isManualAction = true (ide o manuálny prepočet)
            { forceRecalculation: true } // Vynútiť prepočet bez ohľadu na prahy
        );

        // Debug informácie o výsledku
        utils.addDebug(currentEntry, "🔍 DEBUG: Výsledok calculateAndUpdateMaterialPrices:");
        utils.addDebug(currentEntry, "  • result: " + (result ? "existuje" : "null/undefined"));
        if (result) {
            utils.addDebug(currentEntry, "  • result.sellingPrice: " + result.sellingPrice);
            utils.addDebug(currentEntry, "  • result.priceWithVat: " + result.priceWithVat);
            utils.addDebug(currentEntry, "  • result.updated: " + result.updated);
            utils.addDebug(currentEntry, "  • result JSON: " + JSON.stringify(result));
        }

        if (result && result.sellingPrice !== undefined) {
            // Úspešný prepočet
            utils.addDebug(currentEntry, CONFIG.icons.success + " Prepočet cien úspešne dokončený");
            return {
                success: true,
                sellingPrice: result.sellingPrice,
                priceWithVat: result.priceWithVat,
                updated: result.updated
            };
        } else {
            // Prepočet zlyhal
            var errorMsg = "Prepočet cien zlyhal pre materiál: " + materialName;
            var error = new Error(errorMsg);
            utils.addError(currentEntry, error.message, "executeCalculation", error);
            utils.addError(currentEntry, "Result object: " + JSON.stringify(result), "executeCalculation");
            return {
                success: false,
                message: "Prepočet cien sa nepodarilo dokončiť"
            };
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vykonávaní prepočtu pre materiál " + materialName + ": " + error.toString(), "executeCalculation", error);
        return {
            success: false,
            message: error.toString()
        };
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Určí DPH option na základe sadzby DPH z materiálov
 */
function determineDphOptionFromMaterials(materialEntries) {
    try {
        if (!materialEntries || materialEntries.length === 0) {
            return null;
        }

        // Prejdeme prvých niekoľko materiálov a pokúsime sa určiť DPH
        for (var i = 0; i < Math.min(materialEntries.length, 3); i++) {
            var currentEntry = materialEntries[i];
            var materialName = utils.safeGet(currentEntry, CONFIG.materialFields.name, "Materiál #" + (i + 1));

            // Získanie sadzby DPH z materiálu
            var vatRate = utils.safeGet(currentEntry, CONFIG.materialFields.vatRate, "");

            // Ak nie je nastavená sadzba, použiť "Základná"
            if (!vatRate || vatRate.trim() === "") {
                vatRate = "Základná";
            }

            // Získanie percentuálnej hodnoty DPH
            var vatRatePercentage = utils.getValidVatRate(vatRate, new Date());

            if (vatRatePercentage !== null && vatRatePercentage > 0) {
                // Ak má materiál DPH > 0, predpokladáme že ceny sú "bez DPH"
                return "bez DPH";
            } else if (vatRatePercentage === 0) {
                // Ak má materiál DPH = 0, ceny sú tiež "bez DPH"
                return "bez DPH";
            }
        }

        // Ak sa nepodarilo určiť z materiálov, použiť default "bez DPH"
        return "bez DPH";

    } catch (error) {
        // Pri chybe vrátime default hodnotu
        return "bez DPH";
    }
}

/**
 * Pridá varovnú ikonu do poľa icons materiálu
 */
function addWarningIcon(currentEntry, materialName) {
    try {
        var currentIcons = utils.safeGet(currentEntry, CONFIG.materialFields.icons, "");
        var warningIcon = CONFIG.icons.warning;

        // Pridať varovnú ikonu len ak tam už nie je
        if (currentIcons.indexOf(warningIcon) === -1) {
            var newIcons = currentIcons ? currentIcons + " " + warningIcon : warningIcon;
            utils.safeSet(currentEntry, CONFIG.materialFields.icons, newIcons);
            utils.addDebug(currentEntry, CONFIG.icons.warning + " Pridaná varovná ikona pre materiál: " + materialName);
        }
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri pridávaní varovnej ikony: " + error.toString(), "addWarningIcon", error);
    }
}

// ==============================================
// FINÁLNE ZHRNUTIE
// ==============================================

/**
 * Zobrazí finálne zhrnutie bulk operácie
 */
function showFinalSummary() {
    var endTime = new Date();
    var duration = Math.round((endTime - bulkResults.startTime) / 1000);

    var summaryMessage = "📋 HROMADNÝ PREPOČET CIEN MATERIÁLOV\n";
    summaryMessage += "═══════════════════════════════════════\n\n";

    summaryMessage += "⏱️ Čas spracovania: " + duration + " sekúnd\n";
    summaryMessage += "📊 Celkový počet materiálov: " + bulkResults.total + "\n\n";

    summaryMessage += "✅ Úspešne spracované: " + bulkResults.successful + "\n";
    summaryMessage += "❌ Neúspešné: " + bulkResults.failed + "\n";
    summaryMessage += "⏭️ Preskočené: " + bulkResults.skipped + "\n\n";

    // Percentuálny úspech
    var successRate = bulkResults.total > 0 ? Math.round((bulkResults.successful / bulkResults.total) * 100) : 0;
    summaryMessage += "📈 Úspešnosť: " + successRate + "%\n\n";

    // Detaily úspešných materiálov
    if (bulkResults.successful > 0) {
        summaryMessage += "✅ ÚSPEŠNE SPRACOVANÉ MATERIÁLY:\n";
        summaryMessage += "─────────────────────────────────────\n";

        var successfulCount = 0;
        for (var i = 0; i < bulkResults.details.length && successfulCount < 10; i++) {
            var detail = bulkResults.details[i];
            if (detail.status === "úspešný") {
                successfulCount++;
                summaryMessage += "• " + detail.material + "\n";
                summaryMessage += "  Nákupná: " + utils.formatMoney(detail.newPrice) + "\n";
                summaryMessage += "  Predajná: " + utils.formatMoney(detail.sellingPrice) + "\n";
                if (successfulCount < 10 && successfulCount < bulkResults.successful) {
                    summaryMessage += "\n";
                }
            }
        }

        if (bulkResults.successful > 10) {
            summaryMessage += "... a ďalších " + (bulkResults.successful - 10) + " materiálov\n";
        }
        summaryMessage += "\n";
    }

    // Chyby a problémy
    if (bulkResults.failed > 0 || bulkResults.skipped > 0) {
        summaryMessage += "⚠️ PROBLÉMY:\n";
        summaryMessage += "─────────────────────────────────────\n";

        var problemCount = 0;
        for (var i = 0; i < bulkResults.details.length && problemCount < 5; i++) {
            var detail = bulkResults.details[i];
            if (detail.status !== "úspešný") {
                problemCount++;
                summaryMessage += "• " + detail.material + ": " + detail.reason + "\n";
            }
        }

        if ((bulkResults.failed + bulkResults.skipped) > 5) {
            summaryMessage += "... a ďalších " + ((bulkResults.failed + bulkResults.skipped) - 5) + " problémov\n";
        }
        summaryMessage += "\n";
    }

    summaryMessage += "📝 Detailné informácie nájdete v Debug_Log poliach\n";
    summaryMessage += "jednotlivých materiálov.";

    // Zobrazenie správneho dialógu podľa výsledku
    if (bulkResults.successful === bulkResults.total) {
        utils.showSuccessDialog(summaryMessage);
    } else if (bulkResults.successful > 0) {
        utils.showInfoDialog(summaryMessage);
    } else {
        utils.showErrorDialog(summaryMessage);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();