// ==============================================
// CENOVÉ PONUKY DIELY - Hlavný prepočet
// Verzia: 2.1.0 | Dátum: 2025-10-06 | Autor: ASISTANTO
// Knižnica: Cenové ponuky Diely (ID: nCAgQkfvK)
// Trigger: onChange
// ==============================================
// 📋 FUNKCIA:
//    - Prepočet položiek cenovej ponuky (Materiál, Práce)
//    - Automatické doplnenie cien z histórie ak nie sú zadané
//    - Aktualizácia čísla a názvu z nadriadenej cenovej ponuky
//    - Výpočet súčtov za jednotlivé kategórie
//    - Výpočet celkovej sumy cenovej ponuky
// ==============================================
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
    version: "2.1.0",

    // Referencie na centrálny config
    fields: centralConfig.fields.quotePart,
    attributes: {
        materials: centralConfig.attributes.quotePartMaterials,
        works: centralConfig.attributes.quotePartWorks
    },
    icons: centralConfig.icons
};

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

            var quantity = item.attr(attrs.quantity) || 0;
            var price = item.attr(attrs.price);

            utils.addDebug(currentEntry, "  • Položka #" + (i + 1) + ": množstvo=" + quantity + ", cena=" + (price || "nedefinovaná"));

            // Ak cena nie je zadaná, nájdi ju v histórii
            if (!price || price === 0) {
                utils.addDebug(currentEntry, "    🔍 Hľadám cenu v histórii...");
                var foundPrice = findMaterialPrice(item, currentDate);

                if (foundPrice !== null && foundPrice !== undefined) {
                    price = foundPrice;
                    item.setAttr(attrs.price, price);
                    utils.addDebug(currentEntry, "    ✅ Nájdená cena: " + price);
                } else {
                    utils.addDebug(currentEntry, "    ⚠️ Cena nebola nájdená");
                    price = 0;
                }
            }

            // Vypočítaj cenu celkom
            var totalPrice = quantity * price;
            item.setAttr(attrs.totalPrice, totalPrice);
            materialSum += totalPrice;

            utils.addDebug(currentEntry, "    💰 Cena celkom: " + totalPrice.toFixed(2) + " €");
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

            var quantity = item.attr(attrs.quantity) || 0;
            var price = item.attr(attrs.price);

            utils.addDebug(currentEntry, "  • Položka #" + (i + 1) + ": množstvo=" + quantity + ", cena=" + (price || "nedefinovaná"));

            // Ak cena nie je zadaná, nájdi ju v histórii
            if (!price || price === 0) {
                utils.addDebug(currentEntry, "    🔍 Hľadám cenu v histórii...");
                var foundPrice = findWorkPrice(item, currentDate);

                if (foundPrice !== null && foundPrice !== undefined) {
                    price = foundPrice;
                    item.setAttr(attrs.price, price);
                    utils.addDebug(currentEntry, "    ✅ Nájdená cena: " + price);
                } else {
                    utils.addDebug(currentEntry, "    ⚠️ Cena nebola nájdená");
                    price = 0;
                }
            }

            // Vypočítaj cenu celkom
            var totalPrice = quantity * price;
            item.setAttr(attrs.totalPrice, totalPrice);
            workSum += totalPrice;

            utils.addDebug(currentEntry, "    💰 Cena celkom: " + totalPrice.toFixed(2) + " €");
        }

        utils.addDebug(currentEntry, "  ✅ Práce suma: " + workSum.toFixed(2) + " €");
    } else {
        utils.addDebug(currentEntry, "  ℹ️ Žiadne položky prác");
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
