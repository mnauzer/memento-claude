// ==============================================
// CENOVÉ PONUKY DIELY - Hlavný prepočet
// Verzia: 3.4.0 | Dátum: 2025-10-07 | Autor: ASISTANTO
// Knižnica: Cenové ponuky Diely (ID: nCAgQkfvK)
// Trigger: onChange
// ==============================================
// 📋 FUNKCIA:
//    - Prepočet položiek cenovej ponuky (Materiál, Práce)
//    - VŽDY získava ceny z databázy (ceny materiálu / ceny prác)
//    - Porovnanie ručne zadaných cien s cenami z databázy
//    - Dialóg pre update cien v databáze pri rozdieloch
//    - Automatické vytvorenie nových cenových záznamov
//    - Aktualizácia čísla, názvu A DÁTUMU z nadriadenej cenovej ponuky
//    - Aktualizácia poľa "Cena" v záznamy materiálu/práce pri vytvorení novej ceny
//    - Automatické použitie ceny z poľa "Cena" ak atribút nie je zadaný
//    - Výpočet súčtov za jednotlivé kategórie
//    - Výpočet celkovej sumy cenovej ponuky
//    - Automatické vymazanie debug, error a info logov pri štarte
//    - Vytvorenie prehľadného markdown reportu v info poli
// ==============================================
// 🔧 CHANGELOG v3.4.0 (2025-10-07):
//    - NOVÁ FUNKCIA: Automatické vymazanie debug, error a info logov pri štarte (utils.clearLogs)
//    - NOVÁ FUNKCIA: Vytvorenie prehľadného markdown reportu v info poli
//    - PRIDANÁ FUNKCIA: buildQuoteInfoReport() - vytvorí markdown tabuľky s položkami
//    - INFO REPORT obsahuje:
//      • Názov cenovej ponuky a číslo (header)
//      • Tabuľku materiálu (názov, množstvo, cena, celkom)
//      • Tabuľku prác (názov, množstvo, cena, celkom)
//      • Súčtové riadky a celkovú sumu
//    - Zbieranie údajov o položkách do materialItemsInfo a workItemsInfo arrayov
// 🔧 CHANGELOG v3.3.1 (2025-10-07):
//    - KRITICKÁ OPRAVA: Zaokrúhlenie finalPrice na 2 desatinné miesta pred výpočtom totalPrice
//    - FIX: Materiál 25 × 17,24 = 431,00 (bolo 430,89 kvôli nezaokrúhleným cenám z DB)
//    - FIX: Materiál 25 × 0,41 = 10,25 (bolo 10,16 kvôli nezaokrúhleným cenám z DB)
//    - Pridané: Math.round(finalPrice * 100) / 100 pre materiál aj práce
// 🔧 CHANGELOG v3.3.0 (2025-10-07):
//    - NOVÁ FUNKCIA: Ak cena atribútu nie je zadaná/je 0 → použije sa cena z poľa "Cena" v zázname
//    - Automaticky sa vytvorí nový cenový záznam a doplní do atribútu
//    - Pri vytvorení novej ceny sa VŽDY aktualizuje aj pole "Cena" v samotnom zázname
//    - Pridané funkcie updateMaterialItemPrice() a updateWorkItemPrice()
// 🔧 CHANGELOG v3.2.0 (2025-10-07):
//    - OPRAVA: Pridané dateField: "date" pre materialPrices (oprava duplicitných záznamov)
//    - NOVÁ FUNKCIA: Synchronizácia dátumu z nadriadenej cenovej ponuky
//    - Dátum z cenovej ponuky sa používa aj pre kontrolu a update cien
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
    version: "3.4.0",

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
    },

    // Polia pre položky (materiál a práce)
    itemFields: {
        material: centralConfig.fields.items,  // Materiál
        work: "Cena"  // Cenník prác - priamo názov poľa (nie je v MementoConfig)
    }
};

// Globálne premenné pre zbieranie rozdielov v cenách
var priceDifferences = [];

// Globálne premenné pre zbieranie info o položkách
var materialItemsInfo = [];
var workItemsInfo = [];

var fields = CONFIG.fields;

// Vyčistiť debug, error a info logy pred začiatkom
utils.clearLogs(currentEntry, true);  // true = vyčistí aj Error_Log

utils.addDebug(currentEntry, "🚀 START: Prepočet cenovej ponuky Diely");

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Vytvorí prehľadný markdown report s položkami materiálu a prác
 * @param {Number} materialSum - Suma za materiál
 * @param {Number} workSum - Suma za práce
 * @param {Number} totalSum - Celková suma
 * @returns {String} - Markdown formátovaný report
 */
function buildQuoteInfoReport(materialSum, workSum, totalSum) {
    var report = "";

    // Header s názvom cenovej ponuky
    var quoteName = utils.safeGet(currentEntry, fields.name) || "Cenová ponuka";
    var quoteNumber = utils.safeGet(currentEntry, fields.quoteNumber) || "";
    var quoteDate = utils.safeGet(currentEntry, fields.date);

    report += "# 📋 " + quoteName + "\n";
    if (quoteNumber) {
        report += "**Číslo:** " + quoteNumber + "\n";
    }
    if (quoteDate) {
        report += "**Dátum:** " + moment(quoteDate).format("DD.MM.YYYY") + "\n";
    }
    report += "\n---\n\n";

    // MATERIÁL
    if (materialItemsInfo.length > 0) {
        report += "## 📦 MATERIÁL\n\n";
        report += "| Názov | Množstvo | Cena | Celkom |\n";
        report += "|:------|----------:|------:|--------:|\n";

        for (var i = 0; i < materialItemsInfo.length; i++) {
            var item = materialItemsInfo[i];
            report += "| " + item.name + " | ";
            report += item.quantity.toFixed(2) + " | ";
            report += item.price.toFixed(2) + " € | ";
            report += "**" + item.totalPrice.toFixed(2) + " €** |\n";
        }

        report += "| | | **SPOLU MATERIÁL:** | **" + materialSum.toFixed(2) + " €** |\n";
        report += "\n";
    } else {
        report += "## 📦 MATERIÁL\n\n";
        report += "_Žiadne položky materiálu_\n\n";
    }

    // PRÁCE
    if (workItemsInfo.length > 0) {
        report += "## 🔨 PRÁCE\n\n";
        report += "| Názov | Množstvo | Cena | Celkom |\n";
        report += "|:------|----------:|------:|--------:|\n";

        for (var i = 0; i < workItemsInfo.length; i++) {
            var item = workItemsInfo[i];
            report += "| " + item.name + " | ";
            report += item.quantity.toFixed(2) + " | ";
            report += item.price.toFixed(2) + " € | ";
            report += "**" + item.totalPrice.toFixed(2) + " €** |\n";
        }

        report += "| | | **SPOLU PRÁCE:** | **" + workSum.toFixed(2) + " €** |\n";
        report += "\n";
    } else {
        report += "## 🔨 PRÁCE\n\n";
        report += "_Žiadne položky prác_\n\n";
    }

    // CELKOVÁ SUMA
    report += "---\n\n";
    report += "### 💰 CELKOVÁ SUMA\n\n";
    report += "| Položka | Suma |\n";
    report += "|:--------|------:|\n";
    report += "| Materiál | " + materialSum.toFixed(2) + " € |\n";
    report += "| Práce | " + workSum.toFixed(2) + " € |\n";
    report += "| **CELKOM** | **" + totalSum.toFixed(2) + " €** |\n";

    return report;
}

/**
 * Aktualizuje číslo, názov a dátum cenovej ponuky z nadriadeného záznamu
 * Hľadá linksFrom z knižnice "Cenové ponuky" a kopíruje Číslo, Názov a Dátum
 * @returns {Date|null} - Dátum z cenovej ponuky alebo null
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
            return null;
        }

        // Použij prvý nájdený záznam (malo by byť len jeden)
        var quoteEntry = quoteEntries[0];

        // Získaj číslo, názov a dátum z cenovej ponuky
        var quoteNumber = utils.safeGet(quoteEntry, centralConfig.fields.quote.number);
        var quoteName = utils.safeGet(quoteEntry, centralConfig.fields.quote.name);
        var quoteDate = utils.safeGet(quoteEntry, centralConfig.fields.quote.date);

        utils.addDebug(currentEntry, "  ✅ Nájdená cenová ponuka:");
        utils.addDebug(currentEntry, "     Číslo: " + (quoteNumber || "neznáme"));
        utils.addDebug(currentEntry, "     Názov: " + (quoteName || "neznámy"));
        utils.addDebug(currentEntry, "     Dátum: " + (quoteDate ? moment(quoteDate).format("DD.MM.YYYY") : "neznámy"));

        // Zapíš do polí dielu
        if (quoteNumber) {
            currentEntry.set(fields.quoteNumber, quoteNumber);
        }
        if (quoteName) {
            currentEntry.set(fields.name, quoteName);
        }
        if (quoteDate) {
            currentEntry.set(fields.date, quoteDate);
        }

        return quoteDate;

    } catch (error) {
        utils.addError(currentEntry, "❌ Chyba pri aktualizácii údajov z CP: " + error.toString(), "updateQuoteInfo", error);
        return null;
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
        dateField: "date",  // KRITICKÉ: V materialPrices je pole pre dátum nazvané "date" (nie "validFrom")
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
 * Aktualizuje pole "Cena" v zázname materiálu
 * @param {Entry} materialEntry - Záznam materiálu
 * @param {Number} newPrice - Nová cena
 */
function updateMaterialItemPrice(materialEntry, newPrice) {
    try {
        var priceFieldName = CONFIG.itemFields.material.price; // "Cena"
        materialEntry.set(priceFieldName, newPrice);
        utils.addDebug(currentEntry, "    🔄 Aktualizované pole Cena v materiáli: " + newPrice.toFixed(2) + " €");
    } catch (error) {
        utils.addError(currentEntry, "⚠️ Chyba pri aktualizácii Cena v materiáli: " + error.toString(), "updateMaterialItemPrice", error);
    }
}

/**
 * Aktualizuje pole "Cena" v zázname práce
 * @param {Entry} workEntry - Záznam práce
 * @param {Number} newPrice - Nová cena
 */
function updateWorkItemPrice(workEntry, newPrice) {
    try {
        var priceFieldName = CONFIG.itemFields.work; // "Cena"
        workEntry.set(priceFieldName, newPrice);
        utils.addDebug(currentEntry, "    🔄 Aktualizované pole Cena v práci: " + newPrice.toFixed(2) + " €");
    } catch (error) {
        utils.addError(currentEntry, "⚠️ Chyba pri aktualizácii Cena v práci: " + error.toString(), "updateWorkItemPrice", error);
    }
}

/**
 * Vytvorí nový záznam ceny pre materiál a aktualizuje pole "Cena" v samotnom zázname
 * @param {Entry} materialEntry - Záznam materiálu
 * @param {Number} newPrice - Nová cena
 * @param {Date} validFrom - Platnosť od
 */
function createMaterialPriceRecord(materialEntry, newPrice, validFrom) {
    try {
        var materialPricesLib = libByName(centralConfig.libraries.materialPrices);
        var priceFields = CONFIG.priceFields.materialPrices;

        var newPriceEntry = materialPricesLib.create({});
        newPriceEntry.set(priceFields.material, [materialEntry]);
        newPriceEntry.set(priceFields.date, validFrom);
        newPriceEntry.set(priceFields.sellPrice, newPrice);

        utils.addDebug(currentEntry, "    ✅ Vytvorený nový cenový záznam pre materiál, cena: " + newPrice);

        // Aktualizuj aj pole "Cena" v samotnom zázname materiálu
        updateMaterialItemPrice(materialEntry, newPrice);

        return true;
    } catch (error) {
        utils.addError(currentEntry, "❌ Chyba pri vytváraní cenového záznamu pre materiál: " + error.toString(), "createMaterialPriceRecord", error);
        return false;
    }
}

/**
 * Vytvorí nový záznam ceny pre prácu a aktualizuje pole "Cena" v samotnom zázname
 * @param {Entry} workEntry - Záznam práce
 * @param {Number} newPrice - Nová cena
 * @param {Date} validFrom - Platnosť od
 */
function createWorkPriceRecord(workEntry, newPrice, validFrom) {
    try {
        var workPricesLib = libByName(centralConfig.libraries.workPrices);
        var priceFields = CONFIG.priceFields.workPrices;

        var newPriceEntry = workPricesLib.create({});
        newPriceEntry.set(priceFields.work, [workEntry]);
        newPriceEntry.set(priceFields.validFrom, validFrom);
        newPriceEntry.set(priceFields.price, newPrice);

        utils.addDebug(currentEntry, "    ✅ Vytvorený nový cenový záznam pre prácu, cena: " + newPrice);

        // Aktualizuj aj pole "Cena" v samotnom zázname práce
        updateWorkItemPrice(workEntry, newPrice);

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
    var quoteDateFromParent = updateQuoteInfo();

    // Určenie dátumu pre výpočty - priorita má dátum z cenovej ponuky
    var currentDate = quoteDateFromParent || utils.safeGet(currentEntry, fields.date);

    if (!currentDate) {
        currentDate = new Date();
        utils.addDebug(currentEntry, "⚠️ Dátum nie je zadaný ani v CP ani v Diely, použijem dnešný dátum");
    }

    utils.addDebug(currentEntry, "📅 Dátum pre výpočty: " + moment(currentDate).format("DD.MM.YYYY"));
    
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
                    // Ani v DB ani ručná cena nie je zadaná - skús získať z poľa "Cena" v zázname
                    utils.addDebug(currentEntry, "    🔍 Pokúšam sa získať cenu z poľa Cena v zázname materiálu...");
                    var itemPriceField = CONFIG.itemFields.material.price; // "Cena"
                    var itemPrice = utils.safeGet(item, itemPriceField);

                    if (itemPrice && itemPrice > 0) {
                        utils.addDebug(currentEntry, "    ✅ Nájdená cena v zázname: " + itemPrice.toFixed(2) + " €");

                        // Zaznamenaj pre automatické vytvorenie cenového záznamu
                        priceDifferences.push({
                            itemEntry: item,
                            itemName: itemName,
                            type: "Materiál",
                            manualPrice: itemPrice,
                            dbPrice: null,
                            difference: itemPrice,
                            autoCreate: true  // Flag pre automatické vytvorenie
                        });

                        finalPrice = itemPrice;
                        // Doplň do atribútu
                        item.setAttr(attrs.price, finalPrice);
                        utils.addDebug(currentEntry, "    → Doplnená cena do atribútu: " + finalPrice.toFixed(2) + " €");
                    } else {
                        utils.addDebug(currentEntry, "    ❌ Žiadna cena - ani v DB ani ručná ani v zázname");
                        finalPrice = 0;
                    }
                }
            }

            // Zaokrúhli finalPrice na 2 desatinné miesta pre správny výpočet
            finalPrice = Math.round(finalPrice * 100) / 100;

            // Vypočítaj cenu celkom
            var totalPrice = quantity * finalPrice;
            item.setAttr(attrs.totalPrice, totalPrice);
            materialSum += totalPrice;

            // Zaznamenaj položku pre info report
            materialItemsInfo.push({
                name: itemName,
                quantity: quantity,
                price: finalPrice,
                totalPrice: totalPrice
            });

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
                    // Ani v DB ani ručná cena nie je zadaná - skús získať z poľa "Cena" v zázname
                    utils.addDebug(currentEntry, "    🔍 Pokúšam sa získať cenu z poľa Cena v zázname práce...");
                    var itemPriceField = CONFIG.itemFields.work; // "Cena"
                    var itemPrice = utils.safeGet(item, itemPriceField);

                    if (itemPrice && itemPrice > 0) {
                        utils.addDebug(currentEntry, "    ✅ Nájdená cena v zázname: " + itemPrice.toFixed(2) + " €");

                        // Zaznamenaj pre automatické vytvorenie cenového záznamu
                        priceDifferences.push({
                            itemEntry: item,
                            itemName: itemName,
                            type: "Práce",
                            manualPrice: itemPrice,
                            dbPrice: null,
                            difference: itemPrice,
                            autoCreate: true  // Flag pre automatické vytvorenie
                        });

                        finalPrice = itemPrice;
                        // Doplň do atribútu
                        item.setAttr(attrs.price, finalPrice);
                        utils.addDebug(currentEntry, "    → Doplnená cena do atribútu: " + finalPrice.toFixed(2) + " €");
                    } else {
                        utils.addDebug(currentEntry, "    ❌ Žiadna cena - ani v DB ani ručná ani v zázname");
                        finalPrice = 0;
                    }
                }
            }

            // Zaokrúhli finalPrice na 2 desatinné miesta pre správny výpočet
            finalPrice = Math.round(finalPrice * 100) / 100;

            // Vypočítaj cenu celkom
            var totalPrice = quantity * finalPrice;
            item.setAttr(attrs.totalPrice, totalPrice);
            workSum += totalPrice;

            // Zaznamenaj položku pre info report
            workItemsInfo.push({
                name: itemName,
                quantity: quantity,
                price: finalPrice,
                totalPrice: totalPrice
            });

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

    // ========== VYTVORENIE INFO REPORTU ==========
    var infoReport = buildQuoteInfoReport(materialSum, workSum, totalSum);

    // Vymaž predchádzajúce info (utils.clearLogs vymaže len debug a error, nie info)
    currentEntry.set(centralConfig.fields.common.info, "");

    // Zapíš prehľadný report do info poľa
    var infoFieldName = centralConfig.fields.common.info || "info";
    currentEntry.set(infoFieldName, infoReport);

    utils.addDebug(currentEntry, "\n📄 INFO REPORT: Vytvorený prehľadný report s " +
        (materialItemsInfo.length + workItemsInfo.length) + " položkami");

    utils.addDebug(currentEntry, "✅ FINISH: Prepočet cenovej ponuky Diely úspešne dokončený");

} catch (error) {
    utils.addError(currentEntry, "❌ KRITICKÁ CHYBA: " + error.toString() + ", Line: " + error.lineNumber, "MAIN", error);
}
