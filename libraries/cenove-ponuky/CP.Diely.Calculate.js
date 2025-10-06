// ==============================================
// CENOVÉ PONUKY DIELY - Hlavný prepočet
// Verzia: 1.6.0 | Dátum: 2025-10-06 | Autor: ASISTANTO
// Knižnica: Cenové ponuky Diely (ID: nCAgQkfvK)
// Trigger: onChange
// ==============================================
// 📋 FUNKCIA:
//    - Prepočet položiek cenovej ponuky (Materiál, Práce)
//    - Automatické doplnenie cien z histórie ak nie sú zadané
//    - Výpočet súčtov za jednotlivé kategórie
//    - Výpočet celkovej sumy cenovej ponuky
// ==============================================
// 🔧 CHANGELOG v1.6.0 (2025-10-06):
//    - ODSTRÁNENÉ všetky hardcoded názvy aj z CONFIG
//    - Používa centralConfig.processing.quotePart namiesto lokálneho CONFIG.categories
//    - Všetka konfigurácia spracovania položiek je v MementoConfig7.js v7.0.26+
// 🔧 CHANGELOG v1.5.1 (2025-10-06):
//    - OPRAVA: Použitie utils.safeGetLinks namiesto utils.safeGet pre linkToEntry polia
//    - OPRAVA: Správny prístup k poľu cez CONFIG.fields.quotePart[categoryConfig.field]
// 🔧 CHANGELOG v1.5 (2025-10-06):
//    - ODSTRÁNENÉ všetky hardcoded názvy
//    - CONFIG.categories s kompletnou konfiguráciou pre každú kategóriu
//    - Dynamický loop cez kategórie (ľahko rozšíriteľné)
//    - Jedna univerzálna funkcia processCategoryItems
//    - Jeden wrapper findValidPrice s category config
// 🔧 CHANGELOG v1.4 (2025-10-06):
//    - Použitie CONFIG.attributes podľa vzoru Zazp.Calc.Main.js
//    - Atribúty definované v MementoConfig7.js
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
    version: "1.6.0", // Všetka konfigurácia z centralConfig.processing.quotePart

    // Referencie na centrálny config
    fields: {
        quotePart: centralConfig.fields.quotePart,
        materialPrices: centralConfig.fields.materialPrices,
        workPrices: centralConfig.fields.workPrices,
        items: centralConfig.fields.items,
        priceList: centralConfig.fields.priceList,
        common: centralConfig.fields.common
    },
    attributes: {
        materials: centralConfig.attributes.quotePartMaterials,
        works: centralConfig.attributes.quotePartWorks
    },
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,

    // Processing konfigurácia z centrálneho configu
    processing: centralConfig.processing.quotePart
};

var fields = CONFIG.fields.quotePart;
var currentDate = utils.safeGet(currentEntry, fields.date);

if (!currentDate) {
    currentDate = new Date();
    utils.addDebug(currentEntry, "⚠️ Dátum nie je zadaný, použijem dnešný dátum");
}

utils.addDebug(currentEntry, "🚀 START: Prepočet cenovej ponuky Diely - " + moment(currentDate).format("DD.MM.YYYY"));

// === POMOCNÉ FUNKCIE ===

/**
 * Wrapper pre hľadanie platnej ceny položky
 * Používa univerzálnu utils.findValidPrice funkciu
 * @param {Object} itemEntry - Záznam položky
 * @param {Date} date - Dátum pre ktorý hľadáme cenu
 * @param {Object} categoryConfig - Konfigurácia kategórie z CONFIG.categories
 * @returns {Number|null} - Platná cena alebo null
 */
function findValidPrice(itemEntry, date, categoryConfig) {
    var options = {
        priceLibrary: categoryConfig.priceLibrary,
        linkField: categoryConfig.linkField,
        priceField: categoryConfig.priceField,
        currentEntry: currentEntry
    };

    if (categoryConfig.fallbackPriceField) {
        options.fallbackPriceField = categoryConfig.fallbackPriceField;
    }

    return utils.findValidPrice(itemEntry, date, options);
}

/**
 * Spracuje jednu kategóriu položiek (Materiál, Práce)
 * @param {String} categoryKey - Kľúč kategórie v CONFIG.processing (napr. "materials", "works")
 * @returns {Number} - Súčet za kategóriu
 */
function processCategoryItems(categoryKey) {
    try {
        var categoryConfig = CONFIG.processing[categoryKey];
        var displayName = categoryConfig.displayName;

        utils.addDebug(currentEntry, "\n📦 Spracovávam kategóriu: " + displayName);

        // Získaj pole pomocou CONFIG.fields.quotePart.materials alebo CONFIG.fields.quotePart.works
        var fieldName = CONFIG.fields.quotePart[categoryConfig.field];
        utils.addDebug(currentEntry, "  🔍 Pole: " + fieldName + " (key: " + categoryConfig.field + ")");

        var categoryEntries = utils.safeGetLinks(currentEntry, fieldName);

        if (!categoryEntries || categoryEntries.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne položky v kategórii " + displayName);
            return 0;
        }

        var categorySum = 0;
        var itemsProcessed = 0;
        var attrs = CONFIG.attributes[categoryConfig.attribute];

        for (var i = 0; i < categoryEntries.length; i++) {
            var item = categoryEntries[i];

            // Získaj atribúty pomocou natívnej Memento API
            var quantity = item.attr(attrs.quantity) || 0;
            var price = item.attr(attrs.price);
            var totalPrice = 0;

            utils.addDebug(currentEntry, "  • Položka #" + (i + 1) + ": množstvo=" + quantity + ", cena=" + (price || "nedefinovaná"));

            // Ak cena nie je zadaná, pokús sa ju nájsť v histórii
            if (!price || price === 0) {
                utils.addDebug(currentEntry, "    🔍 Hľadám cenu v histórii...");
                var foundPrice = findValidPrice(item, currentDate, categoryConfig);

                if (foundPrice !== null && foundPrice !== undefined) {
                    price = foundPrice;
                    item.setAttr(attrs.price, price);
                    utils.addDebug(currentEntry, "    ✅ Nájdená cena: " + price);
                } else {
                    utils.addDebug(currentEntry, "    ⚠️ Cena nebola nájdená v histórii");
                    price = 0;
                }
            }

            // Vypočítaj cenu celkom
            totalPrice = quantity * price;
            item.setAttr(attrs.totalPrice, totalPrice);

            categorySum += totalPrice;
            itemsProcessed++;

            utils.addDebug(currentEntry, "    💰 Cena celkom: " + totalPrice.toFixed(2) + " € (množstvo: " + quantity + " × cena: " + price.toFixed(2) + ")");
        }

        utils.addDebug(currentEntry, "  ✅ Kategória " + displayName + " spracovaná: " + itemsProcessed + " položiek, suma: " + categorySum.toFixed(2) + " €");

        return categorySum;

    } catch (error) {
        var catConfig = CONFIG.processing[categoryKey];
        var dispName = catConfig ? catConfig.displayName : categoryKey;
        utils.addError(currentEntry, "❌ Chyba pri spracovaní kategórie " + dispName + ": " + error.toString(), "processCategoryItems", error);
        return 0;
    }
}

// ==============================================
// HLAVNÁ LOGIKA PREPOČTU
// ==============================================

try {
    var totalSum = 0;
    var results = {};

    // Spracuj všetky kategórie z centralConfig.processing.quotePart
    for (var categoryKey in CONFIG.processing) {
        if (CONFIG.processing.hasOwnProperty(categoryKey)) {
            results[categoryKey] = processCategoryItems(categoryKey);
            totalSum += results[categoryKey];
        }
    }

    // Zapíš výsledky do polí
    currentEntry.set(fields.materialSum, results.materials || 0);
    currentEntry.set(fields.workSum, results.works || 0);
    currentEntry.set(fields.totalSum, totalSum);
    currentEntry.set(fields.totalPrice, totalSum);

    // Debug výstup
    utils.addDebug(currentEntry, "\n" + "=".repeat(50));
    utils.addDebug(currentEntry, "💰 SÚHRN CENOVEJ PONUKY DIELY:");

    for (var key in CONFIG.processing) {
        if (CONFIG.processing.hasOwnProperty(key)) {
            var cat = CONFIG.processing[key];
            var sum = results[key] || 0;
            utils.addDebug(currentEntry, "  • " + cat.displayName + ":     " + sum.toFixed(2) + " €");
        }
    }

    utils.addDebug(currentEntry, "  " + "-".repeat(48));
    utils.addDebug(currentEntry, "  • CELKOM:       " + totalSum.toFixed(2) + " €");
    utils.addDebug(currentEntry, "=".repeat(50));

    utils.addDebug(currentEntry, "✅ FINISH: Prepočet cenovej ponuky Diely úspešne dokončený");

} catch (error) {
    utils.addError(currentEntry, "❌ KRITICKÁ CHYBA pri prepočte cenovej ponuky Diely: " + error.toString() + ", Line: " + error.lineNumber, "MAIN", error);
}
