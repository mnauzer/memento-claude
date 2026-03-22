// ==============================================
// LIBRARY MODULE - Pokladňa (Cash Book)
// Verzia: 1.4.0 | Dátum: 2026-03-22 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Reusable module for Cash Book operations
//    - Handle obligation payments distribution
//    - Calculate VAT for receipts
//    - Manage receivables offset
//    - Create overpayment entries (receivable/advance/bonus)
// ==============================================
// 🔧 DEPENDENCIES:
//    - MementoUtils v7.0+
//    - MementoConfig (central configuration)
//    - MementoVAT (VAT calculations)
// ==============================================
// 📖 USAGE:
//    var result = Pokladna.payObligations(entry(), {
//        utils: MementoUtils,
//        config: MementoConfig.getConfig()
//    });
// ==============================================
// 🔄 EXTRACTED FROM:
//    libraries/pokladna/Pokl.Action.PayObligations.js v8.0.2 (1,114 lines)
//    Extraction date: 2026-03-19
// ==============================================

var Pokladna = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "Pokladna",
        version: "1.4.0",
        author: "ASISTANTO",
        description: "Cash book and payment management module",
        library: "Pokladňa",
        status: "active",
        extractedFrom: "Pokl.Action.PayObligations.js v8.0.2",
        extractedLines: 1114,
        extractedDate: "2026-03-19",
        changelog: [
            "v1.3.0 (2026-03-22) - REFACTOR: requestSign() - delegates to MementoSign.createPodpisAndSend() (generic protocol v2); Podpis record stores metadata for N8N generic flow",
            "v1.2.2 (2026-03-22) - FIX: requestSign() - always use zamestnanec[0] (Memento entries field returns Kotlin array-like, Array.isArray()=false; was reading raw collection instead of entry object)",
            "v1.2.1 (2026-03-22) - FIX: requestSign() - add _log/_errLog debug; handle zamestnanec array/null defensively; fix 'Čaká ' trailing space in Stav; replace concat with replace on Podpis field",
            "v1.2.0 (2026-03-22) - CHANGE: requestSign() - new message format: plain separators, pohyb icon, popis+ucel, suma after separator, no HTML tags",
            "v1.1.6 (2026-03-22) - FIX: requestSign() - add libCode:'P' to N8N payload; N8N confirm flow v4 uses sign_{sourceId}_P_{action} in callback_data and PATCHes Pokladňa directly (no podpis GET needed)",
            "v1.1.5 (2026-03-22) - FIX: requestSign() - send sourceId (entryId) to N8N for callback_data; N8N confirm flow v2 searches by Zdroj ID + fromChatId",
            "v1.1.4 (2026-03-22) - FIX: requestSign() - create Podpisy via libByName().create() (not Cloud API); set Zamestnanec as linkToEntry; link Pokladňa→Podpisy in-memory; fix 'Čaká ' trailing space",
            "v1.1.3 (2026-03-22) - FIX: requestSign() - remove PATCH Pokladňa→Podpisy (Memento API PATCH may use replace semantics causing field erasure)",
            "v1.1.2 (2026-03-22) - FIX: requestSign() - duplicate check on Stav podpisu; add Zamestnanec+Dátum odoslania to podpisPayload; PATCH link Pokladňa→Podpisy after creation",
            "v1.1.1 (2026-03-22) - FIX: requestSign() - String.fromCharCode() pre ď/ú",
            "v1.1.0 (2026-03-22) - NEW: requestSign() - send payment record for employee confirmation via N8N+Telegram"
        ].join("\n")
    };

    // ==============================================
    // CONFIGURATION
    // ==============================================

    var DEFAULT_CONFIG = {
        scriptName: "Pokladňa Module",

        // Field mappings (Slovak names)
        fields: {
            // Cash Book
            obligationPayment: "Úhrada záväzku",
            obligations: "Záväzky",
            sum: "Suma",
            employee: "Zamestnanec",
            supplier: "Dodávateľ",
            partner: "Partner",
            client: "Klient",
            transactionType: "Pohyb",
            date: "Dátum",

            // Receivables
            offsetReceivable: "Započítať pohľadávku",
            receivables: "Pohľadávky",
            overpaymentType: "Z preplatku vytvoriť",

            // Common
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            info: "info"
        },

        // Libraries
        libraries: {
            cashBook: "Pokladňa",
            obligations: "Záväzky",
            receivables: "Pohľadávky",
            employees: "Zamestnanci"
        },

        // Constants
        constants: {
            states: {
                unpaid: "Neuhradené",
                partiallyPaid: "Čiastočne uhradené",
                paid: "Uhradené"
            },
            overpaymentTypes: {
                receivable: "Pohľadávku",
                bonus: "Prémiu",
                advance: "Zálohu"
            },
            transactionTypes: {
                income: "Príjem",
                expense: "Výdavok"
            },
            expensePurpose: {
                wage: "Mzda",
                wageBonus: "Mzda prémia",
                wageAdvance: "Mzda záloha",
                supplierInvoices: "Faktúry dodávateľov",
                otherExpenses: "Ostatné výdavky"
            }
        }
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    function mergeConfig(userConfig) {
        if (!userConfig) return DEFAULT_CONFIG;

        var merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        // Merge user config (shallow merge for now)
        for (var key in userConfig) {
            if (userConfig.hasOwnProperty(key)) {
                merged[key] = userConfig[key];
            }
        }

        return merged;
    }

    function addDebug(entry, utils, message, icon) {
        if (!utils || !utils.addDebug) return;
        utils.addDebug(entry, message, icon);
    }

    function addError(entry, utils, message, functionName, error) {
        if (!utils || !utils.addError) return;
        utils.addError(entry, message, functionName, error);
    }

    function addInfo(entry, utils, title, data, meta) {
        if (!utils || !utils.addInfo) return;
        utils.addInfo(entry, title, data, meta);
    }

    // ==============================================
    // VALIDATION FUNCTIONS
    // ==============================================

    /**
     * Validates obligations and filters valid ones
     * @private
     */
    function validateObligations(cashEntry, utils, config) {
        try {
            var zavazkyArray = utils.safeGetLinks(cashEntry, config.fields.obligations);

            if (!zavazkyArray || zavazkyArray.length === 0) {
                return { success: false, error: "Nie sú vybrané žiadne záväzky!" };
            }

            addDebug(cashEntry, utils, "  📋 Počet vybraných záväzkov: " + zavazkyArray.length);

            // Get sum
            var suma = utils.safeGet(cashEntry, config.fields.sum, 0);
            suma = parseFloat(suma);

            if (isNaN(suma) || suma <= 0) {
                return { success: false, error: "Suma musí byť väčšia ako 0€!" };
            }

            // Filter valid obligations
            var validZavazky = [];
            var ownerInfo = null;
            var totalZostatok = 0;

            for (var i = 0; i < zavazkyArray.length; i++) {
                var zavazok = zavazkyArray[i];
                var stav = utils.safeGet(zavazok, "Stav");

                // Check state
                if (stav !== config.constants.states.unpaid &&
                    stav !== config.constants.states.partiallyPaid) {
                    addDebug(cashEntry, utils, "  ⚠️ Záväzok #" + zavazok.field("ID") +
                             " preskočený - stav: " + stav, "warning");
                    continue;
                }

                // Get owner
                var currentOwner = getObligationOwner(zavazok, utils, config);
                if (!currentOwner) {
                    addDebug(cashEntry, utils, "  ⚠️ Záväzok #" + zavazok.field("ID") +
                             " nemá vlastníka", "warning");
                    continue;
                }

                // Check owner consistency
                if (!ownerInfo) {
                    ownerInfo = currentOwner;
                } else if (ownerInfo.id !== currentOwner.id) {
                    return {
                        success: false,
                        error: "Všetky záväzky musia mať rovnakého vlastníka!\n" +
                              "Prvý vlastník: " + ownerInfo.displayName + "\n" +
                              "Konfliktný vlastník: " + currentOwner.displayName
                    };
                }

                var zostatok = utils.safeGet(zavazok, "Zostatok", 0);
                totalZostatok += zostatok;
                validZavazky.push(zavazok);
            }

            if (validZavazky.length === 0) {
                return { success: false, error: "Žiadne platné záväzky na uhradenie!" };
            }

            addDebug(cashEntry, utils, "✅ Validácia úspešná:");
            addDebug(cashEntry, utils, "  • Platné záväzky: " + validZavazky.length);
            addDebug(cashEntry, utils, "  • Vlastník: " + ownerInfo.displayName);
            addDebug(cashEntry, utils, "  • Celkový zostatok: " + utils.formatMoney(totalZostatok));
            addDebug(cashEntry, utils, "  • Dostupná suma: " + utils.formatMoney(suma));

            return {
                success: true,
                validZavazky: validZavazky,
                ownerInfo: ownerInfo,
                totalZostatok: totalZostatok,
                dostupnaSuma: suma
            };

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "validateObligations", error);
            return { success: false, error: "Chyba validácie: " + error.toString() };
        }
    }

    /**
     * Get obligation owner
     * @private
     */
    function getObligationOwner(zavazok, utils, config) {
        try {
            var owner = null;
            var type = null;
            var displayName = "Neznámy";

            // Employee
            var employees = utils.safeGetLinks(zavazok, config.fields.employee);
            if (employees && employees.length > 0) {
                owner = employees[0];
                type = "employee";
                displayName = utils.formatEmployeeName(owner);
            }

            // Supplier
            if (!owner) {
                var suppliers = utils.safeGetLinks(zavazok, config.fields.supplier);
                if (suppliers && suppliers.length > 0) {
                    owner = suppliers[0];
                    type = "supplier";
                    displayName = utils.safeGet(owner, "Názov") || "Dodávateľ";
                }
            }

            // Partner
            if (!owner) {
                var partners = utils.safeGetLinks(zavazok, config.fields.partner);
                if (partners && partners.length > 0) {
                    owner = partners[0];
                    type = "partner";
                    displayName = utils.safeGet(owner, "Názov") || "Partner";
                }
            }

            // Client
            if (!owner) {
                var clients = utils.safeGetLinks(zavazok, config.fields.client);
                if (clients && clients.length > 0) {
                    owner = clients[0];
                    type = "client";
                    displayName = utils.safeGet(owner, "Názov") || "Klient";
                }
            }

            if (!owner) {
                return null;
            }

            return {
                owner: owner,
                type: type,
                displayName: displayName,
                id: owner.field("ID") || owner.field("id")
            };

        } catch (error) {
            addError(null, utils, "Chyba pri získavaní vlastníka", "getObligationOwner", error);
            return null;
        }
    }

    /**
     * Get receivable owner
     * @private
     */
    function getReceivableOwner(pohladavka, utils, config) {
        try {
            var owner = null;
            var type = null;
            var displayName = "Neznámy";

            // Employee
            var employees = utils.safeGetLinks(pohladavka, config.fields.employee);
            if (employees && employees.length > 0) {
                owner = employees[0];
                type = "employee";
                displayName = utils.formatEmployeeName(owner);
            }

            // Supplier
            if (!owner) {
                var suppliers = utils.safeGetLinks(pohladavka, config.fields.supplier);
                if (suppliers && suppliers.length > 0) {
                    owner = suppliers[0];
                    type = "supplier";
                    displayName = utils.safeGet(owner, "Názov") || "Dodávateľ";
                }
            }

            // Partner
            if (!owner) {
                var partners = utils.safeGetLinks(pohladavka, config.fields.partner);
                if (partners && partners.length > 0) {
                    owner = partners[0];
                    type = "partner";
                    displayName = utils.safeGet(owner, "Názov") || "Partner";
                }
            }

            // Client
            if (!owner) {
                var clients = utils.safeGetLinks(pohladavka, config.fields.client);
                if (clients && clients.length > 0) {
                    owner = clients[0];
                    type = "client";
                    displayName = utils.safeGet(owner, "Názov") || "Klient";
                }
            }

            if (!owner) {
                return null;
            }

            return {
                owner: owner,
                type: type,
                displayName: displayName,
                id: owner.field("ID") || owner.field("id")
            };

        } catch (error) {
            addError(null, utils, "Chyba pri získavaní vlastníka pohľadávky", "getReceivableOwner", error);
            return null;
        }
    }

    // ==============================================
    // RECEIVABLES PROCESSING
    // ==============================================

    /**
     * Check and process receivables offset
     * @private
     */
    function checkAndProcessReceivables(cashEntry, ownerInfo, zakladnaSuma, utils, config) {
        try {
            var zapocitat = utils.safeGet(cashEntry, config.fields.offsetReceivable, false);

            if (!zapocitat) {
                addDebug(cashEntry, utils, "  ℹ️ Započítanie pohľadávok nie je požadované");
                return { finalAmount: zakladnaSuma, usedAmount: 0 };
            }

            // Get receivables
            var pohladavkyArray = utils.safeGetLinks(cashEntry, config.fields.receivables);

            if (!pohladavkyArray || pohladavkyArray.length === 0) {
                addDebug(cashEntry, utils, "  ⚠️ Žiadne pohľadávky na započítanie", "warning");
                return { finalAmount: zakladnaSuma, usedAmount: 0 };
            }

            // Filter valid receivables
            var validPohladavky = [];
            var totalPohladavky = 0;

            for (var i = 0; i < pohladavkyArray.length; i++) {
                var pohladavka = pohladavkyArray[i];
                var pohladavkaOwner = getReceivableOwner(pohladavka, utils, config);

                // Check owner
                if (!pohladavkaOwner || pohladavkaOwner.id !== ownerInfo.id) {
                    addDebug(cashEntry, utils, "  ⚠️ Pohľadávka #" + pohladavka.field("ID") +
                             " má iného vlastníka", "warning");
                    continue;
                }

                var zostatok = utils.safeGet(pohladavka, "Zostatok", 0);
                if (zostatok > 0) {
                    validPohladavky.push({
                        entry: pohladavka,
                        zostatok: zostatok
                    });
                    totalPohladavky += zostatok;
                }
            }

            if (validPohladavky.length === 0) {
                addDebug(cashEntry, utils, "  ⚠️ Žiadne platné pohľadávky rovnakého vlastníka", "warning");
                return { finalAmount: zakladnaSuma, usedAmount: 0 };
            }

            // Process receivables
            var usedAmount = 0;
            var potrebnaSuma = Math.min(totalPohladavky, zakladnaSuma);

            for (var j = 0; j < validPohladavky.length && potrebnaSuma > 0; j++) {
                var pohladavkaInfo = validPohladavky[j];
                var pouzit = Math.min(pohladavkaInfo.zostatok, potrebnaSuma);

                // Update receivable
                var novyZostatok = pohladavkaInfo.zostatok - pouzit;
                var noveZaplatene = utils.safeGet(pohladavkaInfo.entry, "Zaplatené", 0) + pouzit;

                utils.safeSet(pohladavkaInfo.entry, "Zaplatené", noveZaplatene);
                utils.safeSet(pohladavkaInfo.entry, "Zostatok", novyZostatok);
                pohladavkaInfo.entry.set("Stav", novyZostatok > 0 ?
                    config.constants.states.partiallyPaid : config.constants.states.paid);

                // Add cash book link if not set
                var existingPokladna = utils.safeGetLinks(pohladavkaInfo.entry, "Pokladňa") || [];
                if (!existingPokladna || existingPokladna.length === 0) {
                    utils.safeSet(pohladavkaInfo.entry, "Pokladňa", [cashEntry]);
                }

                // Info record
                addInfo(pohladavkaInfo.entry, utils, "ZAPOČÍTANIE POHĽADÁVKY", {
                    suma: pouzit,
                    zostatok: novyZostatok,
                    zdrojZaznam: "Pokladňa #" + cashEntry.field("ID")
                }, {});

                usedAmount += pouzit;
                potrebnaSuma -= pouzit;

                addDebug(cashEntry, utils, "  ✅ Použitá pohľadávka #" + pohladavkaInfo.entry.field("ID") +
                         ": " + utils.formatMoney(pouzit));
            }

            var finalAmount = zakladnaSuma + usedAmount;

            addDebug(cashEntry, utils, "✅ Pohľadávky spracované:");
            addDebug(cashEntry, utils, "  • Použitá suma: " + utils.formatMoney(usedAmount));
            addDebug(cashEntry, utils, "  • Finálna suma: " + utils.formatMoney(finalAmount));

            return { finalAmount: finalAmount, usedAmount: usedAmount };

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "checkAndProcessReceivables", error);
            return { finalAmount: zakladnaSuma, usedAmount: 0 };
        }
    }

    // ==============================================
    // PAYMENT PROCESSING
    // ==============================================

    /**
     * Process full payment of obligation
     * @private
     */
    function processFullPayment(cashEntry, zavazok, suma, ownerInfo, utils, config) {
        try {
            var pvodneZaplatene = utils.safeGet(zavazok, "Zaplatené", 0);
            var noveZaplatene = pvodneZaplatene + suma;

            // Update obligation
            utils.safeSet(zavazok, "Zaplatené", noveZaplatene);
            utils.safeSet(zavazok, "Zostatok", 0);
            zavazok.set("Stav", config.constants.states.paid);

            // Info record
            addInfo(zavazok, utils, "ÚPLNÁ ÚHRADA ZÁVÄZKU", {
                suma: suma,
                zostatok: 0,
                vlastnik: ownerInfo.displayName,
                zdrojZaznam: "Pokladňa #" + cashEntry.field("ID")
            }, {});

            addDebug(cashEntry, utils, "    ✅ Úplná úhrada: " + utils.formatMoney(suma));

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "processFullPayment", error);
        }
    }

    /**
     * Process partial payment of obligation
     * @private
     */
    function processPartialPayment(cashEntry, zavazok, suma, ownerInfo, utils, config) {
        try {
            var zostatok = utils.safeGet(zavazok, "Zostatok", 0);
            var pvodneZaplatene = utils.safeGet(zavazok, "Zaplatené", 0);
            var noveZaplatene = pvodneZaplatene + suma;
            var novyZostatok = zostatok - suma;

            // Update obligation
            utils.safeSet(zavazok, "Zaplatené", noveZaplatene);
            utils.safeSet(zavazok, "Zostatok", novyZostatok);
            zavazok.set("Stav", config.constants.states.partiallyPaid);

            // Info record
            addInfo(zavazok, utils, "ČIASTOČNÁ ÚHRADA ZÁVÄZKU", {
                suma: suma,
                zostatok: novyZostatok,
                vlastnik: ownerInfo.displayName,
                zdrojZaznam: "Pokladňa #" + cashEntry.field("ID")
            }, {});

            addDebug(cashEntry, utils, "    🔄 Čiastočná úhrada: " + utils.formatMoney(suma) +
                     ", zostáva: " + utils.formatMoney(novyZostatok));

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "processPartialPayment", error);
        }
    }

    /**
     * Process payments to obligations chronologically
     * @private
     */
    function processPayments(cashEntry, validZavazky, dostupnaSuma, ownerInfo, utils, config) {
        try {
            addDebug(cashEntry, utils, "Spúšťam proces úhrad...");
            addDebug(cashEntry, utils, "  • Dostupná suma: " + utils.formatMoney(dostupnaSuma));
            addDebug(cashEntry, utils, "  • Počet záväzkov: " + validZavazky.length);

            var uhradeneZavazky = [];
            var datumyZavazkov = [];
            var zbyvajucaSuma = dostupnaSuma;

            // Sort obligations chronologically
            validZavazky.sort(function(a, b) {
                var dateA = utils.safeGet(a, config.fields.date, new Date(0));
                var dateB = utils.safeGet(b, config.fields.date, new Date(0));
                return new Date(dateA) - new Date(dateB);
            });

            // Process each obligation
            for (var i = 0; i < validZavazky.length && zbyvajucaSuma > 0.01; i++) {
                var zavazok = validZavazky[i];
                var zostatok = utils.safeGet(zavazok, "Zostatok", 0);
                var datum = utils.safeGet(zavazok, config.fields.date);

                addDebug(cashEntry, utils, "  📋 Záväzok " + (i + 1) + "/" + validZavazky.length +
                         ": " + utils.formatMoney(zostatok));

                if (zbyvajucaSuma >= zostatok) {
                    // Full payment
                    processFullPayment(cashEntry, zavazok, zostatok, ownerInfo, utils, config);

                    uhradeneZavazky.push({
                        zavazok: zavazok,
                        amount: zostatok,
                        type: "úplná"
                    });

                    zbyvajucaSuma = Math.round((zbyvajucaSuma - zostatok) * 100) / 100;

                } else if (zbyvajucaSuma > 0) {
                    // Partial payment
                    processPartialPayment(cashEntry, zavazok, zbyvajucaSuma, ownerInfo, utils, config);

                    uhradeneZavazky.push({
                        zavazok: zavazok,
                        amount: zbyvajucaSuma,
                        type: "čiastočná"
                    });

                    zbyvajucaSuma = 0;
                }

                // Record date
                if (datum) {
                    datumyZavazkov.push(utils.formatDate(datum));
                }
            }

            addDebug(cashEntry, utils, "✅ Proces úhrad dokončený:");
            addDebug(cashEntry, utils, "  • Uhradené záväzky: " + uhradeneZavazky.length);
            addDebug(cashEntry, utils, "  • Preplatok: " + utils.formatMoney(zbyvajucaSuma));

            return {
                success: true,
                uhradeneZavazky: uhradeneZavazky,
                datumyZavazkov: datumyZavazkov,
                preplatokSuma: zbyvajucaSuma
            };

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "processPayments", error);
            return {
                success: false,
                uhradeneZavazky: [],
                datumyZavazkov: [],
                preplatokSuma: 0
            };
        }
    }

    // ==============================================
    // OVERPAYMENT PROCESSING
    // ==============================================

    /**
     * Create receivable from overpayment
     * @private
     */
    function createReceivableFromOverpayment(cashEntry, suma, ownerInfo, utils, config) {
        try {
            var pohladavkyLib = libByName(config.libraries.receivables);
            if (!pohladavkyLib) {
                addError(cashEntry, utils, "Knižnica Pohľadávky nenájdená", "createReceivableFromOverpayment");
                return { success: false };
            }

            var novaPohladavka = pohladavkyLib.create({});

            // Set basic data
            utils.safeSet(novaPohladavka, "Dátum", moment().toDate());
            utils.safeSet(novaPohladavka, "Druh", "Preplatok z úhrady záväzkov");
            utils.safeSet(novaPohladavka, "Stav", config.constants.states.unpaid);
            utils.safeSet(novaPohladavka, "Suma", suma);
            utils.safeSet(novaPohladavka, "Zaplatené", 0);
            utils.safeSet(novaPohladavka, "Zostatok", suma);

            // Set debtor by owner type
            var dlznik = "";
            if (ownerInfo.type === "employee") {
                dlznik = "Zamestnanec";
                utils.safeSet(novaPohladavka, config.fields.employee, [ownerInfo.owner]);
            } else if (ownerInfo.type === "supplier") {
                dlznik = "Dodávateľ";
                utils.safeSet(novaPohladavka, config.fields.supplier, [ownerInfo.owner]);
            } else if (ownerInfo.type === "partner") {
                dlznik = "Partner";
                utils.safeSet(novaPohladavka, config.fields.partner, [ownerInfo.owner]);
            } else if (ownerInfo.type === "client") {
                dlznik = "Klient";
                utils.safeSet(novaPohladavka, config.fields.client, [ownerInfo.owner]);
            }
            utils.safeSet(novaPohladavka, "Dlžník", dlznik);

            // Link to cash book
            utils.safeSet(novaPohladavka, "Pokladňa", [cashEntry]);

            // Description
            var popis = "Preplatok z úhrady záväzkov - " + ownerInfo.displayName;
            utils.safeSet(novaPohladavka, "Popis", popis);

            // Info record
            addInfo(novaPohladavka, utils, "AUTOMATICKY VYTVORENÁ POHĽADÁVKA", {
                dovod: "Preplatok z úhrady záväzkov",
                suma: suma,
                vlastnik: ownerInfo.displayName,
                zdrojZaznam: "Pokladňa #" + cashEntry.field("ID"),
                zdrojKniznica: config.libraries.cashBook
            }, {});

            // Link receivable to cash entry
            var existingPohladavky = utils.safeGetLinks(cashEntry, config.fields.receivables) || [];
            existingPohladavky.push(novaPohladavka);
            utils.safeSet(cashEntry, config.fields.receivables, existingPohladavky);

            addDebug(cashEntry, utils, "  ✅ Vytvorená pohľadávka #" + novaPohladavka.field("ID"));

            return { success: true, pohladavka: novaPohladavka };

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "createReceivableFromOverpayment", error);
            return { success: false };
        }
    }

    /**
     * Create advance payment (receivable + cash entry)
     * @private
     */
    function createAdvancePayment(cashEntry, suma, ownerInfo, utils, config) {
        try {
            // Create receivable for advance
            var pohladavkaResult = createReceivableFromOverpayment(cashEntry, suma, ownerInfo, utils, config);
            if (!pohladavkaResult.success) {
                return { success: false };
            }

            // Create new cash book entry for advance
            var pokladnaLib = libByName(config.libraries.cashBook);
            if (!pokladnaLib) {
                addError(cashEntry, utils, "Knižnica Pokladňa nenájdená", "createAdvancePayment");
                return { success: false };
            }

            var novyZaznam = pokladnaLib.create();

            // Set data
            utils.safeSet(novyZaznam, config.fields.date, moment().toDate());
            utils.safeSet(novyZaznam, config.fields.transactionType, config.constants.transactionTypes.expense);
            utils.safeSet(novyZaznam, config.fields.sum, suma);

            // Expense purpose
            var ucelVydaja = config.constants.expensePurpose.otherExpenses;
            if (ownerInfo.type === "employee") {
                ucelVydaja = config.constants.expensePurpose.wageAdvance;
            }
            utils.safeSet(novyZaznam, "Účel výdaja", ucelVydaja);

            // Payment description
            var popisZalohy = ownerInfo.displayName + ", záloha na mzdu";
            utils.safeSet(novyZaznam, "Popis platby", popisZalohy);

            // Owner
            if (ownerInfo.type === "employee") {
                utils.safeSet(novyZaznam, config.fields.employee, [ownerInfo.owner]);
            } else if (ownerInfo.type === "supplier") {
                utils.safeSet(novyZaznam, config.fields.supplier, [ownerInfo.owner]);
            }

            // Link with receivable
            utils.safeSet(novyZaznam, config.fields.receivables, [pohladavkaResult.pohladavka]);

            // From cash register
            var zPokladne = utils.safeGetLinks(cashEntry, "Z pokladne");
            if (zPokladne && zPokladne.length > 0) {
                utils.safeSet(novyZaznam, "Z pokladne", zPokladne);
            }

            // Info record
            addInfo(novyZaznam, utils, "AUTOMATICKY VYTVORENÁ ZÁLOHA", {
                dovod: "Preplatok z úhrady záväzkov",
                suma: suma,
                vlastnik: ownerInfo.displayName,
                zdrojZaznam: "Pokladňa #" + cashEntry.field("ID")
            }, {});

            addDebug(cashEntry, utils, "  ✅ Vytvorený pokladničný záznam pre zálohu #" + novyZaznam.field("ID"));

            return { success: true, pohladavka: pohladavkaResult.pohladavka, pokladna: novyZaznam };

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "createAdvancePayment", error);
            return { success: false };
        }
    }

    /**
     * Create bonus payment (cash entry only)
     * @private
     */
    function createBonusPayment(cashEntry, suma, ownerInfo, utils, config) {
        try {
            var pokladnaLib = libByName(config.libraries.cashBook);
            if (!pokladnaLib) {
                addError(cashEntry, utils, "Knižnica Pokladňa nenájdená", "createBonusPayment");
                return { success: false };
            }

            var novyZaznam = pokladnaLib.create({});

            // Set data
            utils.safeSet(novyZaznam, config.fields.date, moment().toDate());
            utils.safeSet(novyZaznam, config.fields.transactionType, config.constants.transactionTypes.expense);
            utils.safeSet(novyZaznam, config.fields.sum, suma);
            utils.safeSet(novyZaznam, "Účel výdaja", config.constants.expensePurpose.wageBonus);

            // Payment description
            var popis = ownerInfo.displayName + ", prémia z preplatku";
            utils.safeSet(novyZaznam, "Popis platby", popis);

            // Owner
            if (ownerInfo.type === "employee") {
                utils.safeSet(novyZaznam, config.fields.employee, [ownerInfo.owner]);
            }

            // From cash register
            var zPokladne = utils.safeGetLinks(cashEntry, "Z pokladne");
            if (zPokladne && zPokladne.length > 0) {
                utils.safeSet(novyZaznam, "Z pokladne", zPokladne);
            }

            // Info record
            addInfo(novyZaznam, utils, "AUTOMATICKY VYTVORENÁ PRÉMIA", {
                dovod: "Preplatok z úhrady záväzkov",
                suma: suma,
                vlastnik: ownerInfo.displayName,
                zdrojZaznam: "Pokladňa #" + cashEntry.field("ID")
            }, {});

            addDebug(cashEntry, utils, "  ✅ Vytvorený pokladničný záznam pre prémiu #" + novyZaznam.field("ID"));

            return { success: true, pokladna: novyZaznam };

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "createBonusPayment", error);
            return { success: false };
        }
    }

    /**
     * Process overpayment based on selected type
     * @private
     */
    function processOverpayment(cashEntry, preplatokSuma, typPreplatku, ownerInfo, utils, config) {
        try {
            addDebug(cashEntry, utils, "Spracovávam preplatok: " + utils.formatMoney(preplatokSuma));

            if (!typPreplatku) {
                addDebug(cashEntry, utils, "  ⚠️ Typ preplatku nie je nastavený", "warning");
                return { success: false };
            }

            var result = { success: false };

            switch (typPreplatku) {
                case config.constants.overpaymentTypes.receivable:
                    result = createReceivableFromOverpayment(cashEntry, preplatokSuma, ownerInfo, utils, config);
                    break;

                case config.constants.overpaymentTypes.advance:
                    result = createAdvancePayment(cashEntry, preplatokSuma, ownerInfo, utils, config);
                    break;

                case config.constants.overpaymentTypes.bonus:
                    result = createBonusPayment(cashEntry, preplatokSuma, ownerInfo, utils, config);
                    break;

                default:
                    addError(cashEntry, utils, "Neznámy typ preplatku: " + typPreplatku, "processOverpayment");
            }

            if (result.success) {
                addDebug(cashEntry, utils, "✅ Preplatok spracovaný ako: " + typPreplatku);
            }

            return result;

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "processOverpayment", error);
            return { success: false };
        }
    }

    // ==============================================
    // FINALIZATION
    // ==============================================

    /**
     * Finalize transaction - update cash entry fields
     * @private
     */
    function finalizeTransaction(cashEntry, dostupnaSuma, paymentResult, ownerInfo, usedReceivables, utils, config) {
        try {
            addDebug(cashEntry, utils, "Finalizujem transakciu...");

            // Calculate actual used amount (without overpayment)
            var skutocnaPouzitaSuma = dostupnaSuma - paymentResult.preplatokSuma;
            skutocnaPouzitaSuma = Math.round(skutocnaPouzitaSuma * 100) / 100;

            // If overpayment, adjust sum in entry
            if (paymentResult.preplatokSuma > 0) {
                addDebug(cashEntry, utils, "  💰 Úprava sumy z " + utils.formatMoney(dostupnaSuma) +
                         " na " + utils.formatMoney(skutocnaPouzitaSuma));

                cashEntry.set(config.fields.sum, skutocnaPouzitaSuma);
            }

            // Set owner in cash book
            clearOwnerFields(cashEntry, utils, config);
            setOwnerField(cashEntry, ownerInfo, utils, config);

            // Create payment description
            var datumyStr = "";
            if (paymentResult.datumyZavazkov && paymentResult.datumyZavazkov.length > 0) {
                var uniqueDates = [];
                for (var i = 0; i < paymentResult.datumyZavazkov.length; i++) {
                    if (uniqueDates.indexOf(paymentResult.datumyZavazkov[i]) === -1) {
                        uniqueDates.push(paymentResult.datumyZavazkov[i]);
                    }
                }
                datumyStr = uniqueDates.join(", ");
            }

            var popis = generatePaymentDescription(ownerInfo, datumyStr, utils);
            utils.safeSet(cashEntry, "Popis platby", popis);

            // Set expense purpose
            var ucelVydaja = config.constants.expensePurpose.otherExpenses;
            if (ownerInfo.type === "employee") {
                ucelVydaja = config.constants.expensePurpose.wage;
            } else if (ownerInfo.type === "supplier") {
                ucelVydaja = config.constants.expensePurpose.supplierInvoices;
            }
            utils.safeSet(cashEntry, "Účel výdaja", ucelVydaja);

            // Info record
            var infoData = {
                suma: skutocnaPouzitaSuma,
                vlastnik: ownerInfo.displayName,
                uhradenychZavazkov: paymentResult.uhradeneZavazky.length,
                preplatok: paymentResult.preplatokSuma
            };

            if (usedReceivables > 0) {
                infoData.pouzitePohladavky = usedReceivables;
            }

            addInfo(cashEntry, utils, "ÚHRADA ZÁVÄZKOV DOKONČENÁ", infoData, {
                scriptName: "Pokladna Module",
                scriptVersion: MODULE_INFO.version
            });

            addDebug(cashEntry, utils, "✅ Transakcia finalizovaná");

        } catch (error) {
            addError(cashEntry, utils, error.toString(), "finalizeTransaction", error);
        }
    }

    /**
     * Clear owner fields
     * @private
     */
    function clearOwnerFields(cashEntry, utils, config) {
        try {
            utils.safeSet(cashEntry, config.fields.employee, []);
            utils.safeSet(cashEntry, config.fields.supplier, []);
            utils.safeSet(cashEntry, config.fields.partner, []);
            utils.safeSet(cashEntry, config.fields.client, []);
        } catch (error) {
            addDebug(cashEntry, utils, "  ⚠️ Niektoré polia vlastníkov sa nepodarilo vymazať", "warning");
        }
    }

    /**
     * Set owner field based on owner type
     * @private
     */
    function setOwnerField(cashEntry, ownerInfo, utils, config) {
        try {
            if (ownerInfo.type === "employee") {
                utils.safeSet(cashEntry, config.fields.employee, [ownerInfo.owner]);
            } else if (ownerInfo.type === "supplier") {
                utils.safeSet(cashEntry, config.fields.supplier, [ownerInfo.owner]);
            } else if (ownerInfo.type === "partner") {
                utils.safeSet(cashEntry, config.fields.partner, [ownerInfo.owner]);
            } else if (ownerInfo.type === "client") {
                utils.safeSet(cashEntry, config.fields.client, [ownerInfo.owner]);
            }

            addDebug(cashEntry, utils, "  ✅ Nastavený " + ownerInfo.type + ": " + ownerInfo.displayName);

        } catch (error) {
            addError(cashEntry, utils, "Chyba pri nastavení vlastníka", "setOwnerField", error);
        }
    }

    /**
     * Generate payment description
     * @private
     */
    function generatePaymentDescription(ownerInfo, datumyStr, utils) {
        var popis = ownerInfo.displayName;

        if (ownerInfo.type === "employee") {
            // Try to get Nick
            var nick = utils.safeGet(ownerInfo.owner, "Nick");
            if (nick) {
                popis = "Mzda " + nick;
            }
        }

        popis += ", úhrada záväzkov";

        if (datumyStr) {
            popis += " zo " + datumyStr;
        }

        return popis;
    }

    // ==============================================
    // PUBLIC API - MAIN FUNCTION
    // ==============================================

    /**
     * Main payment distribution function
     *
     * Handles complex payment distribution logic:
     * 1. Validates obligations (same owner required)
     * 2. Optionally offsets with receivables
     * 3. Distributes payment among obligations chronologically
     * 4. Handles overpayment (create receivable/advance/bonus)
     * 5. Finalizes transaction (updates cash book entry)
     *
     * @param {Entry} cashEntry - Cash book entry
     * @param {Object} options - Configuration
     *   - utils: MementoUtils instance (required)
     *   - config: Custom configuration (optional, uses DEFAULT_CONFIG if not provided)
     * @returns {Object} Result with success status and details
     *
     * @example
     * var result = Pokladna.payObligations(entry(), {
     *     utils: MementoUtils
     * });
     *
     * if (!result.success) {
     *     message("❌ " + result.error);
     *     cancel();
     * }
     */
    function payObligations(cashEntry, options) {
        try {
            var utils = options.utils || (typeof MementoUtils !== 'undefined' ? MementoUtils : null);
            var config = mergeConfig(options.config);

            if (!utils) {
                return {
                    success: false,
                    error: "MementoUtils not available"
                };
            }

            addDebug(cashEntry, utils, "🏦 === ŠTART Pokladna.payObligations v" + MODULE_INFO.version + " ===");

            // Check if script should run
            var uhradaZavazku = utils.safeGet(cashEntry, config.fields.obligationPayment, false);
            if (!uhradaZavazku) {
                addDebug(cashEntry, utils, "❌ Checkbox 'Úhrada záväzku' nie je zaškrtnutý");
                return {
                    success: false,
                    error: "Checkbox 'Úhrada záväzku' nie je zaškrtnutý"
                };
            }

            addDebug(cashEntry, utils, "✅ Checkbox 'Úhrada záväzku' je zaškrtnutý - pokračujem");

            // STEP 1: Validate obligations
            addDebug(cashEntry, utils, utils.getIcon("validation") + " KROK 1: Validácia záväzkov");
            var validationResult = validateObligations(cashEntry, utils, config);

            if (!validationResult.success) {
                addError(cashEntry, utils, validationResult.error, "payObligations");
                return validationResult;
            }

            // STEP 2: Check and process receivables
            addDebug(cashEntry, utils, utils.getIcon("search") + " KROK 2: Kontrola pohľadávok");
            var pohladavkyResult = checkAndProcessReceivables(
                cashEntry,
                validationResult.ownerInfo,
                validationResult.dostupnaSuma,
                utils,
                config
            );
            var finalAmount = pohladavkyResult.finalAmount;
            var usedReceivables = pohladavkyResult.usedAmount;

            // STEP 3: Process payments
            addDebug(cashEntry, utils, utils.getIcon("money") + " KROK 3: Proces úhrady záväzkov");
            var paymentResult = processPayments(
                cashEntry,
                validationResult.validZavazky,
                finalAmount,
                validationResult.ownerInfo,
                utils,
                config
            );

            if (!paymentResult.success) {
                return paymentResult;
            }

            // STEP 4: Process overpayment
            if (paymentResult.preplatokSuma > 0) {
                addDebug(cashEntry, utils, utils.getIcon("create") + " KROK 4: Spracovanie preplatku");

                var typPreplatku = utils.safeGet(cashEntry, config.fields.overpaymentType);
                processOverpayment(cashEntry, paymentResult.preplatokSuma, typPreplatku,
                                  validationResult.ownerInfo, utils, config);
            }

            // STEP 5: Finalize transaction
            addDebug(cashEntry, utils, utils.getIcon("save") + " KROK 5: Finalizácia transakcie");
            finalizeTransaction(
                cashEntry,
                validationResult.dostupnaSuma,
                paymentResult,
                validationResult.ownerInfo,
                usedReceivables,
                utils,
                config
            );

            addDebug(cashEntry, utils, "🎉 === KONIEC Pokladna.payObligations v" + MODULE_INFO.version + " ===");

            return {
                success: true,
                uhradeneZavazky: paymentResult.uhradeneZavazky.length,
                pouzitaSuma: validationResult.dostupnaSuma - paymentResult.preplatokSuma,
                preplatok: paymentResult.preplatokSuma,
                pouzitePohladavky: usedReceivables,
                vlastnik: validationResult.ownerInfo.displayName
            };

        } catch (error) {
            var errorMsg = "Kritická chyba v Pokladna.payObligations: " + error.toString();
            if (options.utils) {
                addError(cashEntry, options.utils, errorMsg, "payObligations", error);
            }
            return {
                success: false,
                error: errorMsg
            };
        }
    }

    // ==============================================
    // REQUEST SIGN (Pokladňa)
    // ==============================================

    /**
     * Odošle platobný záznam na potvrdenie (podpis) zamestnancovi cez Telegram.
     * Pokladňa má vždy max jedného zamestnanca (pole "Zamestnanec").
     *
     * @param {Entry} entry - Pokladňa entry object
     * @param {Object} config - MementoConfig
     * @param {Object} utils  - MementoUtils
     * @returns {Object} { success, error }
     */
    function requestSign(entry, config, utils) {
        // v1.3.0: delegates to MementoSign (generic protocol v2)
        // MementoSign stores metadata in Podpis record — N8N flow has no hardcoded libMap.

        var _dbg = ["[Pokladna.requestSign v1.3.0]"];
        function _log(msg) {
            _dbg.push(msg);
            try { entry.set("Debug_Log", _dbg.join("\n")); } catch(e) {}
        }
        function _errLog(msg) {
            try {
                var ex = entry.field("Error_Log") || "";
                entry.set("Error_Log", ex + msg + "\n");
            } catch(e) {}
        }

        _log("start");

        try {
            if (typeof MementoSign === 'undefined') {
                return { success: false, error: "MementoSign modul nie je na\u010d\u00edtan\u00fd" };
            }

            // --- Duplicate check ---
            var stavPodpisu = (entry.field("Stav podpisu") || "").trim();
            _log("stavPodpisu='" + stavPodpisu + "'");
            if (stavPodpisu === "Čaká" || stavPodpisu === "Hotovo") {
                return { success: false, error: "Podpis u\u017e bol odoslan\u00fd (Stav: " + stavPodpisu + ")" };
            }

            var entryId = entry.id;
            _log("entryId=" + entryId);
            if (!entryId) return { success: false, error: "Ch\u00fdba entry ID z\u00e1znamu" };

            // --- Čítaj polia záznamu ---
            var datumField  = entry.field("D\u00e1tum");
            var pohybField  = entry.field("Pohyb");
            var sumaField   = entry.field("Suma");
            var popisField  = entry.field("Popis platby");
            var ucelField   = entry.field("\u00da\u010del v\u00fddaja") || entry.field("\u00da\u010del pr\u00edjmu") || "";
            var zamestnanec = entry.field("Zamestnanec");

            _log("pohyb=" + pohybField + " suma=" + sumaField);
            _log("zamestnanec=" + (zamestnanec ? ("type=" + typeof zamestnanec + " [0]=" + (zamestnanec[0] ? "entry" : "undef")) : "NULL"));

            // Memento entries field returns Java/Kotlin array-like — always use [0]
            if (!zamestnanec) {
                return { success: false, error: "Z\u00e1znam nem\u00e1 priraden\u00fd 'Zamestnanec'" };
            }
            var zam = zamestnanec[0] || zamestnanec;
            if (!zam) {
                return { success: false, error: "Zamestnanec je pr\u00e1zdny" };
            }

            var nick   = zam.field ? (zam.field("Nick") || "") : "";
            var priezv = zam.field ? (zam.field("Priezvisko") || "") : "";
            var empName = (nick + " " + priezv).trim() || "Zamestnanec";

            var chatId = zam.field ? zam.field("Telegram ID") : null;
            chatId = chatId ? String(chatId).trim() : "";

            _log("emp=" + empName + " chatId=" + chatId);

            if (!chatId) {
                return { success: false, error: "Zamestnanec " + empName + " nem\u00e1 Telegram ID" };
            }

            // --- Formátovanie ---
            function fmtDate(d) {
                if (!d) return "N/A";
                var dd = d instanceof Date ? d : new Date(d);
                return ("0" + dd.getDate()).slice(-2) + "." +
                       ("0" + (dd.getMonth() + 1)).slice(-2) + "." +
                       dd.getFullYear();
            }
            function fmtMoney(v) {
                var n = parseFloat(v) || 0;
                return n.toFixed(2).replace(".", ",") + "\u00a0\u20ac";
            }

            var datumStr = fmtDate(datumField);
            var sumaStr  = fmtMoney(sumaField);
            var popisStr = popisField || ucelField || pohybField || "platba";

            _log("datum=" + datumStr + " suma=" + sumaStr);

            // --- Zostav správu ---
            var NL  = String.fromCharCode(10);
            var ico = pohybField === "V\u00fddavok" ? "\uD83D\uDCB8" : "\uD83D\uDCB0";
            var msg = "Pokladn\u0148a" + NL
                + "========================" + NL
                + "\uD83D\uDCC5 " + datumStr + NL
                + "\uD83D\uDC64 " + empName + NL
                + ico + " " + (pohybField || "Pohyb") + NL
                + "\uD83D\uDCDD " + popisStr
                + (ucelField && ucelField !== popisStr ? NL + "  \uD83C\uDFF7\uFE0F " + ucelField : "")
                + NL + "------------------------" + NL
                + "\uD83D\uDCB6 " + sumaStr;

            // --- Deleguj na MementoSign (generic protocol v2) ---
            var signConfig = {
                libId:           "g9eS5Ny2E",   // Pokladňa library ID
                sourceFieldId:   133,            // Stav podpisu field ID (id:133)
                stavPotvrdene:   "Hotovo",       // confirmed → write this to Pokladňa
                stavOdmietnutie: "Odmietnut\u00e1 ", // rejected → trailing space = choice label
                kniznicaLabel:   "Pokladňa ",   // Knižnica choice field in podpisy
                messageTemplate: "TG Template" // voliteľné pole so šablónou správy
            };

            var result = MementoSign.createPodpisAndSend(entry, zam, msg, chatId, signConfig);
            _log("MementoSign result: success=" + result.success + " podpisId=" + result.podpisId);

            if (!result.success) {
                _errLog("MementoSign error: " + result.error);
                return { success: false, error: result.error };
            }

            // Prepoj Podpis → Pokladňa a nastav stav
            if (result.podpisEntry) {
                entry.set("Podpis", [result.podpisEntry]);
            }
            // "Čaká " — trailing space je súčasťou choice labelu (id:133)
            entry.set("Stav podpisu", "Čaká ");
            _log("DONE");

            return { success: true };

        } catch (error) {
            _errLog("KRITICKÁ CHYBA: " + error.toString());
            return { success: false, error: error.toString() };
        }
    }

    // ==============================================
    // PUBLIC API EXPORT
    // ==============================================

    return {
        // Module info
        info: MODULE_INFO,
        version: MODULE_INFO.version,

        // Main functions
        payObligations: payObligations,
        requestSign: requestSign
    };

})();

// ==============================================
// AUTO-EXPORT INFO ON LOAD
// ==============================================

if (typeof log !== 'undefined') {
    log("✅ " + Pokladna.info.name + " v" + Pokladna.version + " loaded (" + Pokladna.info.status + ")");
    log("   📋 Extracted from: " + Pokladna.info.extractedFrom + " (" + Pokladna.info.extractedLines + " lines)");
}
