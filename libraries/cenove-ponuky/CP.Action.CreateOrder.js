/**
 * CENOVÉ PONUKY - Vytvorenie/Aktualizácia Zákazky
 *
 * Typ scriptu: Manual Action (manuálne spustenie používateľom)
 * Knižnica: Cenové ponuky
 *
 * Popis:
 * - Vytvorí alebo aktualizuje záznam v knižnici Zákazky z cenovej ponuky
 * - Pri CREATE: Vytvorí zákazku + všetky diely v Zákazky Diely
 * - Pri UPDATE: Sync všetky polia okrem dielov (diely sa upravujú ručne)
 * - Prepojenie: Zákazky → linkToEntry Cenové ponuky (vytvorí linksFrom)
 * - Automatické generovanie čísla zákazky pomocou MementoAutoNumber
 *
 * Verzia: 1.2.1
 * Dátum: 2025-10-10
 * Autor: ASISTANTO
 *
 * CHANGELOG:
 * v1.2.1 (2025-10-10):
 * - OPRAVA: Vylepšená detekcia existujúcej zákazky cez linksFrom
 * - Porovnáva ID aj názov knižnice pre spoľahlivejšiu kontrolu
 * - Pridaný detailný debug log pre kontrolu prepojení
 * v1.2.0 (2025-10-10):
 * - NOVÉ: Dátum zákazky sa nastaví na dátum generovania (nie z CP)
 * - NOVÉ: Dátum dielov sa nastaví na dátum generovania (nie z CP)
 * - ZMENA: Pole "Číslo CP" v dieloch zákazky teraz obsahuje číslo zákazky (nie CP)
 * - NOVÉ: Automatické získanie Klienta z poľa Miesto → Klient
 * - NOVÉ: Kopirovanie atribútov (množstvo, cena, cena celkom) pre Materiál a Práce
 * v1.1.3 (2025-10-10):
 * - OPRAVA: Použitie lib.create({}) s prázdnym objektom namiesto lib.create()
 * - FIX: NullPointerException pri vytváraní zákazky - potrebný prázdny objekt ako parameter
 * - Aplikované na ordersLib.create({}) aj orderPartsLib.create({})
 * v1.1.2 (2025-10-10):
 * - OPRAVA: Pridaná kontrola či sa zákazka vytvorila
 * - DIAGNOSTIKA: Jasná chybová hláška ak Manual Action nemôže vytvárať záznamy
 * - Návrh riešenia: Použiť Trigger script namiesto Manual Action
 * v1.1.1 (2025-10-10):
 * - OPRAVA: MementoConfig.getConfig() namiesto priameho prístupu
 * - FIX: "Cannot read property quote of undefined" - použitý getConfig()
 * v1.1.0 (2025-10-10):
 * - PRIDANÉ: Automatické generovanie čísla zákazky pomocou MementoAutoNumber
 * - Používa "Z Placeholder" z ASISTANTO Defaults (formát: ZYYXXX)
 * - Fallback: Ak MementoAutoNumber nie je dostupný, použije číslo z cenovej ponuky
 * - Detailný debug log pre generovanie čísla
 * v1.0.0 (2025-10-10):
 * - Vytvorený script pre tvorbu zákaziek z cenových ponúk
 * - Implementovaná CREATE logika (zákazka + diely)
 * - Implementovaná UPDATE logika (len polia zákazky)
 * - Mapovanie polí podľa CP.Action.CreateOrder.MAPPING.js
 */

// ==============================================
// INICIALIZÁCIA
// ==============================================

var lib = lib();
var currentEntry = entry();
var utils = MementoUtils;
var centralConfig = MementoConfig.getConfig(); // Získaj CONFIG objekt

// ==============================================
// SKRIPT START
// ==============================================

try {
    utils.clearLogs(currentEntry);
    utils.addDebug(currentEntry, "\n╔═══════════════════════════════════════════════════════╗");
    utils.addDebug(currentEntry, "║   VYTVORENIE/AKTUALIZÁCIA ZÁKAZKY Z CENOVEJ PONUKY   ║");
    utils.addDebug(currentEntry, "╚═══════════════════════════════════════════════════════╝");
    utils.addDebug(currentEntry, "");

    // Získaj konfiguračné polia
    var fields = centralConfig.fields.quote;
    var orderFields = centralConfig.fields.order;
    var quotePartFields = centralConfig.fields.quotePart;
    var orderPartFields = centralConfig.fields.orderPart;
    var commonFields = centralConfig.fields.common;

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

    utils.addDebug(currentEntry, "📋 KROK 1: Kontrola existencie zákazky");
    utils.addDebug(currentEntry, "");

    // Zisti číslo cenovej ponuky
    var quoteNumber = utils.safeGet(currentEntry, fields.number) || "";
    var quoteName = utils.safeGet(currentEntry, fields.name) || "";

    utils.addDebug(currentEntry, "  Cenová ponuka:");
    utils.addDebug(currentEntry, "    Číslo: " + quoteNumber);
    utils.addDebug(currentEntry, "    Názov: " + quoteName);
    utils.addDebug(currentEntry, "");

    // Nájdi existujúcu zákazku cez linksFrom
    var existingOrders = [];
    try {
        var linkedEntries = currentEntry.linksFrom();
        utils.addDebug(currentEntry, "  🔍 Kontrolujem linksFrom: " + (linkedEntries ? linkedEntries.length : 0) + " prepojení");

        if (linkedEntries && linkedEntries.length > 0) {
            for (var i = 0; i < linkedEntries.length; i++) {
                var linkedEntry = linkedEntries[i];
                try {
                    // Skontroluj či prepojenie je z knižnice Zákazky
                    var linkedLib = linkedEntry.lib();
                    var linkedLibName = linkedLib.name();
                    var linkedLibId = linkedLib.id();
                    var ordersLibId = ordersLib.id();

                    utils.addDebug(currentEntry, "    Prepojenie " + (i + 1) + ": Knižnica '" + linkedLibName + "' (ID: " + linkedLibId + ")");

                    // Porovnaj ID knižnice alebo názov
                    if (linkedLibId === ordersLibId || linkedLibName === "Zákazky") {
                        existingOrders.push(linkedEntry);
                        utils.addDebug(currentEntry, "      ✅ Toto je zákazka!");
                    }
                } catch (e2) {
                    utils.addDebug(currentEntry, "    ⚠️ Chyba pri kontrole prepojenia: " + e2.toString());
                }
            }
        }
    } catch (e) {
        utils.addDebug(currentEntry, "  ℹ️ Žiadne existujúce prepojenia zo Zákaziek (chyba: " + e.toString() + ")");
    }

    var orderExists = existingOrders.length > 0;
    var order = orderExists ? existingOrders[0] : null;
    var mode = orderExists ? "UPDATE" : "CREATE";

    utils.addDebug(currentEntry, "");
    utils.addDebug(currentEntry, "  📊 Počet nájdených zákaziek: " + existingOrders.length);

    utils.addDebug(currentEntry, "  Režim: " + mode);
    if (orderExists) {
        var orderNumber = utils.safeGet(order, orderFields.number) || "";
        var orderName = utils.safeGet(order, orderFields.name) || "";
        utils.addDebug(currentEntry, "  ✅ Existujúca zákazka:");
        utils.addDebug(currentEntry, "    Číslo: " + orderNumber);
        utils.addDebug(currentEntry, "    Názov: " + orderName);
    } else {
        utils.addDebug(currentEntry, "  ℹ️ Zákazka neexistuje, bude vytvorená nová");
    }
    utils.addDebug(currentEntry, "");

    // ==============================================
    // KROK 2: PRÍPRAVA DÁT PRE SYNCHRONIZÁCIU
    // ==============================================

    utils.addDebug(currentEntry, "📦 KROK 2: Príprava dát pre synchronizáciu");
    utils.addDebug(currentEntry, "");

    var syncData = {};

    // === ZÁKLADNÉ IDENTIFIKAČNÉ POLIA ===
    syncData[orderFields.number] = utils.safeGet(currentEntry, fields.number);
    syncData[orderFields.name] = utils.safeGet(currentEntry, fields.name);
    syncData[orderFields.description] = utils.safeGet(currentEntry, fields.description); // Popis cenovej ponuky → Popis zákazky
    // Dátum bude nastavený na dátum generovania (nie z cenovej ponuky)
    syncData[orderFields.date] = new Date();

    // Typ cenovej ponuky → Typ zákazky
    syncData[orderFields.orderCalculationType] = utils.safeGet(currentEntry, fields.type);

    // Miesto realizácie → Miesto
    syncData[orderFields.place] = utils.safeGetLinks(currentEntry, fields.place);

    // === KLIENT Z MIESTA ===
    // Zisti klienta z poľa Miesto -> Klient
    var placeEntries = utils.safeGetLinks(currentEntry, fields.place);
    if (placeEntries && placeEntries.length > 0) {
        var placeEntry = placeEntries[0];
        var clientEntries = utils.safeGetLinks(placeEntry, centralConfig.fields.place.customer);
        if (clientEntries && clientEntries.length > 0) {
            syncData[orderFields.client] = clientEntries;
            utils.addDebug(currentEntry, "  ℹ️ Klient získaný z miesta: " + utils.safeGet(clientEntries[0], centralConfig.fields.client.name || "Názov"));
        }
    }

    utils.addDebug(currentEntry, "  ✅ Základné polia pripravené");

    // === ÚČTOVANIE DOPRAVY ===
    syncData[orderFields.rideCalculation] = utils.safeGet(currentEntry, fields.rideCalculation);
    syncData[orderFields.transportPercentage] = utils.safeGet(currentEntry, fields.ridePercentage);
    syncData[orderFields.kmPrice] = utils.safeGetLinks(currentEntry, fields.kmPrice);
    syncData[orderFields.rideFlatRate] = utils.safeGetLinks(currentEntry, fields.rideFlatRate);
    syncData[orderFields.fixedTransportPrice] = utils.safeGet(currentEntry, fields.fixedTransportPrice);

    utils.addDebug(currentEntry, "  ✅ Doprava pripravená");

    // === ÚČTOVANIE PRESUNU HMÔT ===
    syncData[orderFields.massTransferCalculation] = utils.safeGet(currentEntry, fields.massTransferCalculation);
    syncData[orderFields.massTransferPercentage] = utils.safeGet(currentEntry, fields.massTransferPercentage);
    syncData[orderFields.massTransferPrice] = utils.safeGetLinks(currentEntry, fields.massTransferPriceEntry); // Cena presunu hmôt materiálu
    syncData[orderFields.massTransferFlatRate] = utils.safeGetLinks(currentEntry, fields.massTransferFlatRate);
    syncData[orderFields.fixedMassTransferPrice] = utils.safeGet(currentEntry, fields.fixedMassTransferPrice);
    syncData[orderFields.materialWeight] = utils.safeGet(currentEntry, fields.materialWeight);

    utils.addDebug(currentEntry, "  ✅ Presun hmôt pripravený");

    // === ÚČTOVANIE SUBDODÁVOK ===
    syncData[orderFields.subcontractsCalculation] = utils.safeGet(currentEntry, fields.subcontractsCalculation);
    syncData[orderFields.subcontractorMarkup] = utils.safeGet(currentEntry, fields.subcontractsPercentage); // Subdodávky % → Prirážka subdodávky

    utils.addDebug(currentEntry, "  ✅ Subdodávky pripravené");

    // === DPH ===
    syncData[orderFields.vatRate] = utils.safeGet(currentEntry, fields.vatRate);

    utils.addDebug(currentEntry, "  ✅ DPH pripravené");
    utils.addDebug(currentEntry, "");

    // ==============================================
    // KROK 3: VYTVORENIE ALEBO AKTUALIZÁCIA ZÁKAZKY
    // ==============================================

    utils.addDebug(currentEntry, "🔧 KROK 3: " + (orderExists ? "Aktualizácia" : "Vytvorenie") + " zákazky");
    utils.addDebug(currentEntry, "");

    if (!orderExists) {
        // === CREATE MODE ===
        utils.addDebug(currentEntry, "  🆕 Vytváram novú zákazku...");

        // Vytvor záznam s prázdnym objektom
        order = ordersLib.create({});

        // Kontrola či sa zákazka vytvorila
        if (!order) {
            throw new Error("Nepodarilo sa vytvoriť záznam v knižnici Zákazky. Skontroluj oprávnenia a či knižnica existuje.");
        }

        utils.addDebug(currentEntry, "  ✅ Nový záznam vytvorený v knižnici Zákazky");

        // === GENEROVANIE ČÍSLA ZÁKAZKY ===
        utils.addDebug(currentEntry, "  🔢 Generujem číslo zákazky...");

        // Použitie MementoAutoNumber pre generovanie čísla
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
                    utils.addDebug(currentEntry, "    ✅ Vygenerované číslo: " + orderNumber);
                } else {
                    utils.addDebug(currentEntry, "    ⚠️ Chyba pri generovaní čísla: " + numberResult.error);
                    utils.addDebug(currentEntry, "    ℹ️ Použije sa číslo z cenovej ponuky");
                    orderNumber = quoteNumber;
                }
            } else {
                utils.addDebug(currentEntry, "    ℹ️ MementoAutoNumber nie je dostupný");
                utils.addDebug(currentEntry, "    ℹ️ Použije sa číslo z cenovej ponuky");
                orderNumber = quoteNumber;
            }
        } catch (e) {
            utils.addDebug(currentEntry, "    ⚠️ Chyba pri volaní MementoAutoNumber: " + e.toString());
            utils.addDebug(currentEntry, "    ℹ️ Použije sa číslo z cenovej ponuky");
            orderNumber = quoteNumber;
        }

        // Nastav číslo zákazky
        syncData[orderFields.number] = orderNumber;
        utils.addDebug(currentEntry, "");

        // Nastav všetky polia
        for (var fieldName in syncData) {
            if (syncData.hasOwnProperty(fieldName)) {
                var value = syncData[fieldName];
                if (value !== null && value !== undefined) {
                    try {
                        order.set(fieldName, value);
                    } catch (e) {
                        utils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení poľa '" + fieldName + "': " + e.toString());
                    }
                }
            }
        }

        // Vytvor linkToEntry: Zákazka → Cenová ponuka
        order.set(orderFields.quote, [currentEntry]);

        utils.addDebug(currentEntry, "  ✅ Zákazka vytvorená");
        utils.addDebug(currentEntry, "    Číslo: " + utils.safeGet(order, orderFields.number));
        utils.addDebug(currentEntry, "    Názov: " + utils.safeGet(order, orderFields.name));
        utils.addDebug(currentEntry, "");

    } else {
        // === UPDATE MODE ===
        utils.addDebug(currentEntry, "  🔄 Aktualizujem existujúcu zákazku...");

        // Aktualizuj všetky polia OKREM čísla zákazky (číslo sa nemení pri update)
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
                        utils.addDebug(currentEntry, "  ⚠️ Chyba pri aktualizácii poľa '" + fieldName + "': " + e.toString());
                    }
                }
            }
        }

        utils.addDebug(currentEntry, "  ✅ Zákazka aktualizovaná");
        utils.addDebug(currentEntry, "    Číslo: " + utils.safeGet(order, orderFields.number));
        utils.addDebug(currentEntry, "    Názov: " + utils.safeGet(order, orderFields.name));
        utils.addDebug(currentEntry, "");
    }

    // ==============================================
    // KROK 4: VYTVORENIE DIELOV (LEN PRI CREATE)
    // ==============================================

    if (!orderExists) {
        utils.addDebug(currentEntry, "📋 KROK 4: Vytvorenie dielov zákazky");
        utils.addDebug(currentEntry, "");

        // Získaj diely z cenovej ponuky
        var quoteParts = utils.safeGetLinks(currentEntry, fields.parts) || [];
        utils.addDebug(currentEntry, "  Počet dielov v cenovej ponuke: " + quoteParts.length);
        utils.addDebug(currentEntry, "");

        if (quoteParts.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Cenová ponuka nemá žiadne diely");
        } else {
            var createdPartsCount = 0;
            var generatedOrderNumber = utils.safeGet(order, orderFields.number) || quoteNumber; // Číslo vygenerovanej zákazky
            var creationDate = new Date(); // Dátum generovania

            for (var i = 0; i < quoteParts.length; i++) {
                var quotePart = quoteParts[i];

                try {
                    var partType = utils.safeGet(quotePart, quotePartFields.partType) || ("Diel #" + (i + 1));
                    var partName = utils.safeGet(quotePart, quotePartFields.name) || "";

                    utils.addDebug(currentEntry, "  🔧 Vytváram diel " + (i + 1) + "/" + quoteParts.length + ":");
                    utils.addDebug(currentEntry, "    Typ: " + partType);
                    utils.addDebug(currentEntry, "    Názov: " + partName);

                    // Vytvor nový diel v Zákazky Diely
                    var orderPart = orderPartsLib.create({});

                    // === ZÁKLADNÉ POLIA ===
                    orderPart.set(orderPartFields.number, utils.safeGet(quotePart, quotePartFields.number));
                    orderPart.set(orderPartFields.date, creationDate); // Dátum generovania zákazky
                    orderPart.set(orderPartFields.quoteNumber, generatedOrderNumber); // Číslo zákazky (bolo Číslo CP)
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

                    // Mapuj materiály s atribútmi
                    if (materials && materials.length > 0) {
                        var materialsWithAttrs = [];
                        for (var m = 0; m < materials.length; m++) {
                            var material = materials[m];
                            var attrs = {};

                            // Skopíruj atribúty z cenovej ponuky
                            try {
                                attrs["množstvo"] = material.a("množstvo") || 0;
                                attrs["cena"] = material.a("cena") || 0;
                                attrs["cena celkom"] = material.a("cena celkom") || 0;
                            } catch (e) {
                                utils.addDebug(currentEntry, "      ⚠️ Chyba pri kopírovaní atribútov materiálu: " + e.toString());
                            }

                            materialsWithAttrs.push({entry: material, attributes: attrs});
                        }
                        orderPart.set(orderPartFields.materials, materialsWithAttrs);
                    }

                    // Mapuj práce s atribútmi
                    if (works && works.length > 0) {
                        var worksWithAttrs = [];
                        for (var w = 0; w < works.length; w++) {
                            var work = works[w];
                            var attrs = {};

                            // Skopíruj atribúty z cenovej ponuky
                            try {
                                attrs["množstvo"] = work.a("množstvo") || 0;
                                attrs["cena"] = work.a("cena") || 0;
                                attrs["cena celkom"] = work.a("cena celkom") || 0;
                            } catch (e) {
                                utils.addDebug(currentEntry, "      ⚠️ Chyba pri kopírovaní atribútov práce: " + e.toString());
                            }

                            worksWithAttrs.push({entry: work, attributes: attrs});
                        }
                        orderPart.set(orderPartFields.works, worksWithAttrs);
                    }

                    utils.addDebug(currentEntry, "    Materiály: " + (materials ? materials.length : 0));
                    utils.addDebug(currentEntry, "    Práce: " + (works ? works.length : 0));
                    utils.addDebug(currentEntry, "    Celkom: " + (utils.safeGet(quotePart, quotePartFields.totalSum) || 0).toFixed(2) + " €");

                    // Pripoj diel k zákazke
                    var existingParts = utils.safeGetLinks(order, orderFields.parts) || [];
                    existingParts.push(orderPart);
                    order.set(orderFields.parts, existingParts);

                    createdPartsCount++;
                    utils.addDebug(currentEntry, "    ✅ Diel vytvorený");

                } catch (e) {
                    var errorMsg = "Chyba pri vytváraní dielu " + (i + 1) + ": " + e.toString();
                    if (e.lineNumber) errorMsg += ", Line: " + e.lineNumber;
                    utils.addError(currentEntry, errorMsg, "createOrderPart", e);
                    utils.addDebug(currentEntry, "    ❌ " + errorMsg);
                }

                utils.addDebug(currentEntry, "");
            }

            utils.addDebug(currentEntry, "  📊 Vytvorené diely: " + createdPartsCount + " / " + quoteParts.length);
        }

    } else {
        utils.addDebug(currentEntry, "📋 KROK 4: Aktualizácia dielov (preskočené)");
        utils.addDebug(currentEntry, "");
        utils.addDebug(currentEntry, "  ℹ️ Diely zákazky sa synchronizujú len pri vytvorení");
        utils.addDebug(currentEntry, "  ℹ️ Diely v zákazke upravuj ručne");
        utils.addDebug(currentEntry, "");
    }

    // ==============================================
    // VÝSLEDOK
    // ==============================================

    utils.addDebug(currentEntry, "╔═══════════════════════════════════════════════════════╗");
    if (!orderExists) {
        utils.addDebug(currentEntry, "║         ✅ ZÁKAZKA ÚSPEŠNE VYTVORENÁ                  ║");
        utils.addDebug(currentEntry, "╚═══════════════════════════════════════════════════════╝");
        utils.addDebug(currentEntry, "");
        utils.addDebug(currentEntry, "Zákazka: " + utils.safeGet(order, orderFields.number) + " - " + utils.safeGet(order, orderFields.name));
        utils.addDebug(currentEntry, "Počet dielov: " + (quoteParts ? quoteParts.length : 0));

        message("✅ Zákazka vytvorená\n" +
                "Číslo: " + utils.safeGet(order, orderFields.number) + "\n" +
                "Počet dielov: " + (quoteParts ? quoteParts.length : 0));
    } else {
        utils.addDebug(currentEntry, "║         ✅ ZÁKAZKA ÚSPEŠNE AKTUALIZOVANÁ              ║");
        utils.addDebug(currentEntry, "╚═══════════════════════════════════════════════════════╝");
        utils.addDebug(currentEntry, "");
        utils.addDebug(currentEntry, "Zákazka: " + utils.safeGet(order, orderFields.number) + " - " + utils.safeGet(order, orderFields.name));
        utils.addDebug(currentEntry, "Aktualizované polia: Všetky okrem dielov");

        message("✅ Zákazka aktualizovaná\n" +
                "Číslo: " + utils.safeGet(order, orderFields.number) + "\n" +
                "Polia: Všetky okrem dielov");
    }

} catch (error) {
    var errorMsg = "❌ KRITICKÁ CHYBA: " + error.toString();
    if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
    if (error.stack) errorMsg += "\nStack: " + error.stack;

    utils.addError(currentEntry, errorMsg, "CP.Action.CreateOrder", error);

    utils.addDebug(currentEntry, "");
    utils.addDebug(currentEntry, "╔═══════════════════════════════════════════════════════╗");
    utils.addDebug(currentEntry, "║         ❌ CHYBA PRI VYTVÁRANÍ/AKTUALIZÁCII           ║");
    utils.addDebug(currentEntry, "╚═══════════════════════════════════════════════════════╝");
    utils.addDebug(currentEntry, "");
    utils.addDebug(currentEntry, errorMsg);

    message("❌ Chyba pri vytváraní/aktualizácii zákazky\n" + error.toString());
}
