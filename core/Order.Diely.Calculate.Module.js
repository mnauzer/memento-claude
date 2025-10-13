// ==============================================
// ZÁKAZKY DIELY - Hlavný prepočet (MODULE)
// Verzia: 2.0.0 | Dátum: 2025-10-12 | Autor: ASISTANTO
// Knižnica: Zákazky Diely (ID: iEUC79O2T)
// ==============================================
// 📋 FUNKCIA:
//    - Exportovateľný modul pre prepočet položiek zákazky (Materiál, Práce)
//    - Použitie: OrderDielyCalculate.partCalculate(entry());
//    - VŽDY získava ceny z databázy (ceny materiálu / ceny prác)
//    - Porovnanie ručne zadaných cien s cenami z databázy
//    - Dialóg pre update cien v databáze pri rozdieloch (PRED výpočtami)
//    - Automatické vytvorenie/aktualizácia cenových záznamov (max 1 na deň)
//    - Aktualizácia poľa "Cena" v záznamy materiálu/práce pri vytvorení/aktualizácii ceny
//    - Automatické použitie ceny z poľa "Cena" ak atribút nie je zadaný
//    - Automatické vyčistenie debug, error a info logov pri štarte
//    - Vytvorenie prehľadného textového reportu v info poli
//    - Výpočet celkovej hmotnosti materiálu v tonách (ak pole existuje)
// ==============================================
// 🔧 POUŽITIE:
//    // Z triggeru alebo action:
//    OrderDielyCalculate.partCalculate(entry());
//
//    // Z iného scriptu s parametrom:
//    var orderPart = lib("Zákazky Diely").find("Číslo", 1)[0];
//    OrderDielyCalculate.partCalculate(orderPart);
// ==============================================
// 🔧 CHANGELOG v2.0.0 (2025-10-12):
//    - REFACTOR: Pridaný cenový systém z CP.Diely.Calculate.Module.js v4.2.0
//    - NOVÁ FUNKCIA: Vždy kontroluje ceny v databáze a umožňuje ich aktualizáciu
//    - NOVÁ FUNKCIA: Dialóg pre update cien pri rozdieloch (PRED výpočtami)
//    - NOVÁ FUNKCIA: Automatické vytvorenie cenových záznamov pre položky bez DB ceny
//    - ZLEPŠENIE: Výpočty používajú DB ceny namiesto ručných cien z atribútov
//    - ZLEPŠENIE: Kontrola duplicít pri vytváraní cenových záznamov
// 🔧 CHANGELOG v1.0.0 (2025-10-12):
//    - MODULE VERSION: Zabalený do exportovateľného modulu
//    - NOVÁ FUNKCIA: partCalculate(partEntry) - hlavná exportovaná funkcia
//    - Použiteľné z iných scriptov, triggerov, action eventov
//    - Backward compatibility: Ak je dostupné entry(), automaticky sa zavolá
// ==============================================

var OrderDielyCalculate = (function() {
    'use strict';

    /**
     * Hlavná exportovaná funkcia pre prepočet Zákazky Diely
     * @param {Entry} partEntry - Záznam z knižnice "Zákazky Diely"
     * @returns {Boolean} - true ak prebehlo úspešne
     */
    function partCalculate(partEntry) {
        if (!partEntry) {
            throw new Error("OrderDielyCalculate.partCalculate(): Parameter 'partEntry' is required!");
        }

        // ==============================================
        // INICIALIZÁCIA MODULOV
        // ==============================================

        var utils = MementoUtils;
        var centralConfig = utils.config;
        var currentEntry = partEntry;

        var CONFIG = {
            // Script špecifické nastavenia
            scriptName: "Zákazky Diely - Prepočet (Module)",
            version: "2.0.0",

            // Referencie na centrálny config
            fields: centralConfig.fields.orderPart,
            attributes: {
                materials: centralConfig.attributes.orderPartMaterials,
                works: centralConfig.attributes.orderPartWorks
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
                work: "Cena"  // Cenník prác - priamo názov poľa
            }
        };

        // Globálne premenné pre zbieranie rozdielov v cenách
        var priceDifferences = [];

        // Globálne premenné pre zbieranie info o položkách
        var materialItemsInfo = [];
        var workItemsInfo = [];

        // Dátum pre cenové výpočty (bude nastavený v hlavnej logike)
        var currentDate = null;

        var fields = CONFIG.fields;

        // Vyčistiť debug, error a info logy pred začiatkom
        utils.clearLogs(currentEntry, true);  // true = vyčistí aj Error_Log

        utils.addDebug(currentEntry, "🚀 START: Prepočet zákazky Diely (Module v" + CONFIG.version + ")");

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
        function buildOrderPartInfoReport(materialSum, workSum, totalSum) {
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

            // Header s názvom a číslom DIELU + info o zákazke
            var partNumber = utils.safeGet(currentEntry, fields.number) || "";
            var partName = utils.safeGet(currentEntry, fields.name) || "Diel";
            var orderNumber = utils.safeGet(currentEntry, fields.orderNumber) || "";
            var orderDate = utils.safeGet(currentEntry, fields.date);

            report += "═════════════════════════════════════════\n";

            // Číslo a názov dielu
            if (partNumber) {
                report += partNumber + " • " + partName + "\n";
            } else {
                report += "📋 " + partName + "\n";
            }

            // Číslo zákazky a dátum
            if (orderNumber) {
                report += "Číslo zákazky: " + orderNumber + "\n";
            }
            if (orderDate) {
                report += "Dátum: " + moment(orderDate).format("DD.MM.YYYY") + "\n";
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
         * Nájde platnú cenu materiálu k danému dátumu
         * @param {Entry} materialEntry - Záznam materiálu
         * @param {Date} date - Dátum pre ktorý hľadáme cenu
         * @returns {Number|null} - Platná cena alebo null
         */
        function findMaterialPrice(materialEntry, date) {
            var options = {
                priceLibrary: "materialPrices",
                linkField: "material",
                dateField: "date",
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
                var priceFieldName = CONFIG.itemFields.material.price;
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
                var priceFieldName = CONFIG.itemFields.work;
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

                var dateOnly = new Date(validFrom);
                dateOnly.setHours(0, 0, 0, 0);

                utils.addDebug(currentEntry, "    🔍 Hľadám existujúci cenový záznam pre dátum: " + moment(dateOnly).format("DD.MM.YYYY"));

                var existingPriceEntries = materialPricesLib.entries();
                var existingEntry = null;

                for (var i = 0; i < existingPriceEntries.length; i++) {
                    var priceEntry = existingPriceEntries[i];
                    var linkedMaterials = utils.safeGetLinks(priceEntry, priceFields.material) || [];
                    var isSameMaterial = false;

                    for (var j = 0; j < linkedMaterials.length; j++) {
                        if (linkedMaterials[j].id === materialEntry.id) {
                            isSameMaterial = true;
                            break;
                        }
                    }

                    if (!isSameMaterial) continue;

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
                    utils.addDebug(currentEntry, "    🔄 Aktualizujem existujúci cenový záznam, nová cena: " + newPrice.toFixed(2) + " €");
                    existingEntry.set(priceFields.sellPrice, newPrice);
                } else {
                    utils.addDebug(currentEntry, "    ✅ Vytváram nový cenový záznam, cena: " + newPrice.toFixed(2) + " €");
                    var newPriceEntry = materialPricesLib.create({});
                    newPriceEntry.set(priceFields.material, [materialEntry]);
                    newPriceEntry.set(priceFields.date, dateOnly);
                    newPriceEntry.set(priceFields.sellPrice, newPrice);
                }

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

                var dateOnly = new Date(validFrom);
                dateOnly.setHours(0, 0, 0, 0);

                utils.addDebug(currentEntry, "    🔍 Hľadám existujúci cenový záznam pre dátum: " + moment(dateOnly).format("DD.MM.YYYY"));

                var existingPriceEntries = workPricesLib.entries();
                var existingEntry = null;

                for (var i = 0; i < existingPriceEntries.length; i++) {
                    var priceEntry = existingPriceEntries[i];
                    var linkedWorks = utils.safeGetLinks(priceEntry, priceFields.work) || [];
                    var isSameWork = false;

                    for (var j = 0; j < linkedWorks.length; j++) {
                        if (linkedWorks[j].id === workEntry.id) {
                            isSameWork = true;
                            break;
                        }
                    }

                    if (!isSameWork) continue;

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
                    utils.addDebug(currentEntry, "    🔄 Aktualizujem existujúci cenový záznam, nová cena: " + newPrice.toFixed(2) + " €");
                    existingEntry.set(priceFields.price, newPrice);
                } else {
                    utils.addDebug(currentEntry, "    ✅ Vytváram nový cenový záznam, cena: " + newPrice.toFixed(2) + " €");
                    var newPriceEntry = workPricesLib.create({});
                    newPriceEntry.set(priceFields.work, [workEntry]);
                    newPriceEntry.set(priceFields.validFrom, dateOnly);
                    newPriceEntry.set(priceFields.price, newPrice);
                }

                updateWorkItemPrice(workEntry, newPrice);

                return true;
            } catch (error) {
                utils.addError(currentEntry, "❌ Chyba pri vytváraní/aktualizácii cenového záznamu pre prácu: " + error.toString(), "createWorkPriceRecord", error);
                return false;
            }
        }

        /**
         * Automaticky vytvorí cenové záznamy pre položky s autoCreate flag
         * @param {Array} autoCreateItems - Položky na automatické vytvorenie
         */
        function processAutoCreatePrices(autoCreateItems) {
            if (!autoCreateItems || autoCreateItems.length === 0) return;

            utils.addDebug(currentEntry, "\n🤖 Automatické vytvorenie cenových záznamov");
            utils.addDebug(currentEntry, "  Počet položiek: " + autoCreateItems.length);

            var successCount = 0;
            var failCount = 0;

            for (var i = 0; i < autoCreateItems.length; i++) {
                var diff = autoCreateItems[i];
                utils.addDebug(currentEntry, "  Vytváram: " + diff.itemName + " (" + diff.type + "), cena: " + diff.manualPrice.toFixed(2) + " €");

                var success = false;
                if (diff.type === "Materiál") {
                    success = createMaterialPriceRecord(diff.itemEntry, diff.manualPrice, currentDate);
                } else if (diff.type === "Práce") {
                    success = createWorkPriceRecord(diff.itemEntry, diff.manualPrice, currentDate);
                }

                if (success) successCount++;
                else failCount++;
            }

            utils.addDebug(currentEntry, "  ✅ Úspešne vytvorených: " + successCount);
            if (failCount > 0) utils.addDebug(currentEntry, "  ❌ Neúspešných: " + failCount);
        }

        /**
         * Zobrazí dialóg s rozdielmi v cenách a umožní používateľovi potvrdiť aktualizáciu
         */
        function showPriceDifferenceDialog() {
            var autoCreateItems = [];
            var manualUpdateItems = [];

            for (var i = 0; i < priceDifferences.length; i++) {
                var diff = priceDifferences[i];
                if (diff.autoCreate === true) autoCreateItems.push(diff);
                else manualUpdateItems.push(diff);
            }

            if (autoCreateItems.length > 0) processAutoCreatePrices(autoCreateItems);
            if (manualUpdateItems.length === 0) return;

            var dialogMessage = "Našli sa rozdiely medzi zadanými cenami a cenami v databáze:\n\n";

            for (var i = 0; i < manualUpdateItems.length; i++) {
                var diff = manualUpdateItems[i];
                dialogMessage += (i + 1) + ". " + diff.itemName + " (" + diff.type + ")\n";
                dialogMessage += "   • Zadaná cena: " + diff.manualPrice.toFixed(2) + " €\n";
                dialogMessage += "   • Cena v DB:   " + (diff.dbPrice ? diff.dbPrice.toFixed(2) + " €" : "neexistuje") + "\n";
                dialogMessage += "   • Rozdiel:     " + diff.difference.toFixed(2) + " €\n\n";
            }

            dialogMessage += "Chcete aktualizovať ceny v databáze?\n";
            dialogMessage += "(Vytvorí/aktualizuje cenový záznam s dátumom: " + moment(currentDate).format("DD.MM.YYYY") + ")";

            dialog()
                .title("🔍 Zistené rozdiely v cenách")
                .text(dialogMessage)
                .positiveButton("Áno, aktualizovať", function() {
                    processPriceUpdates(manualUpdateItems);
                })
                .negativeButton("Nie, zrušiť", function() {
                    utils.addDebug(currentEntry, "  ℹ️ Používateľ zrušil aktualizáciu cien");
                })
                .show();
        }

        /**
         * Spracuje update cien v databáze
         * @param {Array} itemsToUpdate - Položky na aktualizáciu (z dialógu)
         */
        function processPriceUpdates(itemsToUpdate) {
            utils.addDebug(currentEntry, "\n💾 Aktualizácia cien v databáze (manuálne potvrdené)");

            var successCount = 0;
            var failCount = 0;

            for (var i = 0; i < itemsToUpdate.length; i++) {
                var diff = itemsToUpdate[i];
                utils.addDebug(currentEntry, "  Aktualizujem: " + diff.itemName + " (" + diff.type + ")");

                var success = false;
                if (diff.type === "Materiál") {
                    success = createMaterialPriceRecord(diff.itemEntry, diff.manualPrice, currentDate);
                } else if (diff.type === "Práce") {
                    success = createWorkPriceRecord(diff.itemEntry, diff.manualPrice, currentDate);
                }

                if (success) successCount++;
                else failCount++;
            }

            utils.addDebug(currentEntry, "  ✅ Úspešne aktualizovaných: " + successCount);
            if (failCount > 0) utils.addDebug(currentEntry, "  ❌ Neúspešných: " + failCount);

            message("Aktualizácia dokončená:\n✅ Úspešných: " + successCount + "\n" + (failCount > 0 ? "❌ Chýb: " + failCount : ""));
        }

        /**
         * Aktualizuje číslo, názov a dátum zákazky z nadriadeného záznamu
         * Hľadá linksFrom z knižnice "Zákazky" a kopíruje Číslo, Názov a Dátum
         * @returns {Date|null} - Dátum zo zákazky alebo null
         */
        function updateOrderInfo() {
            try {
                var orderLibraryName = centralConfig.libraries.orders; // "Zákazky"
                var partsFieldName = centralConfig.fields.order.parts; // "Diely"

                utils.addDebug(currentEntry, "\n🔗 Aktualizácia údajov zo zákazky");
                utils.addDebug(currentEntry, "  Hľadám v knižnici: " + orderLibraryName);
                utils.addDebug(currentEntry, "  Pole: " + partsFieldName);

                // Získaj linksFrom z nadriadenej zákazky
                var orderEntries = utils.safeGetLinksFrom(currentEntry, orderLibraryName, partsFieldName);

                if (!orderEntries || orderEntries.length === 0) {
                    utils.addDebug(currentEntry, "  ⚠️ Nenašiel som nadriadenú zákazku");
                    return null;
                }

                // Použij prvý nájdený záznam (malo by byť len jeden)
                var orderEntry = orderEntries[0];

                // Získaj číslo, názov a dátum zo zákazky
                var orderNumber = utils.safeGet(orderEntry, centralConfig.fields.order.number);
                var orderName = utils.safeGet(orderEntry, centralConfig.fields.order.name);
                var orderDate = utils.safeGet(orderEntry, centralConfig.fields.order.date);

                utils.addDebug(currentEntry, "  ✅ Nájdená zákazka:");
                utils.addDebug(currentEntry, "     Číslo: " + (orderNumber || "neznáme"));
                utils.addDebug(currentEntry, "     Názov: " + (orderName || "neznámy"));
                utils.addDebug(currentEntry, "     Dátum: " + (orderDate ? moment(orderDate).format("DD.MM.YYYY") : "neznámy"));

                // Zapíš do polí dielu
                if (orderNumber) {
                    currentEntry.set(fields.orderNumber, orderNumber);
                }
                if (orderName) {
                    currentEntry.set(fields.name, orderName);
                }
                if (orderDate) {
                    currentEntry.set(fields.date, orderDate);
                }

                return orderDate;

            } catch (error) {
                utils.addError(currentEntry, "❌ Chyba pri aktualizácii údajov zo zákazky: " + error.toString(), "updateOrderInfo", error);
                return null;
            }
        }

        // ==============================================
        // HLAVNÁ LOGIKA PREPOČTU
        // ==============================================

        try {
            // ========== AKTUALIZÁCIA ÚDAJOV ZO ZÁKAZKY ==========
            var orderDateFromParent = updateOrderInfo();

            // Určenie dátumu pre výpočty - priorita má dátum zo zákazky
            var currentDate = orderDateFromParent || utils.safeGet(currentEntry, fields.date);

            if (!currentDate) {
                currentDate = new Date();
                utils.addDebug(currentEntry, "⚠️ Dátum nie je zadaný ani v zákazke ani v Diely, použijem dnešný dátum");
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

                    // Získaj názov materiálu
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

                        // VŽDY používaj DB cenu pre výpočty
                        finalPrice = dbPrice;

                        // Ak je zadaná ručná cena, porovnaj a zaznamenaj rozdiel
                        if (manualPrice && manualPrice > 0) {
                            var difference = Math.abs(manualPrice - dbPrice);

                            if (difference > 0.01) { // Tolerancia 1 cent
                                utils.addDebug(currentEntry, "    ⚠️ ROZDIEL: Ručná cena (" + manualPrice.toFixed(2) + " €) vs DB cena (" + dbPrice.toFixed(2) + " €)");
                                utils.addDebug(currentEntry, "    → Pre výpočty použijem DB cenu: " + dbPrice.toFixed(2) + " €");

                                // Zaznamenaj rozdiel pre dialóg a update DB
                                priceDifferences.push({
                                    itemEntry: item,
                                    itemName: itemName,
                                    type: "Materiál",
                                    manualPrice: manualPrice,
                                    dbPrice: dbPrice,
                                    difference: difference
                                });
                            }
                        } else {
                            // Nie je zadaná ručná cena, doplň DB cenu do atribútu
                            try {
                                item.setAttr(attrs.price, finalPrice);
                                utils.addDebug(currentEntry, "    → Doplnená cena z DB do atribútu: " + finalPrice.toFixed(2) + " €");
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
                            var itemPriceField = CONFIG.itemFields.material.price;
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
                                    autoCreate: true
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

                    // Zaokrúhli finalPrice na 2 desatinné miesta
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

                    // Získaj hmotnosť položky (v kg) - ak pole existuje
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

                    // Získaj názov práce
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

                        // VŽDY používaj DB cenu pre výpočty
                        finalPrice = dbPrice;

                        // Ak je zadaná ručná cena, porovnaj a zaznamenaj rozdiel
                        if (manualPrice && manualPrice > 0) {
                            var difference = Math.abs(manualPrice - dbPrice);

                            if (difference > 0.01) { // Tolerancia 1 cent
                                utils.addDebug(currentEntry, "    ⚠️ ROZDIEL: Ručná cena (" + manualPrice.toFixed(2) + " €) vs DB cena (" + dbPrice.toFixed(2) + " €)");
                                utils.addDebug(currentEntry, "    → Pre výpočty použijem DB cenu: " + dbPrice.toFixed(2) + " €");

                                // Zaznamenaj rozdiel pre dialóg a update DB
                                priceDifferences.push({
                                    itemEntry: item,
                                    itemName: itemName,
                                    type: "Práce",
                                    manualPrice: manualPrice,
                                    dbPrice: dbPrice,
                                    difference: difference
                                });
                            }
                        } else {
                            // Nie je zadaná ručná cena, doplň DB cenu do atribútu
                            try {
                                item.setAttr(attrs.price, finalPrice);
                                utils.addDebug(currentEntry, "    → Doplnená cena z DB do atribútu: " + finalPrice.toFixed(2) + " €");
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
                            var itemPriceField = CONFIG.itemFields.work;
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
                                    autoCreate: true
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

                    // Zaokrúhli finalPrice na 2 desatinné miesta
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

            // Konverzia hmotnosti z kg na tony (ak pole existuje)
            var materialWeightTons = materialWeightKg / 1000;

            currentEntry.set(fields.materialSum, materialSum);
            currentEntry.set(fields.workSum, workSum);
            currentEntry.set(fields.totalSum, totalSum);

            // Hmotnosť materiálu - len ak pole existuje
            if (fields.materialWeight) {
                try {
                    currentEntry.set(fields.materialWeight, materialWeightTons);
                } catch (e) {
                    utils.addDebug(currentEntry, "  ℹ️ Pole 'Hmotnosť materiálu' neexistuje v knižnici");
                }
            }

            // Debug výstup
            utils.addDebug(currentEntry, "\n" + "=".repeat(50));
            utils.addDebug(currentEntry, "💰 SÚHRN ZÁKAZKY DIELY:");
            utils.addDebug(currentEntry, "  • Materiál:     " + materialSum.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  • Práce:        " + workSum.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  " + "-".repeat(48));
            utils.addDebug(currentEntry, "  • CELKOM:       " + totalSum.toFixed(2) + " €");
            if (materialWeightKg > 0) {
                utils.addDebug(currentEntry, "  " + "-".repeat(48));
                utils.addDebug(currentEntry, "  • Hmotnosť mat: " + materialWeightKg.toFixed(2) + " kg (" + materialWeightTons.toFixed(3) + " t)");
            }
            utils.addDebug(currentEntry, "=".repeat(50));

            // ========== VYTVORENIE INFO REPORTU ==========
            var infoReport = buildOrderPartInfoReport(materialSum, workSum, totalSum);

            // Vymaž predchádzajúce info
            currentEntry.set(centralConfig.fields.common.info, "");

            // Zapíš prehľadný report do info poľa
            var infoFieldName = centralConfig.fields.common.info || "info";
            currentEntry.set(infoFieldName, infoReport);

            utils.addDebug(currentEntry, "\n📄 INFO REPORT: Vytvorený prehľadný report s " +
                (materialItemsInfo.length + workItemsInfo.length) + " položkami");

            utils.addDebug(currentEntry, "✅ FINISH: Prepočet zákazky Diely úspešne dokončený");

            return true;

        } catch (error) {
            utils.addError(currentEntry, "❌ KRITICKÁ CHYBA: " + error.toString() + ", Line: " + error.lineNumber, "MAIN", error);
            return false;
        }
    }

    return {
        partCalculate: partCalculate,
        version: "2.0.0"
    };
})();

// ==============================================
// BACKWARD COMPATIBILITY
// ==============================================
// Ak je dostupné entry(), automaticky spusti prepočet
if (typeof entry === 'function') {
    try {
        OrderDielyCalculate.partCalculate(entry());
    } catch (e) {
        // Silent fail - pravdepodobne volaný ako modul z iného scriptu
    }
}
