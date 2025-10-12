/**
 * CENOVÉ PONUKY - Vytvorenie/Aktualizácia Zákazky (MODULE)
 *
 * Typ scriptu: Function Library (použiteľné v iných scriptoch)
 * Knižnica: Cenové ponuky
 *
 * Popis:
 * - Exportovateľný modul pre vytvorenie/aktualizáciu zákazky z cenovej ponuky
 * - Použitie: CPCreateOrder.createOrder(entry());
 * - Pri CREATE: Vytvorí zákazku + všetky diely v Zákazky Diely
 * - Pri UPDATE: Sync všetky polia + vytvorí chýbajúce diely (existujúce diely zostávajú bez zmeny)
 * - Prepojenie: Zákazky → linkToEntry Cenové ponuky (vytvorí linksFrom)
 * - Automatické generovanie čísla zákazky pomocou MementoAutoNumber
 * - Zbieranie dielov zo všetkých troch polí (Diely, Diely HZS, Subdodávky)
 *
 * Verzia: 2.1.1
 * Dátum: 2025-10-12
 * Autor: ASISTANTO
 *
 * CHANGELOG:
 * v2.1.1 (2025-10-12):
 *   - FIX: Duplikácia materials/works v UPDATE móde - vyčistenie existujúcich linkov pred pridaním nových
 * v2.1.0 (2025-10-12):
 *   - FIX: Mapovanie atribútov: cena -> cena cp pre Zákazky Diely
 *   - Používa centralConfig.attributes.orderPartMaterials a orderPartWorks
 * v2.0.0 (2025-10-12):
 *   - MODULE VERSION: Zabalený do exportovateľného modulu
 *   - NOVÁ FUNKCIA: createOrder(quoteEntry) - hlavná exportovaná funkcia
 *   - Použiteľné z iných scriptov, triggerov, action eventov
 *   - Vracia objekt s výsledkom: { success, message, order, partsCreated, mode }
 *   - Zachovaná 1:1 funkcionalita z CP.Action.CreateOrder.js v1.6.0
 *   - FIX: Zbieranie dielov zo všetkých troch polí (Diely, Diely HZS, Subdodávky)
 *   - Backward compatibility: Ak je dostupné entry(), automaticky sa zavolá
 */

var CPCreateOrder = (function() {
    'use strict';

    /**
     * Hlavná exportovaná funkcia pre vytvorenie/aktualizáciu zákazky
     * @param {Entry} quoteEntry - Záznam z knižnice "Cenové ponuky"
     * @returns {Object} - { success: boolean, message: string, order: Entry, partsCreated: number, mode: string }
     */
    function createOrder(quoteEntry) {
        var result = {
            success: false,
            message: "",
            order: null,
            partsCreated: 0,
            mode: "" // "CREATE" alebo "UPDATE"
        };

        if (!quoteEntry) {
            result.message = "❌ Parameter 'quoteEntry' is required!";
            return result;
        }

        try {
            var utils = MementoUtils;
            var centralConfig = MementoConfig.getConfig();

            var CONFIG = {
                scriptName: "Cenové ponuky - Vytvorenie/Aktualizácia zákazky (Module)",
                version: "2.1.0"
            };

            utils.clearLogs(quoteEntry);
            utils.addDebug(quoteEntry, "🚀 ŠTART: " + CONFIG.scriptName + " v" + CONFIG.version);
            utils.addDebug(quoteEntry, "📅 Dátum: " + moment().format("DD.MM.YYYY HH:mm:ss"));
            utils.addDebug(quoteEntry, "");

            // Získaj konfiguračné polia
            var fields = centralConfig.fields.quote;
            var orderFields = centralConfig.fields.order;
            var quotePartFields = centralConfig.fields.quotePart;
            var orderPartFields = centralConfig.fields.orderPart;

            // Získaj knižnice
            var ordersLib = libByName("Zákazky");
            var orderPartsLib = libByName("Zákazky Diely");

            if (!ordersLib) {
                throw new Error("Knižnica 'Zákazky' nebola nájdená");
            }
            if (!orderPartsLib) {
                throw new Error("Knižnica 'Zákazky Diely' nebola nájdená");
            }

            // ==============================================
            // KROK 1: KONTROLA EXISTENCIE ZÁKAZKY
            // ==============================================

            utils.addDebug(quoteEntry, "📋 KROK 1: Kontrola existencie zákazky");
            utils.addDebug(quoteEntry, "");

            var quoteNumber = utils.safeGet(quoteEntry, fields.number) || "";
            var quoteName = utils.safeGet(quoteEntry, fields.name) || "";

            utils.addDebug(quoteEntry, "  Cenová ponuka:");
            utils.addDebug(quoteEntry, "    Číslo: " + quoteNumber);
            utils.addDebug(quoteEntry, "    Názov: " + quoteName);
            utils.addDebug(quoteEntry, "");

            // Nájdi existujúcu zákazku cez linksFrom
            var existingOrders = utils.safeGetLinksFrom(quoteEntry, "Zákazky", "Cenová ponuka");
            var orderExists = existingOrders.length > 0;
            var order = orderExists ? existingOrders[0] : null;

            result.mode = orderExists ? "UPDATE" : "CREATE";

            if (orderExists) {
                utils.addDebug(quoteEntry, "  ✅ Nájdená existujúca zákazka:");
                utils.addDebug(quoteEntry, "    Číslo: " + utils.safeGet(order, orderFields.number));
                utils.addDebug(quoteEntry, "    Názov: " + utils.safeGet(order, orderFields.name));
                utils.addDebug(quoteEntry, "    Režim: UPDATE (aktualizácia polí + vytvorenie chýbajúcich dielov)");
            } else {
                utils.addDebug(quoteEntry, "  ℹ️ Zákazka neexistuje");
                utils.addDebug(quoteEntry, "    Režim: CREATE (vytvorenie novej zákazky + všetkých dielov)");
            }
            utils.addDebug(quoteEntry, "");

            // ==============================================
            // KROK 2: PRÍPRAVA DÁT PRE SYNCHRONIZÁCIU
            // ==============================================

            utils.addDebug(quoteEntry, "📋 KROK 2: Príprava dát pre synchronizáciu");
            utils.addDebug(quoteEntry, "");

            var syncData = {};

            // === ZÁKLADNÉ IDENTIFIKAČNÉ POLIA ===
            syncData[orderFields.number] = utils.safeGet(quoteEntry, fields.number);
            syncData[orderFields.name] = utils.safeGet(quoteEntry, fields.name);
            syncData[orderFields.description] = utils.safeGet(quoteEntry, fields.description);
            syncData[orderFields.date] = new Date();
            syncData[orderFields.orderCalculationType] = utils.safeGet(quoteEntry, fields.type);
            syncData[orderFields.place] = utils.safeGetLinks(quoteEntry, fields.place);

            // === KLIENT Z MIESTA ===
            var placeEntries = utils.safeGetLinks(quoteEntry, fields.place);
            if (placeEntries && placeEntries.length > 0) {
                var placeEntry = placeEntries[0];
                var clientEntries = utils.safeGetLinks(placeEntry, centralConfig.fields.place.customer);
                if (clientEntries && clientEntries.length > 0) {
                    syncData[orderFields.client] = clientEntries;
                }
            }

            // === ÚČTOVANIE DOPRAVY ===
            syncData[orderFields.rideCalculation] = utils.safeGet(quoteEntry, fields.rideCalculation);
            syncData[orderFields.transportPercentage] = utils.safeGet(quoteEntry, fields.ridePercentage);
            syncData[orderFields.transportFlatRate] = utils.safeGetLinks(quoteEntry, fields.rideFlatRate);
            syncData[orderFields.transportPricePerKm] = utils.safeGet(quoteEntry, fields.ridePricePerKm);
            syncData[orderFields.expectedKm] = utils.safeGet(quoteEntry, fields.expectedKm);
            syncData[orderFields.expectedRidesCount] = utils.safeGet(quoteEntry, fields.expectedRidesCount);

            // === ÚČTOVANIE PRESUNU HMÔT ===
            syncData[orderFields.massTransferCalculation] = utils.safeGet(quoteEntry, fields.massTransferCalculation);
            syncData[orderFields.massTransferPercentage] = utils.safeGet(quoteEntry, fields.massTransferPercentage);
            syncData[orderFields.massTransferPricePerTon] = utils.safeGet(quoteEntry, fields.massTransferPricePerTon);
            syncData[orderFields.massTransferFlatRate] = utils.safeGetLinks(quoteEntry, fields.massTransferFlatRate);
            syncData[orderFields.massTransferFixedPrice] = utils.safeGet(quoteEntry, fields.massTransferFixedPrice);

            // === ÚČTOVANIE SUBDODÁVOK ===
            syncData[orderFields.subcontractCalculation] = utils.safeGet(quoteEntry, fields.subcontractsCalculation);
            syncData[orderFields.subcontractorMarkup] = utils.safeGet(quoteEntry, fields.subcontractsPercentage);

            // === CENOVÉ POLIA ===
            syncData[orderFields.total] = utils.safeGet(quoteEntry, fields.total);
            syncData[orderFields.transportPrice] = utils.safeGet(quoteEntry, fields.transportPrice);
            syncData[orderFields.massTransferPrice] = utils.safeGet(quoteEntry, fields.massTransferPrice);
            syncData[orderFields.vatRate] = utils.safeGet(quoteEntry, fields.vatRate);
            syncData[orderFields.vat] = utils.safeGet(quoteEntry, fields.vat);
            syncData[orderFields.totalWithVat] = utils.safeGet(quoteEntry, fields.totalWithVat);
            syncData[orderFields.materialWeight] = utils.safeGet(quoteEntry, fields.materialWeight);

            // === LINKTOENTRY DO CENOVEJ PONUKY ===
            syncData[orderFields.quote] = [quoteEntry];

            utils.addDebug(quoteEntry, "  ✅ Dáta pripravené pre synchronizáciu");
            utils.addDebug(quoteEntry, "");

            // ==============================================
            // KROK 3: VYTVORENIE/AKTUALIZÁCIA ZÁKAZKY
            // ==============================================

            utils.addDebug(quoteEntry, "📋 KROK 3: " + (orderExists ? "Aktualizácia" : "Vytvorenie") + " zákazky");
            utils.addDebug(quoteEntry, "");

            if (!orderExists) {
                // === CREATE MODE ===
                order = ordersLib.create({});

                if (!order) {
                    throw new Error("Nepodarilo sa vytvoriť záznam v knižnici Zákazky");
                }

                utils.addDebug(quoteEntry, "  ✅ Nová zákazka vytvorená");

                // Automatické generovanie čísla zákazky
                var orderNumber = "";
                try {
                    if (typeof MementoAutoNumber !== 'undefined' && MementoAutoNumber.isLoaded && MementoAutoNumber.isLoaded()) {
                        var numberResult = MementoAutoNumber.generateNumber(
                            "Zákazky",
                            "Číslo",
                            "Z Placeholder"
                        );

                        if (numberResult.success) {
                            orderNumber = numberResult.number;
                            utils.addDebug(quoteEntry, "    ✅ Vygenerované číslo: " + orderNumber);
                        } else {
                            utils.addDebug(quoteEntry, "    ⚠️ Chyba pri generovaní čísla: " + numberResult.error);
                            utils.addDebug(quoteEntry, "    ℹ️ Použije sa číslo z cenovej ponuky");
                            orderNumber = quoteNumber;
                        }
                    } else {
                        utils.addDebug(quoteEntry, "    ℹ️ MementoAutoNumber nie je dostupný");
                        utils.addDebug(quoteEntry, "    ℹ️ Použije sa číslo z cenovej ponuky");
                        orderNumber = quoteNumber;
                    }
                } catch (e) {
                    utils.addDebug(quoteEntry, "    ⚠️ Chyba pri volaní MementoAutoNumber: " + e.toString());
                    utils.addDebug(quoteEntry, "    ℹ️ Použije sa číslo z cenovej ponuky");
                    orderNumber = quoteNumber;
                }

                syncData[orderFields.number] = orderNumber;

                // Nastav všetky polia
                for (var fieldName in syncData) {
                    if (syncData.hasOwnProperty(fieldName)) {
                        var value = syncData[fieldName];
                        if (value !== null && value !== undefined) {
                            try {
                                order.set(fieldName, value);
                            } catch (e) {
                                utils.addDebug(quoteEntry, "  ⚠️ Chyba pri nastavení poľa '" + fieldName + "': " + e.toString());
                            }
                        }
                    }
                }

                // Vytvor linkToEntry: Zákazka → Cenová ponuka
                order.set(orderFields.quote, [quoteEntry]);

                utils.addDebug(quoteEntry, "  ✅ Zákazka vytvorená");
                utils.addDebug(quoteEntry, "    Číslo: " + utils.safeGet(order, orderFields.number));
                utils.addDebug(quoteEntry, "    Názov: " + utils.safeGet(order, orderFields.name));
                utils.addDebug(quoteEntry, "");

            } else {
                // === UPDATE MODE ===
                // Aktualizuj všetky polia OKREM čísla zákazky
                for (var fieldName in syncData) {
                    if (syncData.hasOwnProperty(fieldName)) {
                        // Preskočiť číslo zákazky - to sa nemení pri aktualizácii
                        if (fieldName === orderFields.number) {
                            continue;
                        }

                        var value = syncData[fieldName];
                        if (value !== null && value !== undefined) {
                            try {
                                order.set(fieldName, value);
                            } catch (e) {
                                utils.addDebug(quoteEntry, "  ⚠️ Chyba pri aktualizácii poľa '" + fieldName + "': " + e.toString());
                            }
                        }
                    }
                }

                utils.addDebug(quoteEntry, "  ✅ Zákazka aktualizovaná");
                utils.addDebug(quoteEntry, "    Číslo: " + utils.safeGet(order, orderFields.number));
                utils.addDebug(quoteEntry, "    Názov: " + utils.safeGet(order, orderFields.name));
                utils.addDebug(quoteEntry, "");
            }

            // ==============================================
            // KROK 4: VYTVORENIE/AKTUALIZÁCIA DIELOV
            // ==============================================

            utils.addDebug(quoteEntry, "📋 KROK 4: " + (orderExists ? "Aktualizácia dielov zákazky" : "Vytvorenie dielov zákazky"));
            utils.addDebug(quoteEntry, "");

            // Zbieranie dielov zo všetkých troch polí do objektov s metadátami
            var quoteParts = [];

            // Pole 1: Diely -> Diely
            var parts1 = utils.safeGetLinks(quoteEntry, fields.parts) || [];
            utils.addDebug(quoteEntry, "  Diely: " + parts1.length + " položiek");
            for (var p1 = 0; p1 < parts1.length; p1++) {
                quoteParts.push({
                    entry: parts1[p1],
                    sourceField: "Diely",
                    targetField: orderFields.parts
                });
            }

            // Pole 2: Diely HZS -> Diely HZS
            var parts2 = utils.safeGetLinks(quoteEntry, fields.partsHzs) || [];
            utils.addDebug(quoteEntry, "  Diely HZS: " + parts2.length + " položiek");
            for (var p2 = 0; p2 < parts2.length; p2++) {
                quoteParts.push({
                    entry: parts2[p2],
                    sourceField: "Diely HZS",
                    targetField: orderFields.partsHzs
                });
            }

            // Pole 3: Subdodávky -> Subdodávky
            var parts3 = utils.safeGetLinks(quoteEntry, fields.subcontracts) || [];
            utils.addDebug(quoteEntry, "  Subdodávky: " + parts3.length + " položiek");
            for (var p3 = 0; p3 < parts3.length; p3++) {
                quoteParts.push({
                    entry: parts3[p3],
                    sourceField: "Subdodávky",
                    targetField: orderFields.subcontracts
                });
            }

            utils.addDebug(quoteEntry, "  📊 CELKOM dielov v cenovej ponuke: " + quoteParts.length);

            // Pri UPDATE: Získaj existujúce diely zákazky zo všetkých troch polí a vytvor mapu podľa čísla
            var existingPartsMap = {};
            if (orderExists) {
                var allExistingParts = [];

                // Diely
                var existingParts1 = utils.safeGetLinks(order, orderFields.parts) || [];
                for (var e1 = 0; e1 < existingParts1.length; e1++) {
                    allExistingParts.push(existingParts1[e1]);
                }

                // Diely HZS
                var existingParts2 = utils.safeGetLinks(order, orderFields.partsHzs) || [];
                for (var e2 = 0; e2 < existingParts2.length; e2++) {
                    allExistingParts.push(existingParts2[e2]);
                }

                // Subdodávky
                var existingParts3 = utils.safeGetLinks(order, orderFields.subcontracts) || [];
                for (var e3 = 0; e3 < existingParts3.length; e3++) {
                    allExistingParts.push(existingParts3[e3]);
                }

                utils.addDebug(quoteEntry, "  Počet existujúcich dielov v zákazke: " + allExistingParts.length);

                for (var ep = 0; ep < allExistingParts.length; ep++) {
                    var existingPartNumber = utils.safeGet(allExistingParts[ep], orderPartFields.number);
                    if (existingPartNumber) {
                        existingPartsMap[existingPartNumber] = allExistingParts[ep];
                    }
                }
                utils.addDebug(quoteEntry, "  Existujúce čísla dielov: " + Object.keys(existingPartsMap).join(", "));
            }
            utils.addDebug(quoteEntry, "");

            var createdPartsCount = 0;
            var updatedPartsCount = 0;

            if (quoteParts.length === 0) {
                utils.addDebug(quoteEntry, "  ℹ️ Cenová ponuka nemá žiadne diely");
            } else {
                var generatedOrderNumber = utils.safeGet(order, orderFields.number) || quoteNumber;
                var creationDate = new Date();

                for (var i = 0; i < quoteParts.length; i++) {
                    var quotePartInfo = quoteParts[i];
                    var quotePart = quotePartInfo.entry;
                    var targetField = quotePartInfo.targetField;

                    try {
                        var partNumber = utils.safeGet(quotePart, quotePartFields.number);
                        var partType = utils.safeGet(quotePart, quotePartFields.partType) || ("Diel #" + (i + 1));

                        // Kontrola či diel už existuje
                        var orderPart = null;
                        var isUpdate = false;

                        if (orderExists && partNumber && existingPartsMap[partNumber]) {
                            // UPDATE: Použij existujúci diel
                            orderPart = existingPartsMap[partNumber];
                            isUpdate = true;
                            utils.addDebug(quoteEntry, "  🔄 Aktualizujem diel " + (i + 1) + "/" + quoteParts.length + ":");
                            updatedPartsCount++;
                        } else {
                            // CREATE: Vytvor nový diel
                            orderPart = orderPartsLib.create({});
                            utils.addDebug(quoteEntry, "  🔧 Vytváram diel " + (i + 1) + "/" + quoteParts.length + ":");
                            createdPartsCount++;
                        }

                        utils.addDebug(quoteEntry, "    Typ dielu: " + partType);
                        utils.addDebug(quoteEntry, "    Číslo: " + partNumber);

                        // === ZÁKLADNÉ POLIA ===
                        orderPart.set(orderPartFields.number, utils.safeGet(quotePart, quotePartFields.number));
                        orderPart.set(orderPartFields.date, creationDate);
                        orderPart.set(orderPartFields.orderNumber, generatedOrderNumber);
                        orderPart.set(orderPartFields.name, utils.safeGet(quotePart, quotePartFields.name) || "");
                        orderPart.set(orderPartFields.partType, partType);
                        orderPart.set(orderPartFields.note, utils.safeGet(quotePart, quotePartFields.note));

                        // === CENOVÉ POLIA ===
                        orderPart.set(orderPartFields.materialSum, utils.safeGet(quotePart, quotePartFields.materialSum));
                        orderPart.set(orderPartFields.workSum, utils.safeGet(quotePart, quotePartFields.workSum));
                        orderPart.set(orderPartFields.totalSum, utils.safeGet(quotePart, quotePartFields.totalSum));

                        // === POLOŽKY S ATRIBÚTMI ===
                        var materials = utils.safeGetLinks(quotePart, quotePartFields.materials);
                        var works = utils.safeGetLinks(quotePart, quotePartFields.works);

                        // Zbieranie údajov o atribútoch
                        var materialsData = [];
                        var worksData = [];

                        if (materials && materials.length > 0) {
                            for (var m = 0; m < materials.length; m++) {
                                var mat = materials[m];
                                var matName = "";
                                try {
                                    matName = mat.field("Názov") || "Materiál #" + (m + 1);
                                } catch (e) {
                                    matName = "Materiál #" + (m + 1);
                                }

                                materialsData.push({
                                    entry: mat,
                                    name: matName,
                                    qty: mat.attr("množstvo") || 0,
                                    price: mat.attr("cena") || 0,
                                    total: mat.attr("cena celkom") || 0
                                });
                            }
                        }

                        if (works && works.length > 0) {
                            for (var w = 0; w < works.length; w++) {
                                var wrk = works[w];
                                var wrkName = "";
                                try {
                                    wrkName = wrk.field("Názov") || "Práca #" + (w + 1);
                                } catch (e) {
                                    wrkName = "Práca #" + (w + 1);
                                }

                                worksData.push({
                                    entry: wrk,
                                    name: wrkName,
                                    qty: wrk.attr("množstvo") || 0,
                                    price: wrk.attr("cena") || 0,
                                    total: wrk.attr("cena celkom") || 0
                                });
                            }
                        }

                        // Linkni materiály a nastav atribúty (IHNEĎ po linknutí)
                        if (materialsData.length > 0) {
                            utils.addDebug(quoteEntry, "    🔧 Linkujem materiály a nastavujem atribúty...");
                            var orderMatAttrs = centralConfig.attributes.orderPartMaterials;

                            // V UPDATE móde vyčisti existujúce linky aby sa predišlo duplikácii
                            if (isUpdate) {
                                orderPart.set(orderPartFields.materials, []);
                            }

                            for (var m = 0; m < materialsData.length; m++) {
                                var matData = materialsData[m];
                                orderPart.link(orderPartFields.materials, matData.entry);

                                var currentMaterials = orderPart.field(orderPartFields.materials);
                                var justLinkedMat = currentMaterials[currentMaterials.length - 1];

                                if (justLinkedMat) {
                                    justLinkedMat.setAttr(orderMatAttrs.quantity, matData.qty);
                                    justLinkedMat.setAttr(orderMatAttrs.price, matData.price);
                                    justLinkedMat.setAttr(orderMatAttrs.totalPrice, matData.total);
                                }
                            }
                        }

                        // Linkni práce a nastav atribúty (IHNEĎ po linknutí)
                        if (worksData.length > 0) {
                            utils.addDebug(quoteEntry, "    🔧 Linkujem práce a nastavujem atribúty...");
                            var orderWrkAttrs = centralConfig.attributes.orderPartWorks;

                            // V UPDATE móde vyčisti existujúce linky aby sa predišlo duplikácii
                            if (isUpdate) {
                                orderPart.set(orderPartFields.works, []);
                            }

                            for (var w = 0; w < worksData.length; w++) {
                                var wrkData = worksData[w];
                                orderPart.link(orderPartFields.works, wrkData.entry);

                                var currentWorks = orderPart.field(orderPartFields.works);
                                var justLinkedWrk = currentWorks[currentWorks.length - 1];

                                if (justLinkedWrk) {
                                    justLinkedWrk.setAttr(orderWrkAttrs.quantity, wrkData.qty);
                                    justLinkedWrk.setAttr(orderWrkAttrs.price, wrkData.price);
                                    justLinkedWrk.setAttr(orderWrkAttrs.totalPrice, wrkData.total);
                                }
                            }
                        }

                        // Pripoj diel k zákazke do správneho poľa (len ak je nový)
                        if (!isUpdate) {
                            var existingParts = utils.safeGetLinks(order, targetField) || [];
                            existingParts.push(orderPart);
                            order.set(targetField, existingParts);
                            utils.addDebug(quoteEntry, "    ✅ Diel vytvorený a pripojený do poľa: " + quotePartInfo.sourceField);
                        } else {
                            utils.addDebug(quoteEntry, "    ✅ Diel aktualizovaný");
                        }

                    } catch (e) {
                        var errorMsg = "Chyba pri vytváraní dielu " + (i + 1) + ": " + e.toString();
                        if (e.lineNumber) errorMsg += ", Line: " + e.lineNumber;
                        utils.addError(quoteEntry, errorMsg, "createOrderPart", e);
                        utils.addDebug(quoteEntry, "    ❌ " + errorMsg);
                    }

                    utils.addDebug(quoteEntry, "");
                }

                if (orderExists) {
                    utils.addDebug(quoteEntry, "  📊 Vytvorené nové diely: " + createdPartsCount);
                    utils.addDebug(quoteEntry, "  📊 Aktualizované diely: " + updatedPartsCount);
                } else {
                    utils.addDebug(quoteEntry, "  📊 Vytvorené diely: " + createdPartsCount + " / " + quoteParts.length);
                }
            }

            // ==============================================
            // VÝSLEDOK
            // ==============================================

            result.success = true;
            result.order = order;
            result.partsCreated = createdPartsCount;

            if (!orderExists) {
                result.message = "✅ Zákazka vytvorená\n" +
                                "Číslo: " + utils.safeGet(order, orderFields.number) + "\n" +
                                "Počet dielov: " + quoteParts.length;

                utils.addDebug(quoteEntry, "");
                utils.addDebug(quoteEntry, "✅ ZÁKAZKA ÚSPEŠNE VYTVORENÁ");
                utils.addDebug(quoteEntry, "");
                utils.addDebug(quoteEntry, "Zákazka: " + utils.safeGet(order, orderFields.number) + " - " + utils.safeGet(order, orderFields.name));
                utils.addDebug(quoteEntry, "Počet dielov: " + quoteParts.length);
            } else {
                result.message = "✅ Zákazka aktualizovaná\n" +
                                "Číslo: " + utils.safeGet(order, orderFields.number) + "\n" +
                                "Nové diely: " + createdPartsCount + "\n" +
                                "Aktualizované diely: " + updatedPartsCount;

                utils.addDebug(quoteEntry, "");
                utils.addDebug(quoteEntry, "✅ ZÁKAZKA ÚSPEŠNE AKTUALIZOVANÁ");
                utils.addDebug(quoteEntry, "");
                utils.addDebug(quoteEntry, "Zákazka: " + utils.safeGet(order, orderFields.number) + " - " + utils.safeGet(order, orderFields.name));
                utils.addDebug(quoteEntry, "Aktualizované polia: Všetky");
                utils.addDebug(quoteEntry, "Vytvorené nové diely: " + createdPartsCount);
                utils.addDebug(quoteEntry, "Aktualizované diely: " + updatedPartsCount);
            }

            return result;

        } catch (error) {
            var errorMsg = "❌ KRITICKÁ CHYBA: " + error.toString();
            if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
            if (error.stack) errorMsg += "\nStack: " + error.stack;

            utils.addError(quoteEntry, errorMsg, "CPCreateOrder.createOrder", error);

            utils.addDebug(quoteEntry, "");
            utils.addDebug(quoteEntry, "❌ CHYBA PRI VYTVÁRANÍ/AKTUALIZÁCII");
            utils.addDebug(quoteEntry, "");
            utils.addDebug(quoteEntry, errorMsg);

            result.success = false;
            result.message = "❌ Chyba: " + error.toString();
            return result;
        }
    }

    return {
        createOrder: createOrder,
        version: "2.1.0"
    };
})();

// ==============================================
// BACKWARD COMPATIBILITY
// ==============================================
// Ak je dostupné entry(), automaticky spusti vytvorenie zákazky
if (typeof entry === 'function') {
    try {
        var result = CPCreateOrder.createOrder(entry());
        if (result.success) {
            message(result.message);
        } else {
            message(result.message);
        }
    } catch (e) {
        // Silent fail - pravdepodobne volaný ako modul z iného scriptu
    }
}
