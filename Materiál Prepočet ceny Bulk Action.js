// ==============================================
// MEMENTO DATABASE - MATERIÁL PREPOČET CENY BULK ACTION
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
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
//    - "nákupná cena" (Number): Nová nákupná cena materiálu (voliteľné)
//    - "dph" (Options: "s DPH", "bez DPH"): Či je zadaná cena s/bez DPH
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
        var newPurchasePrice = arg("nákupná cena");
        var dphOption = arg("dph");

        // Validácia argumentu DPH
        if (dphOption === null || dphOption === undefined || dphOption === "") {
            utils.showErrorDialog("❌ CHYBA ARGUMENTU\\n\\nArgument 'dph' nie je zadaný!\\n\\nVyberte: 's DPH' alebo 'bez DPH'.");
            return false;
        }

        // Validácia hodnoty DPH argumentu
        if (dphOption !== "s DPH" && dphOption !== "bez DPH") {
            utils.showErrorDialog("❌ CHYBA ARGUMENTU\\n\\nArgument 'dph' má neplatnú hodnotu: '" + dphOption + "'\\n\\nPovolené hodnoty: 's DPH', 'bez DPH'.");
            return false;
        }

        // Získanie všetkých vybraných materiálov
        var selectedEntries = entries();
        bulkResults.total = selectedEntries.length;

        if (bulkResults.total === 0) {
            utils.showErrorDialog("❌ ŽIADNE MATERIÁLY\\n\\nNie sú vybrané žiadne materiály na spracovanie!");
            return false;
        }

        // Spracovanie všetkých vybraných materiálov
        for (var i = 0; i < selectedEntries.length; i++) {
            var currentEntry = selectedEntries[i];
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
        utils.addDebug(currentEntry, CONFIG.icons.info + " Argumenty - nákupná cena: " + inputPrice + ", dph: " + dphOption);

        // Ak nie je zadaná cena alebo je 0, použiť aktuálnu nákupnú cenu z materiálu
        var inputPriceValue = parseFloat(inputPrice);
        if (!inputPrice || inputPrice === "" || isNaN(inputPriceValue) || inputPriceValue === 0) {
            if (currentPurchasePrice <= 0) {
                utils.addError(currentEntry, "Materiál " + materialName + " - nie je nastavená nákupná cena", "processPurchasePriceFromArguments");
                return null;
            }
            inputPriceValue = currentPurchasePrice;
            utils.addDebug(currentEntry, CONFIG.icons.info + " Použitá aktuálna nákupná cena z materiálu: " + utils.formatMoney(inputPriceValue));
        }

        // Validácia finálnej ceny
        if (isNaN(inputPriceValue) || inputPriceValue < 0) {
            utils.addError(currentEntry, "Materiál " + materialName + " - neplatná nákupná cena: " + inputPrice, "processPurchasePriceFromArguments");
            return null;
        }

        var finalPurchasePrice = inputPriceValue;

        // Ak je zadaná cena s DPH, prepočítaj na cenu bez DPH
        if (dphOption === "s DPH") {
            // Získanie DPH sadzby pre materiál
            var vatRate = utils.safeGet(currentEntry, CONFIG.materialFields.vatRate, "Základná");
            var vatRatePercentage = utils.getValidVatRate(vatRate, new Date());
            if (vatRatePercentage === null) {
                utils.addError(currentEntry, "Materiál " + materialName + " - nie je možné získať DPH sadzbu", "processPurchasePriceFromArguments");
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
            utils.addError(currentEntry, "Prepočet cien zlyhal pre materiál: " + materialName, "executeCalculation");
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
// FINÁLNE ZHRNUTIE
// ==============================================

/**
 * Zobrazí finálne zhrnutie bulk operácie
 */
function showFinalSummary() {
    var endTime = new Date();
    var duration = Math.round((endTime - bulkResults.startTime) / 1000);

    var summaryMessage = "📋 HROMADNÝ PREPOČET CIEN MATERIÁLOV\\n";
    summaryMessage += "═══════════════════════════════════════\\n\\n";

    summaryMessage += "⏱️ Čas spracovania: " + duration + " sekúnd\\n";
    summaryMessage += "📊 Celkový počet materiálov: " + bulkResults.total + "\\n\\n";

    summaryMessage += "✅ Úspešne spracované: " + bulkResults.successful + "\\n";
    summaryMessage += "❌ Neúspešné: " + bulkResults.failed + "\\n";
    summaryMessage += "⏭️ Preskočené: " + bulkResults.skipped + "\\n\\n";

    // Percentuálny úspech
    var successRate = bulkResults.total > 0 ? Math.round((bulkResults.successful / bulkResults.total) * 100) : 0;
    summaryMessage += "📈 Úspešnosť: " + successRate + "%\\n\\n";

    // Detaily úspešných materiálov
    if (bulkResults.successful > 0) {
        summaryMessage += "✅ ÚSPEŠNE SPRACOVANÉ MATERIÁLY:\\n";
        summaryMessage += "─────────────────────────────────────\\n";

        var successfulCount = 0;
        for (var i = 0; i < bulkResults.details.length && successfulCount < 10; i++) {
            var detail = bulkResults.details[i];
            if (detail.status === "úspešný") {
                successfulCount++;
                summaryMessage += "• " + detail.material + "\\n";
                summaryMessage += "  Nákupná: " + utils.formatMoney(detail.newPrice) + "\\n";
                summaryMessage += "  Predajná: " + utils.formatMoney(detail.sellingPrice) + "\\n";
                if (successfulCount < 10 && successfulCount < bulkResults.successful) {
                    summaryMessage += "\\n";
                }
            }
        }

        if (bulkResults.successful > 10) {
            summaryMessage += "... a ďalších " + (bulkResults.successful - 10) + " materiálov\\n";
        }
        summaryMessage += "\\n";
    }

    // Chyby a problémy
    if (bulkResults.failed > 0 || bulkResults.skipped > 0) {
        summaryMessage += "⚠️ PROBLÉMY:\\n";
        summaryMessage += "─────────────────────────────────────\\n";

        var problemCount = 0;
        for (var i = 0; i < bulkResults.details.length && problemCount < 5; i++) {
            var detail = bulkResults.details[i];
            if (detail.status !== "úspešný") {
                problemCount++;
                summaryMessage += "• " + detail.material + ": " + detail.reason + "\\n";
            }
        }

        if ((bulkResults.failed + bulkResults.skipped) > 5) {
            summaryMessage += "... a ďalších " + ((bulkResults.failed + bulkResults.skipped) - 5) + " problémov\\n";
        }
        summaryMessage += "\\n";
    }

    summaryMessage += "📝 Detailné informácie nájdete v Debug_Log poliach\\n";
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