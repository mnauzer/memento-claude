// ==============================================
// CENOVÉ PONUKY DIELY - Hlavný prepočet
// Verzia: 3.1.0 | Dátum: 2025-10-07 | Autor: ASISTANTO
// Knižnica: Cenové ponuky Diely (ID: nCAgQkfvK)
// Trigger: onChange
// ==============================================
// 📋 FUNKCIA:
//    - Prepočet položiek cenovej ponuky (Materiál, Práce)
//    - VŽDY získava ceny z databázy (ceny materiálu / ceny prác)
//    - Porovnanie ručne zadaných cien s cenami z databázy
//    - Dialóg pre update cien v databáze pri rozdieloch
//    - Automatické vytvorenie nových cenových záznamov
//    - Aktualizácia čísla a názvu z nadriadenej cenovej ponuky
//    - Výpočet súčtov za jednotlivé kategórie
//    - Výpočet celkovej sumy cenovej ponuky
// ==============================================
// 🔧 CHANGELOG v3.1.0 (2025-10-07):
//    - OPRAVA: Použitie dialog() namiesto message() pre potvrdenie aktualizácie cien
//    - Používateľ môže potvrdiť alebo zrušiť aktualizáciu cien cez dialóg
//    - Callback funkcie pre pozitívne/negatívne tlačidlo
// 🔧 CHANGELOG v3.0.1 (2025-10-06):
//    - OPRAVA: Bezpečné získanie názvu položky pomocou item.field() s try/catch
//    - Fallback na "Materiál #N" / "Práca #N" ak názov nie je dostupný
// 🔧 CHANGELOG v3.0.0 (2025-10-06):
//    - ZÁSADNÁ ZMENA: Ceny sa VŽDY získavajú z databázy
//    - Porovnanie ručne zadaných cien s databázovými cenami
//    - Dialóg pre update cien ak sú rozdiely
//    - Automatické vytvorenie nových price records s aktuálnym dátumom
//    - Zoznam všetkých položiek s rozdielmi v jednom dialógu
// 🔧 CHANGELOG v2.1.0 (2025-10-06):
//    - PRIDANÉ: Funkcia updateQuoteInfo() - kopíruje Číslo a Názov z nadriadenej CP
//    - Používa utils.safeGetLinksFrom() pre získanie nadriadeného záznamu
//    - Automatické vyplnenie polí "Číslo CP" a "Názov" z hlavnej cenovej ponuky
// 🔧 CHANGELOG v2.0.0 (2025-10-06):
//    - KOMPLETNÝ REWRITE: Použitie štandardných Memento funkcií
//    - Žiadne processing, žiadne categories - len CONFIG.fields
//    - Priamy prístup k poliam: fields.materials, fields.works
//    - Štandardné utils.safeGetLinks pre linkToEntry polia
//    - Atribúty cez natívnu Memento API (.attr, .setAttr)
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Cenové ponuky Diely - Prepočet",
    version: "3.1.0",

    // Referencie na centrálny config
    fields: centralConfig.fields.quotePart,
    attributes: {
        materials: centralConfig.attributes.quotePartMaterials,
        works: centralConfig.attributes.quotePartWorks
    },
    icons: centralConfig.icons,

    // Polia pre cenové knižnice
    priceFields: {
        materialPrices: centralConfig.fields.materialPrices,
        workPrices: centralConfig.fields.workPrices
    }
};

// Globálne premenné pre zbieranie rozdielov v cenách
var priceDifferences = [];

var fields = CONFIG.fields;
var currentDate = utils.safeGet(currentEntry, fields.date);

if (!currentDate) {
    currentDate = new Date();
    utils.addDebug(currentEntry, "⚠️ Dátum nie je zadaný, použijem dnešný dátum");
}

utils.addDebug(currentEntry, "🚀 START: Prepočet cenovej ponuky Diely - " + moment(currentDate).format("DD.MM.YYYY"));

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Aktualizuje číslo a názov cenovej ponuky z nadriadeného záznamu
 * Hľadá linksFrom z knižnice "Cenové ponuky" a kopíruje Číslo a Názov
 */
function updateQuoteInfo() {
    try {
        var quoteLibraryName = centralConfig.libraries.quotes; // "Cenové ponuky"
        var partsFieldName = centralConfig.fields.quote.parts; // "Diely"

        utils.addDebug(currentEntry, "\n🔗 Aktualizácia údajov z cenovej ponuky");
        utils.addDebug(currentEntry, "  Hľadám v knižnici: " + quoteLibraryName);
        utils.addDebug(currentEntry, "  Pole: " + partsFieldName);

        // Získaj linksFrom z nadriadenej cenovej ponuky
        var quoteEntries = utils.safeGetLinksFrom(currentEntry, quoteLibraryName, partsFieldName);

        if (!quoteEntries || quoteEntries.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Nenašiel som nadriadenú cenovú ponuku");
            return;
        }

        // Použij prvý nájdený záznam (malo by byť len jeden)
        var quoteEntry = quoteEntries[0];

        // Získaj číslo a názov z cenovej ponuky
        var quoteNumber = utils.safeGet(quoteEntry, centralConfig.fields.quote.number);
        var quoteName = utils.safeGet(quoteEntry, centralConfig.fields.quote.name);

        utils.addDebug(currentEntry, "  ✅ Nájdená cenová ponuka:");
        utils.addDebug(currentEntry, "     Číslo: " + (quoteNumber || "neznáme"));
        utils.addDebug(currentEntry, "     Názov: " + (quoteName || "neznámy"));

        // Zapíš do polí dielu
        if (quoteNumber) {
            currentEntry.set(fields.quoteNumber, quoteNumber);
        }
        if (quoteName) {
            currentEntry.set(fields.name, quoteName);
        }

    } catch (error) {
        utils.addError(currentEntry, "❌ Chyba pri aktualizácii údajov z CP: " + error.toString(), "updateQuoteInfo", error);
    }
}

/**
 * Nájde platnú cenu materiálu k danému dátumu
 * @param {Entry} materialEntry - Záznam materiálu
 * @param {Date} date - Dátum pre ktorý hľadáme cenu
 * @returns {Number|null} - Platná cena alebo null
 */
function findMaterialPrice(materialEntry, date) {
    var options = {
        priceLibrary: "materialPrices",
        linkField: "material",
        priceField: "sellPrice",
        fallbackPriceField: "price",
        currentEntry: currentEntry
    };
    return utils.findValidPrice(materialEntry, date, options);
}

/**
 * Nájde platnú cenu práce k danému dátumu
 * @param {Entry} workEntry - Záznam práce
 * @param {Date} date - Dátum pre ktorý hľadáme cenu
 * @returns {Number|null} - Platná cena alebo null
 */
function findWorkPrice(workEntry, date) {
    var options = {
        priceLibrary: "workPrices",
        linkField: "work",
        priceField: "price",
        currentEntry: currentEntry
    };
    return utils.findValidPrice(workEntry, date, options);
}

/**
 * Vytvorí nový záznam ceny pre materiál
 * @param {Entry} materialEntry - Záznam materiálu
 * @param {Number} newPrice - Nová cena
 * @param {Date} validFrom - Platnosť od
 */
function createMaterialPriceRecord(materialEntry, newPrice, validFrom) {
    try {
        var materialPricesLib = lib(centralConfig.libraries.materialPrices);
        var priceFields = CONFIG.priceFields.materialPrices;

        var newPriceEntry = materialPricesLib.create();
        newPriceEntry.set(priceFields.material, [materialEntry]);
        newPriceEntry.set(priceFields.date, validFrom);
        newPriceEntry.set(priceFields.sellPrice, newPrice);

        utils.addDebug(currentEntry, "    ✅ Vytvorený nový cenový záznam pre materiál, cena: " + newPrice);
        return true;
    } catch (error) {
        utils.addError(currentEntry, "❌ Chyba pri vytváraní cenového záznamu pre materiál: " + error.toString(), "createMaterialPriceRecord", error);
        return false;
    }
}

/**
 * Vytvorí nový záznam ceny pre prácu
 * @param {Entry} workEntry - Záznam práce
 * @param {Number} newPrice - Nová cena
 * @param {Date} validFrom - Platnosť od
 */
function createWorkPriceRecord(workEntry, newPrice, validFrom) {
    try {
        var workPricesLib = lib(centralConfig.libraries.workPrices);
        var priceFields = CONFIG.priceFields.workPrices;

        var newPriceEntry = workPricesLib.create();
        newPriceEntry.set(priceFields.work, [workEntry]);
        newPriceEntry.set(priceFields.validFrom, validFrom);
        newPriceEntry.set(priceFields.price, newPrice);

        utils.addDebug(currentEntry, "    ✅ Vytvorený nový cenový záznam pre prácu, cena: " + newPrice);
        return true;
    } catch (error) {
        utils.addError(currentEntry, "❌ Chyba pri vytváraní cenového záznamu pre prácu: " + error.toString(), "createWorkPriceRecord", error);
        return false;
    }
}

/**
 * Zobrazí dialóg s rozdielmi v cenách a umožní používateľovi potvrdiť aktualizáciu
 */
function showPriceDifferenceDialog() {
    if (priceDifferences.length === 0) {
        return;
    }

    var dialogMessage = "Našli sa rozdiely medzi zadanými cenami a cenami v databáze:\n\n";

    for (var i = 0; i < priceDifferences.length; i++) {
        var diff = priceDifferences[i];
        dialogMessage += (i + 1) + ". " + diff.itemName + " (" + diff.type + ")\n";
        dialogMessage += "   • Zadaná cena: " + diff.manualPrice.toFixed(2) + " €\n";
        dialogMessage += "   • Cena v DB:   " + (diff.dbPrice ? diff.dbPrice.toFixed(2) + " €" : "neexistuje") + "\n";
        dialogMessage += "   • Rozdiel:     " + diff.difference.toFixed(2) + " €\n\n";
    }

    dialogMessage += "Chcete aktualizovať ceny v databáze?\n";
    dialogMessage += "(Vytvorí sa nový cenový záznam s dátumom: " + moment(currentDate).format("DD.MM.YYYY") + ")";

    dialog()
        .title("🔍 Zistené rozdiely v cenách")
        .text(dialogMessage)
        .positiveButton("Áno, aktualizovať", function() {
            processPriceUpdates();
        })
        .negativeButton("Nie, zrušiť", function() {
            utils.addDebug(currentEntry, "  ℹ️ Používateľ zrušil aktualizáciu cien");
        })
        .show();
}

/**
 * Spracuje update cien v databáze
 */
function processPriceUpdates() {
    utils.addDebug(currentEntry, "\n💾 Aktualizácia cien v databáze");

    var successCount = 0;
    var failCount = 0;

    for (var i = 0; i < priceDifferences.length; i++) {
        var diff = priceDifferences[i];

        utils.addDebug(currentEntry, "  Aktualizujem: " + diff.itemName + " (" + diff.type + ")");

        var success = false;
        if (diff.type === "Materiál") {
            success = createMaterialPriceRecord(diff.itemEntry, diff.manualPrice, currentDate);
        } else if (diff.type === "Práce") {
            success = createWorkPriceRecord(diff.itemEntry, diff.manualPrice, currentDate);
        }

        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    utils.addDebug(currentEntry, "  ✅ Úspešne aktualizovaných: " + successCount);
    if (failCount > 0) {
        utils.addDebug(currentEntry, "  ❌ Neúspešných: " + failCount);
    }

    message("Aktualizácia dokončená:\n✅ Úspešných: " + successCount + "\n" + (failCount > 0 ? "❌ Chýb: " + failCount : ""));
}

// ==============================================
// HLAVNÁ LOGIKA PREPOČTU
// ==============================================

try {
    // ========== AKTUALIZÁCIA ÚDAJOV Z CENOVEJ PONUKY ==========
    updateQuoteInfo();

    var materialSum = 0;
    var workSum = 0;

    // ========== SPRACOVANIE MATERIÁLU ==========
    utils.addDebug(currentEntry, "\n📦 MATERIÁL");
    utils.addDebug(currentEntry, "Pole: " + fields.materials);

    var materialItems = utils.safeGetLinks(currentEntry, fields.materials);
    utils.addDebug(currentEntry, "Počet položiek: " + (materialItems ? materialItems.length : 0));

    if (materialItems && materialItems.length > 0) {
        var attrs = CONFIG.attributes.materials;

        for (var i = 0; i < materialItems.length; i++) {
            var item = materialItems[i];

            // Získaj názov materiálu - skús viaceré možné polia
            var itemName = "Neznámy materiál";
            try {
                itemName = item.field("Názov") || item.field("Name") || "Neznámy materiál";
            } catch (e) {
                itemName = "Materiál #" + (i + 1);
            }

            var quantity = item.attr(attrs.quantity) || 0;
            var manualPrice = item.attr(attrs.price); // Ručne zadaná cena

            utils.addDebug(currentEntry, "  • Položka #" + (i + 1) + ": " + itemName);
            utils.addDebug(currentEntry, "    Množstvo: " + quantity + ", Ručná cena: " + (manualPrice || "nie je zadaná"));

            // VŽDY získaj cenu z databázy
            utils.addDebug(currentEntry, "    🔍 Získavam cenu z databázy...");
            var dbPrice = findMaterialPrice(item, currentDate);

            var finalPrice = 0;

            if (dbPrice !== null && dbPrice !== undefined) {
                utils.addDebug(currentEntry, "    ✅ Cena v DB: " + dbPrice.toFixed(2) + " €");

                // Ak je zadaná ručná cena, porovnaj
                if (manualPrice && manualPrice > 0) {
                    var difference = Math.abs(manualPrice - dbPrice);

                    if (difference > 0.01) { // Tolerancia 1 cent
                        utils.addDebug(currentEntry, "    ⚠️ ROZDIEL: Ručná cena (" + manualPrice.toFixed(2) + " €) vs DB cena (" + dbPrice.toFixed(2) + " €)");

                        // Zaznamenaj rozdiel
                        priceDifferences.push({
                            itemEntry: item,
                            itemName: itemName,
                            type: "Materiál",
                            manualPrice: manualPrice,
                            dbPrice: dbPrice,
                            difference: difference
                        });

                        finalPrice = manualPrice; // Použij ručnú cenu
                    } else {
                        finalPrice = dbPrice; // Ceny sú rovnaké
                    }
                } else {
                    // Nie je zadaná ručná cena, použij DB cenu
                    finalPrice = dbPrice;
                    item.setAttr(attrs.price, finalPrice);
                    utils.addDebug(currentEntry, "    → Nastavená cena z DB: " + finalPrice.toFixed(2) + " €");
                }
            } else {
                // Cena nie je v databáze
                if (manualPrice && manualPrice > 0) {
                    utils.addDebug(currentEntry, "    ⚠️ Cena nie je v DB, použijem ručnú: " + manualPrice.toFixed(2) + " €");

                    // Zaznamenaj pre vytvorenie nového záznamu
                    priceDifferences.push({
                        itemEntry: item,
                        itemName: itemName,
                        type: "Materiál",
                        manualPrice: manualPrice,
                        dbPrice: null,
                        difference: manualPrice
                    });

                    finalPrice = manualPrice;
                } else {
                    utils.addDebug(currentEntry, "    ❌ Žiadna cena - ani v DB ani ručná");
                    finalPrice = 0;
                }
            }

            // Vypočítaj cenu celkom
            var totalPrice = quantity * finalPrice;
            item.setAttr(attrs.totalPrice, totalPrice);
            materialSum += totalPrice;

            utils.addDebug(currentEntry, "    💰 Finálna cena: " + finalPrice.toFixed(2) + " €, Celkom: " + totalPrice.toFixed(2) + " €");
        }

        utils.addDebug(currentEntry, "  ✅ Materiál suma: " + materialSum.toFixed(2) + " €");
    } else {
        utils.addDebug(currentEntry, "  ℹ️ Žiadne položky materiálu");
    }

    // ========== SPRACOVANIE PRÁC ==========
    utils.addDebug(currentEntry, "\n🔨 PRÁCE");
    utils.addDebug(currentEntry, "Pole: " + fields.works);

    var workItems = utils.safeGetLinks(currentEntry, fields.works);
    utils.addDebug(currentEntry, "Počet položiek: " + (workItems ? workItems.length : 0));

    if (workItems && workItems.length > 0) {
        var attrs = CONFIG.attributes.works;

        for (var i = 0; i < workItems.length; i++) {
            var item = workItems[i];

            // Získaj názov práce - skús viaceré možné polia
            var itemName = "Neznáma práca";
            try {
                itemName = item.field("Názov") || item.field("Name") || "Neznáma práca";
            } catch (e) {
                itemName = "Práca #" + (i + 1);
            }

            var quantity = item.attr(attrs.quantity) || 0;
            var manualPrice = item.attr(attrs.price); // Ručne zadaná cena

            utils.addDebug(currentEntry, "  • Položka #" + (i + 1) + ": " + itemName);
            utils.addDebug(currentEntry, "    Množstvo: " + quantity + ", Ručná cena: " + (manualPrice || "nie je zadaná"));

            // VŽDY získaj cenu z databázy
            utils.addDebug(currentEntry, "    🔍 Získavam cenu z databázy...");
            var dbPrice = findWorkPrice(item, currentDate);

            var finalPrice = 0;

            if (dbPrice !== null && dbPrice !== undefined) {
                utils.addDebug(currentEntry, "    ✅ Cena v DB: " + dbPrice.toFixed(2) + " €");

                // Ak je zadaná ručná cena, porovnaj
                if (manualPrice && manualPrice > 0) {
                    var difference = Math.abs(manualPrice - dbPrice);

                    if (difference > 0.01) { // Tolerancia 1 cent
                        utils.addDebug(currentEntry, "    ⚠️ ROZDIEL: Ručná cena (" + manualPrice.toFixed(2) + " €) vs DB cena (" + dbPrice.toFixed(2) + " €)");

                        // Zaznamenaj rozdiel
                        priceDifferences.push({
                            itemEntry: item,
                            itemName: itemName,
                            type: "Práce",
                            manualPrice: manualPrice,
                            dbPrice: dbPrice,
                            difference: difference
                        });

                        finalPrice = manualPrice; // Použij ručnú cenu
                    } else {
                        finalPrice = dbPrice; // Ceny sú rovnaké
                    }
                } else {
                    // Nie je zadaná ručná cena, použij DB cenu
                    finalPrice = dbPrice;
                    item.setAttr(attrs.price, finalPrice);
                    utils.addDebug(currentEntry, "    → Nastavená cena z DB: " + finalPrice.toFixed(2) + " €");
                }
            } else {
                // Cena nie je v databáze
                if (manualPrice && manualPrice > 0) {
                    utils.addDebug(currentEntry, "    ⚠️ Cena nie je v DB, použijem ručnú: " + manualPrice.toFixed(2) + " €");

                    // Zaznamenaj pre vytvorenie nového záznamu
                    priceDifferences.push({
                        itemEntry: item,
                        itemName: itemName,
                        type: "Práce",
                        manualPrice: manualPrice,
                        dbPrice: null,
                        difference: manualPrice
                    });

                    finalPrice = manualPrice;
                } else {
                    utils.addDebug(currentEntry, "    ❌ Žiadna cena - ani v DB ani ručná");
                    finalPrice = 0;
                }
            }

            // Vypočítaj cenu celkom
            var totalPrice = quantity * finalPrice;
            item.setAttr(attrs.totalPrice, totalPrice);
            workSum += totalPrice;

            utils.addDebug(currentEntry, "    💰 Finálna cena: " + finalPrice.toFixed(2) + " €, Celkom: " + totalPrice.toFixed(2) + " €");
        }

        utils.addDebug(currentEntry, "  ✅ Práce suma: " + workSum.toFixed(2) + " €");
    } else {
        utils.addDebug(currentEntry, "  ℹ️ Žiadne položky prác");
    }

    // ========== KONTROLA A UPDATE CIEN ==========
    if (priceDifferences.length > 0) {
        utils.addDebug(currentEntry, "\n⚠️ Zistené rozdiely v cenách: " + priceDifferences.length);

        // Zobraz dialóg pre potvrdenie aktualizácie cien
        showPriceDifferenceDialog();
    } else {
        utils.addDebug(currentEntry, "\n✅ Žiadne rozdiely v cenách");
    }

    // ========== ZÁPIS VÝSLEDKOV ==========
    var totalSum = materialSum + workSum;

    currentEntry.set(fields.materialSum, materialSum);
    currentEntry.set(fields.workSum, workSum);
    currentEntry.set(fields.totalSum, totalSum);

    // Debug výstup
    utils.addDebug(currentEntry, "\n" + "=".repeat(50));
    utils.addDebug(currentEntry, "💰 SÚHRN CENOVEJ PONUKY DIELY:");
    utils.addDebug(currentEntry, "  • Materiál:     " + materialSum.toFixed(2) + " €");
    utils.addDebug(currentEntry, "  • Práce:        " + workSum.toFixed(2) + " €");
    utils.addDebug(currentEntry, "  " + "-".repeat(48));
    utils.addDebug(currentEntry, "  • CELKOM:       " + totalSum.toFixed(2) + " €");
    utils.addDebug(currentEntry, "=".repeat(50));

    utils.addDebug(currentEntry, "✅ FINISH: Prepočet cenovej ponuky Diely úspešne dokončený");

} catch (error) {
    utils.addError(currentEntry, "❌ KRITICKÁ CHYBA: " + error.toString() + ", Line: " + error.lineNumber, "MAIN", error);
}
