// ==============================================
// ZÁKAZKY DIELY - Hlavný prepočet (MODULE)
// Verzia: 1.0.0 | Dátum: 2025-10-12 | Autor: ASISTANTO
// Knižnica: Zákazky Diely (ID: iEUC79O2T)
// ==============================================
// 📋 FUNKCIA:
//    - Exportovateľný modul pre prepočet položiek zákazky (Materiál, Práce)
//    - Použitie: OrderDielyCalculate.partCalculate(entry());
//    - Prepočet súčtov z atribútov (bez cenovej logiky - ceny sú fixované)
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
// 🔧 CHANGELOG v1.0.0 (2025-10-12):
//    - MODULE VERSION: Zabalený do exportovateľného modulu
//    - NOVÁ FUNKCIA: partCalculate(partEntry) - hlavná exportovaná funkcia
//    - Použiteľné z iných scriptov, triggerov, action eventov
//    - Backward compatibility: Ak je dostupné entry(), automaticky sa zavolá
//    - Zjednodušená logika oproti CP.Diely - len súčty z atribútov, bez cenového systému
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
            version: "1.0.0",

            // Referencie na centrálny config
            fields: centralConfig.fields.orderPart,
            attributes: {
                materials: centralConfig.attributes.orderPartMaterials || {
                    quantity: "množstvo",
                    price: "cena",
                    totalPrice: "cena celkom"
                },
                works: centralConfig.attributes.orderPartWorks || {
                    quantity: "množstvo",
                    price: "cena",
                    totalPrice: "cena celkom"
                }
            },
            icons: centralConfig.icons,

            // Polia pre položky (materiál a práce)
            itemFields: {
                material: centralConfig.fields.items  // Materiál
            }
        };

        // Globálne premenné pre zbieranie info o položkách
        var materialItemsInfo = [];
        var workItemsInfo = [];

        var fields = CONFIG.fields;

        // Vyčistiť debug, error a info logy pred začiatkom
        utils.clearLogs(currentEntry, true);  // true = vyčistí aj Error_Log

        utils.addDebug(currentEntry, "🚀 START: Prepočet zákazky Diely (Module v1.0.0)");

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
                    var price = item.attr(attrs.price) || 0;

                    utils.addDebug(currentEntry, "  • Položka #" + (i + 1) + ": " + itemName);
                    utils.addDebug(currentEntry, "    Množstvo: " + quantity + ", Cena: " + price.toFixed(2) + " €");

                    // Zaokrúhli cenu na 2 desatinné miesta
                    price = Math.round(price * 100) / 100;

                    // Vypočítaj cenu celkom a zaokrúhli na 2 desatinné miesta
                    var totalPrice = Math.round(quantity * price * 100) / 100;

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
                        price: price,
                        totalPrice: totalPrice
                    });

                    utils.addDebug(currentEntry, "    💰 Cena: " + price.toFixed(2) + " €, Celkom: " + totalPrice.toFixed(2) + " €");
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
                    var price = item.attr(attrs.price) || 0;

                    utils.addDebug(currentEntry, "  • Položka #" + (i + 1) + ": " + itemName);
                    utils.addDebug(currentEntry, "    Množstvo: " + quantity + ", Cena: " + price.toFixed(2) + " €");

                    // Zaokrúhli cenu na 2 desatinné miesta
                    price = Math.round(price * 100) / 100;

                    // Vypočítaj cenu celkom a zaokrúhli na 2 desatinné miesta
                    var totalPrice = Math.round(quantity * price * 100) / 100;

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
                        price: price,
                        totalPrice: totalPrice
                    });

                    utils.addDebug(currentEntry, "    💰 Cena: " + price.toFixed(2) + " €, Celkom: " + totalPrice.toFixed(2) + " €");
                }

                utils.addDebug(currentEntry, "  ✅ Práce suma: " + workSum.toFixed(2) + " €");
            } else {
                utils.addDebug(currentEntry, "  ℹ️ Žiadne položky prác");
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
        version: "1.0.0"
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
