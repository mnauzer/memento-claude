// ==============================================
// CENOVÉ PONUKY DIELY - Hlavný prepočet
// Library: Cenové ponuky Diely (ID: nCAgQkfvK)
// Verzia: 1.2 | Dátum: 2025-10-06 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Prepočet položiek cenovej ponuky (Materiál, Práce)
//    - Automatické doplnenie cien z histórie ak nie sú zadané
//    - Výpočet súčtov za jednotlivé kategórie
//    - Výpočet celkovej sumy cenovej ponuky
// ==============================================
// 🔧 POUŽITIE:
//    - Trigger: onChange pre polia Materiál, Práce, Dátum
//    - Automatické prepočty pri zmene množstva alebo ceny
// ==============================================
// 🔧 CHANGELOG v1.2 (2025-10-06):
//    - Odstránený prepočet Subdodávok, Strojov a Dopravy
//    - Zostali len Materiál a Práce
// 🔧 CHANGELOG v1.1 (2025-10-06):
//    - Používa univerzálnu business.findValidPrice funkciu
//    - Odstránená vlastná implementácia findValidMaterialPrice
//    - Pridané wrappery pre jednoduchšie použitie
// ==============================================

// === NAČÍTANIE MODULOV ===
var core = MementoCore;
var config = MementoConfig;
var business = MementoBusiness;

var currentEntry = entry();

// === KONFIGURÁCIA ===
var fields = config.fields.quotePart;
var currentDate = core.safeGet(currentEntry, fields.date);

if (!currentDate) {
    currentDate = new Date();
    core.addDebug(currentEntry, "⚠️ Dátum nie je zadaný, použijem dnešný dátum");
}

core.addDebug(currentEntry, "🚀 START: Prepočet cenovej ponuky Diely - " + moment(currentDate).format("DD.MM.YYYY"));

// === POMOCNÉ FUNKCIE ===

/**
 * Wrapper pre hľadanie ceny materiálu
 * Používa univerzálnu business.findValidPrice funkciu
 */
function findValidMaterialPrice(materialEntry, date) {
    return business.findValidPrice(materialEntry, date, {
        priceLibrary: "materialPrices",
        linkField: "material",
        priceField: "sellPrice",
        fallbackPriceField: "price",
        currentEntry: currentEntry
    });
}

/**
 * Wrapper pre hľadanie ceny práce/stroja/dopravy
 * Používa univerzálnu business.findValidPrice funkciu
 */
function findValidWorkPrice(workEntry, date) {
    return business.findValidPrice(workEntry, date, {
        priceLibrary: "workPrices",
        linkField: "work",
        priceField: "price",
        currentEntry: currentEntry
    });
}

/**
 * Spracuje jednu kategóriu položiek (Materiál, Práce, Subdodávky, Stroje, Doprava)
 * @param {String} categoryField - Názov poľa kategórie (napr. "materials")
 * @param {String} priceLibrary - Názov knižnice s históriou cien
 * @param {Object} priceFields - Fields definícia pre históriu cien
 * @param {Function} priceFinder - Funkcia pre hľadanie ceny (business.findValidWorkPrice, findValidMaterialPrice, atď.)
 * @param {String} categoryName - Ľudsky čitateľný názov kategórie pre debug
 * @returns {Number} - Súčet za kategóriu
 */
function processCategoryItems(categoryField, priceFinder, categoryName) {
    try {
        core.addDebug(currentEntry, "\n📦 Spracovávam kategóriu: " + categoryName);

        var categoryEntries = core.safeGet(currentEntry, fields[categoryField], []);

        if (!categoryEntries || categoryEntries.length === 0) {
            core.addDebug(currentEntry, "  ℹ️ Žiadne položky v kategórii " + categoryName);
            return 0;
        }

        var categorySum = 0;
        var itemsProcessed = 0;

        for (var i = 0; i < categoryEntries.length; i++) {
            var item = categoryEntries[i];

            // Získaj atribúty
            var quantity = item.attribute("množstvo") || 0;
            var price = item.attribute("cena");
            var totalPrice = 0;

            core.addDebug(currentEntry, "  • Položka #" + (i + 1) + ": množstvo=" + quantity + ", cena=" + (price || "nedefinovaná"));

            // Ak cena nie je zadaná, pokús sa ju nájsť v histórii
            if (!price || price === 0) {
                core.addDebug(currentEntry, "    🔍 Hľadám cenu v histórii...");
                var foundPrice = priceFinder(item, currentDate);

                if (foundPrice !== null && foundPrice !== undefined) {
                    price = foundPrice;
                    item.attribute("cena", price);
                    core.addDebug(currentEntry, "    ✅ Nájdená cena: " + price);
                } else {
                    core.addDebug(currentEntry, "    ⚠️ Cena nebola nájdená v histórii");
                    price = 0;
                }
            }

            // Vypočítaj cenu celkom
            totalPrice = quantity * price;
            item.attribute("cena celkom", totalPrice);

            categorySum += totalPrice;
            itemsProcessed++;

            core.addDebug(currentEntry, "    💰 Cena celkom: " + totalPrice.toFixed(2) + " € (množstvo: " + quantity + " × cena: " + price.toFixed(2) + ")");
        }

        core.addDebug(currentEntry, "  ✅ Kategória " + categoryName + " spracovaná: " + itemsProcessed + " položiek, suma: " + categorySum.toFixed(2) + " €");

        return categorySum;

    } catch (error) {
        core.addError(currentEntry, "❌ Chyba pri spracovaní kategórie " + categoryName + ": " + error.toString(), "processCategoryItems", error);
        return 0;
    }
}

// ==============================================
// HLAVNÁ LOGIKA PREPOČTU
// ==============================================

try {
    var totalSum = 0;

    // 1. MATERIÁL - používa ceny materiálu (nc/pc)
    var materialSum = processCategoryItems(
        "materials",
        findValidMaterialPrice,
        "Materiál"
    );
    currentEntry.set(fields.materialSum, materialSum);
    totalSum += materialSum;

    // 2. PRÁCE - používa ceny prác
    var workSum = processCategoryItems(
        "works",
        findValidWorkPrice,
        "Práce"
    );
    currentEntry.set(fields.workSum, workSum);
    totalSum += workSum;

    // === VÝSLEDNÝ SÚČET ===
    currentEntry.set(fields.totalSum, totalSum);
    currentEntry.set(fields.totalPrice, totalSum);

    core.addDebug(currentEntry, "\n" + "=".repeat(50));
    core.addDebug(currentEntry, "💰 SÚHRN CENOVEJ PONUKY DIELY:");
    core.addDebug(currentEntry, "  • Materiál:     " + materialSum.toFixed(2) + " €");
    core.addDebug(currentEntry, "  • Práce:        " + workSum.toFixed(2) + " €");
    core.addDebug(currentEntry, "  " + "-".repeat(48));
    core.addDebug(currentEntry, "  • CELKOM:       " + totalSum.toFixed(2) + " €");
    core.addDebug(currentEntry, "=".repeat(50));

    core.addDebug(currentEntry, "✅ FINISH: Prepočet cenovej ponuky Diely úspešne dokončený");

} catch (error) {
    core.addError(currentEntry, "❌ KRITICKÁ CHYBA pri prepočte cenovej ponuky Diely: " + error.toString() + ", Line: " + error.lineNumber, "MAIN", error);
}
