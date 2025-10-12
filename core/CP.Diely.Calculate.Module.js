// ==============================================
// CENOVÉ PONUKY DIELY - Hlavný prepočet (MODULE)
// Verzia: 4.1.0 | Dátum: 2025-10-12 | Autor: ASISTANTO
// Knižnica: Cenové ponuky Diely (ID: nCAgQkfvK)
// ==============================================
// 📋 FUNKCIA:
//    - Exportovateľný modul pre prepočet položiek cenovej ponuky (Materiál, Práce)
//    - Použitie: CPDielyCalculate.partCalculate(entry());
//    - VŽDY získava ceny z databázy (ceny materiálu / ceny prác)
//    - Porovnanie ručne zadaných cien s cenami z databázy
//    - Dialóg pre update cien v databáze pri rozdieloch
//    - Automatické vytvorenie/aktualizácia cenových záznamov (max 1 na deň)
//    - Aktualizácia čísla, názvu A DÁTUMU z nadriadenej cenovej ponuky
//    - Aktualizácia poľa "Cena" v záznamy materiálu/práce pri vytvorení/aktualizácii ceny
//    - Automatické použitie ceny z poľa "Cena" ak atribút nie je zadaný
//    - Výpočet súčtov za jednotlivé kategórie
//    - Výpočet celkovej sumy cenovej ponuky
//    - Výpočet celkovej hmotnosti materiálu v tonách
//    - Automatické vymazanie debug, error a info logov pri štarte
//    - Vytvorenie prehľadného markdown reportu v info poli
// ==============================================
// 🔧 CHANGELOG v4.1.0 (2025-10-12):
//    - FIX: Prevencia duplicitných cenových záznamov - hľadanie existujúceho záznamu
//    - FIX: Ak existuje záznam pre daný materiál/prácu a dátum, aktualizuje sa namiesto vytvorenia nového
//    - ZLEPŠENIE: Kontrola materiálu/práce cez entry.id namiesto porovnávania polí
//    - ZLEPŠENIE: Normalizácia dátumu na začiatok dňa (00:00:00) pre presné porovnanie
//    - ZLEPŠENIE: Debug logy informujú či sa vytvára nový alebo aktualizuje existujúci záznam
// 🔧 CHANGELOG v4.0.0 (2025-10-12):
//    - MODULE VERSION: Zabalený do exportovateľného modulu
//    - NOVÁ FUNKCIA: partCalculate(partEntry) - hlavná exportovaná funkcia
//    - Použiteľné z iných scriptov, triggerov, action eventov
//    - Zachovaná 1:1 funkcionalita z v3.6.1 vrátane debug a error logov
//    - Backward compatibility: Ak je dostupné entry(), automaticky sa zavolá
// ==============================================

var CPDielyCalculate = (function() {
    'use strict';

    /**
     * Hlavná exportovaná funkcia pre prepočet Cenových ponúk Diely
     * @param {Entry} partEntry - Záznam z knižnice "Cenové ponuky Diely"
     * @returns {Boolean} - true ak prebehlo úspešne
     */
    function partCalculate(partEntry) {
        if (!partEntry) {
            throw new Error("CPDielyCalculate.partCalculate(): Parameter 'partEntry' is required!");
        }

        // ==============================================
        // INICIALIZÁCIA MODULOV
        // ==============================================

        var utils = MementoUtils;
        var centralConfig = utils.config;
        var currentEntry = partEntry;

        var CONFIG = {
            // Script špecifické nastavenia
            scriptName: "Cenové ponuky Diely - Prepočet (Module)",
            version: "4.1.0",

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

        utils.addDebug(currentEntry, "🚀 START: Prepočet cenovej ponuky Diely (Module v4.0.0)");

        // ==============================================
        // POMOCNÉ FUNKCIE
        // ==============================================

        /**
         * Vytvorí prehľadný textový report s položkami materiálu a prác
         * @param {Number} materialSum - Suma za materiál
         * @param {Number} workSum - Suma za práce
         * @param {Number} totalSum - Celková suma
         * @returns {String} - Textový formátovaný report
         */
        function buildQuoteInfoReport(materialSum, workSum, totalSum) {
            var report = "";

            // Pomocná funkcia pre zarovnanie textu doprava
            function padLeft(text, length) {
                text = String(text);
                while (text.length < length) {
                    text = " " + text;
                }
                return text;
            }

            // Pomocná funkcia pre zarovnanie textu doľava
            function padRight(text, length) {
                text = String(text);
                while (text.length < length) {
                    text = text + " ";
                }
                return text;
            }

            // Header s názvom a číslom DIELU + info o cenovej ponuke
            var partNumber = utils.safeGet(currentEntry, fields.number) || "";
            var partName = utils.safeGet(currentEntry, fields.name) || "Diel";
            var quoteNumber = utils.safeGet(currentEntry, fields.quoteNumber) || "";
            var quoteDate = utils.safeGet(currentEntry, fields.date);

            report += "═════════════════════════════════════════\n";

            // Číslo a názov dielu
            if (partNumber) {
                report += partNumber + " • " + partName + "\n";
            } else {
                report += "📋 " + partName + "\n";
            }

            // Číslo cenovej ponuky a dátum
            if (quoteNumber) {
                report += "Číslo CP: " + quoteNumber + "\n";
            }
            if (quoteDate) {
                report += "Dátum: " + moment(quoteDate).format("DD.MM.YYYY") + "\n";
            }
            report += "═════════════════════════════════════════\n\n";

            // MATERIÁL
            if (materialItemsInfo.length > 0) {
                report += "📦 MATERIÁL\n";
                report += "─────────────────────────────────────────\n";
                report += padRight("Názov", 28) + " ";
                report += padLeft("mj", 3) + " ";
                report += padLeft("Množ.", 7) + " ";
                report += padLeft("Cena", 8) + " ";
                report += padLeft("Celkom", 9) + "\n";
                report += "─────────────────────────────────────────\n";

                for (var i = 0; i < materialItemsInfo.length; i++) {
                    var item = materialItemsInfo[i];
                    var itemName = item.name.length > 28 ? item.name.substring(0, 25) + "..." : item.name;

                    report += padRight(itemName, 28) + " ";
                    report += padLeft(item.unit || "-", 3) + " ";
                    report += padLeft(item.quantity.toFixed(2), 7) + " ";
                    report += padLeft(item.price.toFixed(2), 8) + " ";
                    report += padLeft(item.totalPrice.toFixed(2) + " €", 9) + "\n";
                }

                report += "─────────────────────────────────────────\n";
                report += padRight("SPOLU MATERIÁL:", 48) + " ";
                report += padLeft(materialSum.toFixed(2) + " €", 9) + "\n\n";
            } else {
                report += "📦 MATERIÁL\n";
                report += "─────────────────────────────────────────\n";
                report += "Žiadne položky materiálu\n\n";
            }

            // PRÁCE
            if (workItemsInfo.length > 0) {
                report += "🔨 PRÁCE\n";
                report += "─────────────────────────────────────────\n";
                report += padRight("Názov", 28) + " ";
                report += padLeft("mj", 3) + " ";
                report += padLeft("Množ.", 7) + " ";
                report += padLeft("Cena", 8) + " ";
                report += padLeft("Celkom", 9) + "\n";
                report += "─────────────────────────────────────────\n";

                for (var i = 0; i < workItemsInfo.length; i++) {
                    var item = workItemsInfo[i];
                    var itemName = item.name.length > 28 ? item.name.substring(0, 25) + "..." : item.name;

                    report += padRight(itemName, 28) + " ";
                    report += padLeft(item.unit || "-", 3) + " ";
                    report += padLeft(item.quantity.toFixed(2), 7) + " ";
                    report += padLeft(item.price.toFixed(2), 8) + " ";
                    report += padLeft(item.totalPrice.toFixed(2) + " €", 9) + "\n";
                }

                report += "─────────────────────────────────────────\n";
                report += padRight("SPOLU PRÁCE:", 48) + " ";
                report += padLeft(workSum.toFixed(2) + " €", 9) + "\n\n";
            } else {
                report += "🔨 PRÁCE\n";
                report += "─────────────────────────────────────────\n";
                report += "Žiadne položky prác\n\n";
            }

            // CELKOVÁ SUMA
            report += "═════════════════════════════════════════\n";
            report += "💰 CELKOVÁ SUMA\n";
            report += "═════════════════════════════════════════\n";
            report += padRight("Materiál:", 30) + padLeft(materialSum.toFixed(2) + " €", 11) + "\n";
            report += padRight("Práce:", 30) + padLeft(workSum.toFixed(2) + " €", 11) + "\n";
            report += "─────────────────────────────────────────\n";
            report += padRight("CELKOM:", 30) + padLeft(totalSum.toFixed(2) + " €", 11) + "\n";
            report += "═════════════════════════════════════════\n";

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
         * Vytvorí alebo aktualizuje záznam ceny pre materiál a aktualizuje pole "Cena" v samotnom zázname
         * Ak už existuje záznam pre daný dátum, aktualizuje ho namiesto vytvárania nového
         * @param {Entry} materialEntry - Záznam materiálu
         * @param {Number} newPrice - Nová cena
         * @param {Date} validFrom - Platnosť od
         */
        function createMaterialPriceRecord(materialEntry, newPrice, validFrom) {
            try {
                var materialPricesLib = libByName(centralConfig.libraries.materialPrices);
                var priceFields = CONFIG.priceFields.materialPrices;

                // Konverzia dátumu na začiatok dňa pre presné porovnanie
                var dateOnly = new Date(validFrom);
                dateOnly.setHours(0, 0, 0, 0);

                // Hľadaj existujúci záznam pre tento materiál a dátum
                utils.addDebug(currentEntry, "    🔍 Hľadám existujúci cenový záznam pre dátum: " + moment(dateOnly).format("DD.MM.YYYY"));

                var existingPriceEntries = materialPricesLib.entries();
                var existingEntry = null;

                for (var i = 0; i < existingPriceEntries.length; i++) {
                    var priceEntry = existingPriceEntries[i];

                    // Kontrola či tento záznam patrí k našemu materiálu
                    var linkedMaterials = utils.safeGetLinks(priceEntry, priceFields.material) || [];
                    var isSameMaterial = false;

                    for (var j = 0; j < linkedMaterials.length; j++) {
                        if (linkedMaterials[j].id === materialEntry.id) {
                            isSameMaterial = true;
                            break;
                        }
                    }

                    if (!isSameMaterial) {
                        continue;
                    }

                    // Kontrola dátumu
                    var priceDate = utils.safeGet(priceEntry, priceFields.date);
                    if (priceDate) {
                        var priceDateOnly = new Date(priceDate);
                        priceDateOnly.setHours(0, 0, 0, 0);

                        if (priceDateOnly.getTime() === dateOnly.getTime()) {
                            existingEntry = priceEntry;
                            break;
                        }
                    }
                }

                if (existingEntry) {
                    // Aktualizuj existujúci záznam
                    utils.addDebug(currentEntry, "    🔄 Aktualizujem existujúci cenový záznam, nová cena: " + newPrice.toFixed(2) + " €");
                    existingEntry.set(priceFields.sellPrice, newPrice);
                } else {
                    // Vytvor nový záznam
                    utils.addDebug(currentEntry, "    ✅ Vytváram nový cenový záznam, cena: " + newPrice.toFixed(2) + " €");
                    var newPriceEntry = materialPricesLib.create({});
                    newPriceEntry.set(priceFields.material, [materialEntry]);
                    newPriceEntry.set(priceFields.date, dateOnly);
                    newPriceEntry.set(priceFields.sellPrice, newPrice);
                }

                // Aktualizuj aj pole "Cena" v samotnom zázname materiálu
                updateMaterialItemPrice(materialEntry, newPrice);

                return true;
            } catch (error) {
                utils.addError(currentEntry, "❌ Chyba pri vytváraní/aktualizácii cenového záznamu pre materiál: " + error.toString(), "createMaterialPriceRecord", error);
                return false;
            }
        }

        /**
         * Vytvorí alebo aktualizuje záznam ceny pre prácu a aktualizuje pole "Cena" v samotnom zázname
         * Ak už existuje záznam pre daný dátum, aktualizuje ho namiesto vytvárania nového
         * @param {Entry} workEntry - Záznam práce
         * @param {Number} newPrice - Nová cena
         * @param {Date} validFrom - Platnosť od
         */
        function createWorkPriceRecord(workEntry, newPrice, validFrom) {
            try {
                var workPricesLib = libByName(centralConfig.libraries.workPrices);
                var priceFields = CONFIG.priceFields.workPrices;

                // Konverzia dátumu na začiatok dňa pre presné porovnanie
                var dateOnly = new Date(validFrom);
                dateOnly.setHours(0, 0, 0, 0);

                // Hľadaj existujúci záznam pre túto prácu a dátum
                utils.addDebug(currentEntry, "    🔍 Hľadám existujúci cenový záznam pre dátum: " + moment(dateOnly).format("DD.MM.YYYY"));

                var existingPriceEntries = workPricesLib.entries();
                var existingEntry = null;

                for (var i = 0; i < existingPriceEntries.length; i++) {
                    var priceEntry = existingPriceEntries[i];

                    // Kontrola či tento záznam patrí k našej práci
                    var linkedWorks = utils.safeGetLinks(priceEntry, priceFields.work) || [];
                    var isSameWork = false;

                    for (var j = 0; j < linkedWorks.length; j++) {
                        if (linkedWorks[j].id === workEntry.id) {
                            isSameWork = true;
                            break;
                        }
                    }

                    if (!isSameWork) {
                        continue;
                    }

                    // Kontrola dátumu
                    var priceDate = utils.safeGet(priceEntry, priceFields.validFrom);
                    if (priceDate) {
                        var priceDateOnly = new Date(priceDate);
                        priceDateOnly.setHours(0, 0, 0, 0);

                        if (priceDateOnly.getTime() === dateOnly.getTime()) {
                            existingEntry = priceEntry;
                            break;
                        }
                    }
                }

                if (existingEntry) {
                    // Aktualizuj existujúci záznam
                    utils.addDebug(currentEntry, "    🔄 Aktualizujem existujúci cenový záznam, nová cena: " + newPrice.toFixed(2) + " €");
                    existingEntry.set(priceFields.price, newPrice);
                } else {
                    // Vytvor nový záznam
                    utils.addDebug(currentEntry, "    ✅ Vytváram nový cenový záznam, cena: " + newPrice.toFixed(2) + " €");
                    var newPriceEntry = workPricesLib.create({});
                    newPriceEntry.set(priceFields.work, [workEntry]);
                    newPriceEntry.set(priceFields.validFrom, dateOnly);
                    newPriceEntry.set(priceFields.price, newPrice);
                }

                // Aktualizuj aj pole "Cena" v samotnom zázname práce
                updateWorkItemPrice(workEntry, newPrice);

                return true;
            } catch (error) {
                utils.addError(currentEntry, "❌ Chyba pri vytváraní/aktualizácii cenového záznamu pre prácu: " + error.toString(), "createWorkPriceRecord", error);
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
            var materialWeightKg = 0;  // Celková hmotnosť materiálu v kg

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
                            try {
                                item.setAttr(attrs.price, finalPrice);
                                utils.addDebug(currentEntry, "    → Nastavená cena z DB: " + finalPrice.toFixed(2) + " €");
                            } catch (e) {
                                utils.addError(currentEntry, "⚠️ Chyba pri zápise ceny do atribútu: " + e.toString(), "setPrice", e);
                            }
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
                                try {
                                    item.setAttr(attrs.price, finalPrice);
                                    utils.addDebug(currentEntry, "    → Doplnená cena do atribútu: " + finalPrice.toFixed(2) + " €");
                                } catch (e) {
                                    utils.addError(currentEntry, "⚠️ Chyba pri doplnení ceny do atribútu: " + e.toString(), "setAttrPrice", e);
                                }
                            } else {
                                utils.addDebug(currentEntry, "    ❌ Žiadna cena - ani v DB ani ručná ani v zázname");
                                finalPrice = 0;
                            }
                        }
                    }

                    // Zaokrúhli finalPrice na 2 desatinné miesta pre správny výpočet
                    finalPrice = Math.round(finalPrice * 100) / 100;

                    // Vypočítaj cenu celkom a zaokrúhli na 2 desatinné miesta
                    var totalPrice = Math.round(quantity * finalPrice * 100) / 100;

                    // Bezpečné zapisovanie atribútu
                    try {
                        item.setAttr(attrs.totalPrice, totalPrice);
                    } catch (e) {
                        utils.addError(currentEntry, "⚠️ Chyba pri zápise totalPrice do atribútu materiálu: " + e.toString(), "materialTotalPrice", e);
                    }

                    materialSum += totalPrice;

                    // Získaj hmotnosť položky (v kg)
                    var itemWeight = 0;
                    try {
                        itemWeight = utils.safeGet(item, CONFIG.itemFields.material.weight) || 0;
                    } catch (e) {
                        itemWeight = 0;
                    }

                    // Vypočítaj celkovú hmotnosť tejto položky
                    if (itemWeight > 0) {
                        var itemTotalWeight = quantity * itemWeight;
                        materialWeightKg += itemTotalWeight;
                        utils.addDebug(currentEntry, "    ⚖️ Hmotnosť: " + itemWeight.toFixed(2) + " kg × " + quantity + " = " + itemTotalWeight.toFixed(2) + " kg");
                    } else {
                        utils.addDebug(currentEntry, "    ⚠️ Hmotnosť nie je zadaná alebo je 0");
                    }

                    // Získaj mernú jednotku
                    var itemUnit = "";
                    try {
                        itemUnit = item.field("mj") || "";
                    } catch (e) {
                        itemUnit = "";
                    }

                    // Zaznamenaj položku pre info report
                    materialItemsInfo.push({
                        name: itemName,
                        unit: itemUnit,
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
                            try {
                                item.setAttr(attrs.price, finalPrice);
                                utils.addDebug(currentEntry, "    → Nastavená cena z DB: " + finalPrice.toFixed(2) + " €");
                            } catch (e) {
                                utils.addError(currentEntry, "⚠️ Chyba pri zápise ceny do atribútu: " + e.toString(), "setPrice", e);
                            }
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
                                try {
                                    item.setAttr(attrs.price, finalPrice);
                                    utils.addDebug(currentEntry, "    → Doplnená cena do atribútu: " + finalPrice.toFixed(2) + " €");
                                } catch (e) {
                                    utils.addError(currentEntry, "⚠️ Chyba pri doplnení ceny do atribútu: " + e.toString(), "setAttrPrice", e);
                                }
                            } else {
                                utils.addDebug(currentEntry, "    ❌ Žiadna cena - ani v DB ani ručná ani v zázname");
                                finalPrice = 0;
                            }
                        }
                    }

                    // Zaokrúhli finalPrice na 2 desatinné miesta pre správny výpočet
                    finalPrice = Math.round(finalPrice * 100) / 100;

                    // Vypočítaj cenu celkom a zaokrúhli na 2 desatinné miesta
                    var totalPrice = Math.round(quantity * finalPrice * 100) / 100;

                    // Bezpečné zapisovanie atribútu
                    try {
                        item.setAttr(attrs.totalPrice, totalPrice);
                    } catch (e) {
                        utils.addError(currentEntry, "⚠️ Chyba pri zápise totalPrice do atribútu práce: " + e.toString(), "workTotalPrice", e);
                    }

                    workSum += totalPrice;

                    // Získaj mernú jednotku
                    var itemUnit = "";
                    try {
                        itemUnit = item.field("mj") || "";
                    } catch (e) {
                        itemUnit = "";
                    }

                    // Zaznamenaj položku pre info report
                    workItemsInfo.push({
                        name: itemName,
                        unit: itemUnit,
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

            // Konverzia hmotnosti z kg na tony
            var materialWeightTons = materialWeightKg / 1000;

            currentEntry.set(fields.materialSum, materialSum);
            currentEntry.set(fields.workSum, workSum);
            currentEntry.set(fields.totalSum, totalSum);
            currentEntry.set(fields.materialWeight, materialWeightTons);

            // Debug výstup
            utils.addDebug(currentEntry, "\n" + "=".repeat(50));
            utils.addDebug(currentEntry, "💰 SÚHRN CENOVEJ PONUKY DIELY:");
            utils.addDebug(currentEntry, "  • Materiál:     " + materialSum.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  • Práce:        " + workSum.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  " + "-".repeat(48));
            utils.addDebug(currentEntry, "  • CELKOM:       " + totalSum.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  " + "-".repeat(48));
            utils.addDebug(currentEntry, "  • Hmotnosť mat: " + materialWeightKg.toFixed(2) + " kg (" + materialWeightTons.toFixed(3) + " t)");
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

            return true;

        } catch (error) {
            utils.addError(currentEntry, "❌ KRITICKÁ CHYBA: " + error.toString() + ", Line: " + error.lineNumber, "MAIN", error);
            return false;
        }
    }

    return {
        partCalculate: partCalculate,
        version: "4.1.0"
    };
})();

// ==============================================
// BACKWARD COMPATIBILITY
// ==============================================
// Ak je dostupné entry(), automaticky spusti prepočet
if (typeof entry === 'function') {
    try {
        CPDielyCalculate.partCalculate(entry());
    } catch (e) {
        // Silent fail - pravdepodobne volaný ako modul z iného scriptu
    }
}
