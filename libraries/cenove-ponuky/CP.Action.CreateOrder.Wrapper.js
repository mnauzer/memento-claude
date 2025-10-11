/**
 * CENOVÉ PONUKY - Wrapper pre CreateOrder funkciu
 *
 * Typ scriptu: Function Library (použiteľné v iných scriptoch)
 * Knižnica: Cenové ponuky
 *
 * Popis:
 * - Wrapper pre CP.Action.CreateOrder.js umožňujúci volanie ako funkcie
 * - Použitie: var CPActions = CPCreateOrderWrapper; CPActions.createOrder(entry);
 * - Vracia objekt s výsledkom operácie (success, message, order, parts)
 *
 * Verzia: 1.0.0
 * Dátum: 2025-10-11
 * Autor: ASISTANTO
 *
 * CHANGELOG:
 * v1.0.0 (2025-10-11):
 *   - Prvá verzia wrapper funkcie
 *   - Umožňuje volanie createOrder(entry) z iných scriptov
 *   - Vracia štruktúrovaný výsledok operácie
 */

var CPCreateOrderWrapper = (function() {
    'use strict';

    /**
     * Vytvorí alebo aktualizuje zákazku z cenovej ponuky
     * @param {Entry} quoteEntry - Entry z knižnice Cenové ponuky
     * @returns {Object} - { success: boolean, message: string, order: Entry, parts: number, mode: string }
     */
    function createOrder(quoteEntry) {
        var result = {
            success: false,
            message: "",
            order: null,
            parts: 0,
            mode: "" // "CREATE" alebo "UPDATE"
        };

        try {
            var utils = MementoUtils;
            var centralConfig = MementoConfig.getConfig();

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

            var quoteNumber = utils.safeGet(quoteEntry, fields.number) || "";
            var quoteName = utils.safeGet(quoteEntry, fields.name) || "";

            // Nájdi existujúcu zákazku cez linksFrom
            var existingOrders = utils.safeGetLinksFrom(quoteEntry, "Zákazky", "Cenová ponuka");
            var orderExists = existingOrders.length > 0;
            var order = orderExists ? existingOrders[0] : null;
            result.mode = orderExists ? "UPDATE" : "CREATE";

            // ==============================================
            // KROK 2: PRÍPRAVA DÁT PRE SYNCHRONIZÁCIU
            // ==============================================

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
            syncData[orderFields.kmPrice] = utils.safeGetLinks(quoteEntry, fields.kmPrice);
            syncData[orderFields.rideFlatRate] = utils.safeGetLinks(quoteEntry, fields.rideFlatRate);
            syncData[orderFields.fixedTransportPrice] = utils.safeGet(quoteEntry, fields.fixedTransportPrice);

            // === ÚČTOVANIE PRESUNU HMÔT ===
            syncData[orderFields.massTransferCalculation] = utils.safeGet(quoteEntry, fields.massTransferCalculation);
            syncData[orderFields.massTransferPercentage] = utils.safeGet(quoteEntry, fields.massTransferPercentage);
            syncData[orderFields.massTransferPrice] = utils.safeGetLinks(quoteEntry, fields.massTransferPriceEntry);
            syncData[orderFields.massTransferFlatRate] = utils.safeGetLinks(quoteEntry, fields.massTransferFlatRate);
            syncData[orderFields.fixedMassTransferPrice] = utils.safeGet(quoteEntry, fields.fixedMassTransferPrice);
            syncData[orderFields.materialWeight] = utils.safeGet(quoteEntry, fields.materialWeight);

            // === ÚČTOVANIE SUBDODÁVOK ===
            syncData[orderFields.subcontractsCalculation] = utils.safeGet(quoteEntry, fields.subcontractsCalculation);
            syncData[orderFields.subcontractorMarkup] = utils.safeGet(quoteEntry, fields.subcontractsPercentage);

            // === DPH ===
            syncData[orderFields.vatRate] = utils.safeGet(quoteEntry, fields.vatRate);

            // ==============================================
            // KROK 3: VYTVORENIE ALEBO AKTUALIZÁCIA ZÁKAZKY
            // ==============================================

            if (!orderExists) {
                // === CREATE MODE ===
                order = ordersLib.create({});

                if (!order) {
                    throw new Error("Nepodarilo sa vytvoriť záznam v knižnici Zákazky");
                }

                // === GENEROVANIE ČÍSLA ZÁKAZKY ===
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
                        } else {
                            orderNumber = quoteNumber;
                        }
                    } else {
                        orderNumber = quoteNumber;
                    }
                } catch (e) {
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
                                // Pokračuj aj pri chybe
                            }
                        }
                    }
                }

                // Vytvor linkToEntry: Zákazka → Cenová ponuka
                order.set(orderFields.quote, [quoteEntry]);

            } else {
                // === UPDATE MODE ===
                for (var fieldName in syncData) {
                    if (syncData.hasOwnProperty(fieldName)) {
                        // Preskočiť číslo zákazky
                        if (fieldName === orderFields.number) {
                            continue;
                        }

                        var value = syncData[fieldName];
                        if (value !== null && value !== undefined) {
                            try {
                                order.set(fieldName, value);
                            } catch (e) {
                                // Pokračuj aj pri chybe
                            }
                        }
                    }
                }
            }

            // ==============================================
            // KROK 4: VYTVORENIE/AKTUALIZÁCIA DIELOV
            // ==============================================

            var quoteParts = utils.safeGetLinks(quoteEntry, fields.parts) || [];
            var createdPartsCount = 0;
            var skippedPartsCount = 0;

            // Pri UPDATE: Získaj existujúce diely zákazky
            var existingPartNumbers = [];
            if (orderExists) {
                var existingOrderParts = utils.safeGetLinks(order, orderFields.parts) || [];
                for (var ep = 0; ep < existingOrderParts.length; ep++) {
                    var existingPartNumber = utils.safeGet(existingOrderParts[ep], orderPartFields.number);
                    if (existingPartNumber) {
                        existingPartNumbers.push(existingPartNumber);
                    }
                }
            }

            var generatedOrderNumber = utils.safeGet(order, orderFields.number) || quoteNumber;
            var creationDate = new Date();

            for (var i = 0; i < quoteParts.length; i++) {
                var quotePart = quoteParts[i];

                try {
                    var partNumber = utils.safeGet(quotePart, quotePartFields.number);
                    var partType = utils.safeGet(quotePart, quotePartFields.partType) || ("Diel #" + (i + 1));
                    var partName = utils.safeGet(quotePart, quotePartFields.name) || "";

                    // Pri UPDATE: Skontroluj či diel už existuje
                    if (orderExists && partNumber && existingPartNumbers.indexOf(partNumber) !== -1) {
                        skippedPartsCount++;
                        continue;
                    }

                    // Vytvor nový diel
                    var orderPart = orderPartsLib.create({});

                    // === ZÁKLADNÉ POLIA ===
                    orderPart.set(orderPartFields.number, utils.safeGet(quotePart, quotePartFields.number));
                    orderPart.set(orderPartFields.date, creationDate);
                    orderPart.set(orderPartFields.orderNumber, generatedOrderNumber);
                    orderPart.set(orderPartFields.name, partName);
                    orderPart.set(orderPartFields.partType, partType);
                    orderPart.set(orderPartFields.note, utils.safeGet(quotePart, quotePartFields.note));

                    // === CENOVÉ POLIA ===
                    orderPart.set(orderPartFields.materialSum, utils.safeGet(quotePart, quotePartFields.materialSum));
                    orderPart.set(orderPartFields.workSum, utils.safeGet(quotePart, quotePartFields.workSum));
                    orderPart.set(orderPartFields.totalSum, utils.safeGet(quotePart, quotePartFields.totalSum));

                    // === POLOŽKY S ATRIBÚTMI ===
                    var materials = utils.safeGetLinks(quotePart, quotePartFields.materials);
                    var works = utils.safeGetLinks(quotePart, quotePartFields.works);

                    if (materials && materials.length > 0) {
                        orderPart.set(orderPartFields.materials, materials);
                    }

                    if (works && works.length > 0) {
                        orderPart.set(orderPartFields.works, works);
                    }

                    // Pripoj diel k zákazke
                    var existingParts = utils.safeGetLinks(order, orderFields.parts) || [];
                    existingParts.push(orderPart);
                    order.set(orderFields.parts, existingParts);

                    createdPartsCount++;

                } catch (e) {
                    // Pokračuj aj pri chybe v dieli
                }
            }

            // ==============================================
            // VÝSLEDOK
            // ==============================================

            result.success = true;
            result.order = order;
            result.parts = createdPartsCount;

            if (!orderExists) {
                result.message = "✅ Zákazka vytvorená\n" +
                                "Číslo: " + utils.safeGet(order, orderFields.number) + "\n" +
                                "Počet dielov: " + createdPartsCount;
            } else {
                result.message = "✅ Zákazka aktualizovaná\n" +
                                "Číslo: " + utils.safeGet(order, orderFields.number) + "\n" +
                                "Nové diely: " + createdPartsCount;
            }

        } catch (error) {
            result.success = false;
            result.message = "❌ Chyba: " + error.toString();
            result.order = null;
            result.parts = 0;
        }

        return result;
    }

    // Public API
    return {
        createOrder: createOrder
    };

})();
