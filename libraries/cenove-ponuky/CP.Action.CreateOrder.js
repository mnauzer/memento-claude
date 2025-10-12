/**
 * CENOVÉ PONUKY - Vytvorenie/Aktualizácia Zákazky
 *
 * Typ scriptu: Manual Action (manuálne spustenie používateľom)
 * Knižnica: Cenové ponuky
 *
 * Popis:
 * - Vytvorí alebo aktualizuje záznam v knižnici Zákazky z cenovej ponuky
 * - Pri CREATE: Vytvorí zákazku + všetky diely v Zákazky Diely
 * - Pri UPDATE: Sync všetky polia + vytvorí chýbajúce diely (existujúce diely zostávajú bez zmeny)
 * - Prepojenie: Zákazky → linkToEntry Cenové ponuky (vytvorí linksFrom)
 * - Automatické generovanie čísla zákazky pomocou MementoAutoNumber
 *
 * Verzia: 1.5.0
 * Dátum: 2025-10-10
 * Autor: ASISTANTO
 *
 * CHANGELOG:
 * v1.5.0 (2025-10-10):
 *   - FIX: Použitá link() metóda namiesto set() pre materiály a práce
 *   - Atribúty sa nastavujú pomocou setAttr() PO linkovaní
 *   - Workflow: orderPart.link(field, entry) → entry.setAttr(attr, value)
 *   - Správny Memento DB API vzor pre linkToEntry s atribútmi
 *   - Detailný debug logging pre diagnostiku
 * v1.4.0 (2025-10-10):
 *   - DEBUG: Zmenené poradie operácií (revert v1.5.0)
 *   - Pokus o riešenie cez poradie pripojenia dielu
 * v1.3.2 (2025-10-10):
 *   - DEBUG: Pridaný detailný logging pre diagnostiku materiálov a prác
 *   - Pridané výpisy počtu položiek, atribútov a krokov nastavovania
 *   - Pomôže identifikovať prečo sa položky nevytvárajú v dieloch zákazky
 * v1.3.1 (2025-10-10):
 *   - OPRAVA: Použitá správna metóda .attr() namiesto .a() pre čítanie atribútov
 *   - Fix pre TypeError: Cannot find function a in object [object Entry]
 *   - Opravené kopírovanie atribútov pre materiály a práce
 *   - Verifikované podľa Memento Database Wiki dokumentácie
 * v1.3.0 (2025-10-10):
 *   - Pridaná kontrola existencie dielov pri UPDATE režime
 *   - Script teraz vytvára len chýbajúce diely (porovnanie podľa čísla dielu)
 *   - Existujúce diely zostávajú nezmenené
 *   - Debug info ukazuje počet vytvorených aj preskočených dielov
 * v1.2.2 (2025-10-10):
 *   - Opravená detekcia linksFrom pomocou utils.safeGetLinksFrom()
 *   - Použitý správny Memento API vzor: safeGetLinksFrom(entry, "Zákazky", "Cenová ponuka")
 *   - Odstránená komplexná logika manuálneho parsovania linksFrom
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
    utils.addDebug(currentEntry, "   VYTVORENIE/AKTUALIZÁCIA ZÁKAZKY Z CENOVEJ PONUKY   ");
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

    // Nájdi existujúcu zákazku cez linksFrom (Zákazky -> Cenová ponuka)
    var existingOrders = utils.safeGetLinksFrom(currentEntry, "Zákazky", "Cenová ponuka");

    utils.addDebug(currentEntry, "  🔍 Kontrolujem linksFrom zo Zákaziek: " + existingOrders.length + " nájdených");

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
    // KROK 4: VYTVORENIE/AKTUALIZÁCIA DIELOV
    // ==============================================

    utils.addDebug(currentEntry, "📋 KROK 4: " + (orderExists ? "Kontrola a vytvorenie chýbajúcich dielov" : "Vytvorenie dielov zákazky"));
    utils.addDebug(currentEntry, "");

    // Získaj diely z cenovej ponuky
    var quoteParts = utils.safeGetLinks(currentEntry, fields.parts) || [];
    utils.addDebug(currentEntry, "  Počet dielov v cenovej ponuke: " + quoteParts.length);

    // Pri UPDATE: Získaj existujúce diely zákazky
    var existingOrderParts = [];
    var existingPartNumbers = [];
    if (orderExists) {
        existingOrderParts = utils.safeGetLinks(order, orderFields.parts) || [];
        utils.addDebug(currentEntry, "  Počet existujúcich dielov v zákazke: " + existingOrderParts.length);

        // Vytvor mapu existujúcich čísel dielov
        for (var ep = 0; ep < existingOrderParts.length; ep++) {
            var existingPartNumber = utils.safeGet(existingOrderParts[ep], orderPartFields.number);
            if (existingPartNumber) {
                existingPartNumbers.push(existingPartNumber);
            }
        }
        utils.addDebug(currentEntry, "  Existujúce čísla dielov: " + existingPartNumbers.join(", "));
    }
    utils.addDebug(currentEntry, "");

    if (quoteParts.length === 0) {
        utils.addDebug(currentEntry, "  ℹ️ Cenová ponuka nemá žiadne diely");
    } else {
        var createdPartsCount = 0;
        var skippedPartsCount = 0;
        var generatedOrderNumber = utils.safeGet(order, orderFields.number) || quoteNumber; // Číslo vygenerovanej zákazky
        var creationDate = new Date(); // Dátum generovania

        for (var i = 0; i < quoteParts.length; i++) {
            var quotePart = quoteParts[i];

            try {
                var partNumber = utils.safeGet(quotePart, quotePartFields.number);
                var partType = utils.safeGet(quotePart, quotePartFields.partType) || ("Diel #" + (i + 1));
                var partName = utils.safeGet(quotePart, quotePartFields.name) || "";

                // Pri UPDATE: Skontroluj či diel už existuje
                if (orderExists && partNumber && existingPartNumbers.indexOf(partNumber) !== -1) {
                    utils.addDebug(currentEntry, "  ⏭️ Diel " + (i + 1) + "/" + quoteParts.length + " (číslo " + partNumber + ") už existuje - preskakujem");
                    skippedPartsCount++;
                    continue;
                }

                utils.addDebug(currentEntry, "  🔧 Vytváram diel " + (i + 1) + "/" + quoteParts.length + ":");
                utils.addDebug(currentEntry, "    Číslo: " + partNumber);
                utils.addDebug(currentEntry, "    Typ: " + partType);
                utils.addDebug(currentEntry, "    Názov: " + partName);

                // Vytvor nový diel v Zákazky Diely
                var orderPart = orderPartsLib.create({});

                    // === ZÁKLADNÉ POLIA ===
                    orderPart.set(orderPartFields.number, utils.safeGet(quotePart, quotePartFields.number));
                    orderPart.set(orderPartFields.date, creationDate); // Dátum generovania zákazky
                    orderPart.set(orderPartFields.orderNumber, generatedOrderNumber); // Číslo zákazky
                    orderPart.set(orderPartFields.name, partName);
                    orderPart.set(orderPartFields.partType, partType);
                    orderPart.set(orderPartFields.note, utils.safeGet(quotePart, quotePartFields.note));

                    // === CENOVÉ POLIA ===
                    orderPart.set(orderPartFields.materialSum, utils.safeGet(quotePart, quotePartFields.materialSum));
                    orderPart.set(orderPartFields.workSum, utils.safeGet(quotePart, quotePartFields.workSum));
                    orderPart.set(orderPartFields.totalSum, utils.safeGet(quotePart, quotePartFields.totalSum));

                    // === POLOŽKY S ATRIBÚTMI - Prečítaj atribúty najprv ===
                    var materials = utils.safeGetLinks(quotePart, quotePartFields.materials);
                    var works = utils.safeGetLinks(quotePart, quotePartFields.works);

                    utils.addDebug(currentEntry, "    🔍 DEBUG - Materiály z CP: " + (materials ? materials.length : 0));
                    utils.addDebug(currentEntry, "    🔍 DEBUG - Práce z CP: " + (works ? works.length : 0));

                    // KROK 1: Prečítaj VŠETKY atribúty PRED linkovaním
                    var materialsData = [];
                    if (materials && materials.length > 0) {
                        for (var m = 0; m < materials.length; m++) {
                            var mat = materials[m];
                            materialsData.push({
                                entry: mat,
                                qty: mat.attr("množstvo") || 0,
                                price: mat.attr("cena") || 0,
                                total: mat.attr("cena celkom") || 0,
                                name: utils.safeGet(mat, "Názov") || ("Materiál #" + (m + 1))
                            });
                        }
                        utils.addDebug(currentEntry, "    📖 Prečítané atribúty materiálov: " + materialsData.length);
                    }

                    var worksData = [];
                    if (works && works.length > 0) {
                        for (var w = 0; w < works.length; w++) {
                            var wrk = works[w];
                            worksData.push({
                                entry: wrk,
                                qty: wrk.attr("množstvo") || 0,
                                price: wrk.attr("cena") || 0,
                                total: wrk.attr("cena celkom") || 0,
                                name: utils.safeGet(wrk, "Názov") || ("Práca #" + (w + 1))
                            });
                        }
                        utils.addDebug(currentEntry, "    📖 Prečítané atribúty prác: " + worksData.length);
                    }

                    // KROK 2: Linkni položky a IHNEĎ nastav atribúty (v jednom cykle)
                    if (materialsData.length > 0) {
                        utils.addDebug(currentEntry, "    📦 Linkujem materiály a nastavujem atribúty...");
                        for (var m = 0; m < materialsData.length; m++) {
                            var matData = materialsData[m];

                            // Linkni
                            orderPart.link(orderPartFields.materials, matData.entry);

                            // IHNEĎ po linknutí získaj pole a nastav atribúty na poslednom prvku
                            var currentMaterials = orderPart.field(orderPartFields.materials);
                            var justLinkedMat = currentMaterials[currentMaterials.length - 1];

                            if (justLinkedMat) {
                                justLinkedMat.setAttr("množstvo", matData.qty);
                                justLinkedMat.setAttr("cena", matData.price);
                                justLinkedMat.setAttr("cena celkom", matData.total);
                                utils.addDebug(currentEntry, "      ✅ [" + m + "] " + matData.name + ": m=" + matData.qty + ", c=" + matData.price + "€");
                            } else {
                                utils.addDebug(currentEntry, "      ❌ [" + m + "] Nie je možné získať linknutý materiál!");
                            }
                        }
                    }

                    if (worksData.length > 0) {
                        utils.addDebug(currentEntry, "    🔧 Linkujem práce a nastavujem atribúty...");
                        for (var w = 0; w < worksData.length; w++) {
                            var wrkData = worksData[w];

                            // Linkni
                            orderPart.link(orderPartFields.works, wrkData.entry);

                            // IHNEĎ po linknutí získaj pole a nastav atribúty na poslednom prvku
                            var currentWorks = orderPart.field(orderPartFields.works);
                            var justLinkedWrk = currentWorks[currentWorks.length - 1];

                            if (justLinkedWrk) {
                                justLinkedWrk.setAttr("množstvo", wrkData.qty);
                                justLinkedWrk.setAttr("cena", wrkData.price);
                                justLinkedWrk.setAttr("cena celkom", wrkData.total);
                                utils.addDebug(currentEntry, "      ✅ [" + w + "] " + wrkData.name + ": h=" + wrkData.qty + ", c=" + wrkData.price + "€");
                            } else {
                                utils.addDebug(currentEntry, "      ❌ [" + w + "] Nie je možné získať linknutú prácu!");
                            }
                        }
                    }

                    utils.addDebug(currentEntry, "    Materiály: " + materialsData.length);
                    utils.addDebug(currentEntry, "    Práce: " + worksData.length);
                    utils.addDebug(currentEntry, "    Celkom: " + (utils.safeGet(quotePart, quotePartFields.totalSum) || 0).toFixed(2) + " €");

                    // KROK 4: Pripoj diel k zákazke
                    var existingParts = utils.safeGetLinks(order, orderFields.parts) || [];
                    existingParts.push(orderPart);
                    order.set(orderFields.parts, existingParts);

                    utils.addDebug(currentEntry, "    ✅ Diel pripojený k zákazke");

                    createdPartsCount++;
                    utils.addDebug(currentEntry, "    ✅ Diel vytvorený a pripojený");

                } catch (e) {
                    var errorMsg = "Chyba pri vytváraní dielu " + (i + 1) + ": " + e.toString();
                    if (e.lineNumber) errorMsg += ", Line: " + e.lineNumber;
                    utils.addError(currentEntry, errorMsg, "createOrderPart", e);
                    utils.addDebug(currentEntry, "    ❌ " + errorMsg);
                }

                utils.addDebug(currentEntry, "");
            }

            utils.addDebug(currentEntry, "  📊 Vytvorené diely: " + createdPartsCount + " / " + quoteParts.length);
            if (orderExists && skippedPartsCount > 0) {
                utils.addDebug(currentEntry, "  📊 Preskočené existujúce diely: " + skippedPartsCount);
            }
        }

    // ==============================================
    // VÝSLEDOK
    // ==============================================

    if (!orderExists) {
        utils.addDebug(currentEntry, "         ✅ ZÁKAZKA ÚSPEŠNE VYTVORENÁ                  ");
        utils.addDebug(currentEntry, "");
        utils.addDebug(currentEntry, "Zákazka: " + utils.safeGet(order, orderFields.number) + " - " + utils.safeGet(order, orderFields.name));
        utils.addDebug(currentEntry, "Počet dielov: " + (quoteParts ? quoteParts.length : 0));

        message("✅ Zákazka vytvorená\n" +
                "Číslo: " + utils.safeGet(order, orderFields.number) + "\n" +
                "Počet dielov: " + (quoteParts ? quoteParts.length : 0));
    } else {
        utils.addDebug(currentEntry, "         ✅ ZÁKAZKA ÚSPEŠNE AKTUALIZOVANÁ              ");
        utils.addDebug(currentEntry, "");
        utils.addDebug(currentEntry, "Zákazka: " + utils.safeGet(order, orderFields.number) + " - " + utils.safeGet(order, orderFields.name));
        utils.addDebug(currentEntry, "Aktualizované polia: Všetky");
        if (quoteParts && quoteParts.length > 0) {
            utils.addDebug(currentEntry, "Vytvorené nové diely: " + (createdPartsCount || 0) + " / " + quoteParts.length);
            if (skippedPartsCount > 0) {
                utils.addDebug(currentEntry, "Preskočené existujúce: " + skippedPartsCount);
            }
        }

        var messageText = "✅ Zákazka aktualizovaná\n" +
                "Číslo: " + utils.safeGet(order, orderFields.number) + "\n" +
                "Aktualizované: Všetky polia";
        if (quoteParts && quoteParts.length > 0) {
            messageText += "\nNové diely: " + (createdPartsCount || 0) + " / " + quoteParts.length;
        }
        message(messageText);
    }

} catch (error) {
    var errorMsg = "❌ KRITICKÁ CHYBA: " + error.toString();
    if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
    if (error.stack) errorMsg += "\nStack: " + error.stack;

    utils.addError(currentEntry, errorMsg, "CP.Action.CreateOrder", error);

    utils.addDebug(currentEntry, "");
    utils.addDebug(currentEntry, "         ❌ CHYBA PRI VYTVÁRANÍ/AKTUALIZÁCII           ");
    utils.addDebug(currentEntry, "");
    utils.addDebug(currentEntry, errorMsg);

    message("❌ Chyba pri vytváraní/aktualizácii zákazky\n" + error.toString());
}
