/**
 * FIELD MAPPING: Cenové ponuky → Zákazky
 *
 * Tento súbor dokumentuje mapovanie polí medzi knižnicami pre CP.Action.CreateOrder.js
 * Vytvára a synchronizuje zákazky z cenových ponúk
 *
 * Verzia: 1.0.0
 * Dátum: 2025-10-10
 */

// ==============================================
// MAPOVANIE POLÍ: Cenové ponuky → Zákazky
// ==============================================

const FIELD_MAPPING = {
    // ===== ZÁKLADNÉ IDENTIFIKAČNÉ POLIA =====
    // Tieto polia sa syncujú pri CREATE aj UPDATE
    basic: {
        number: {
            source: "Číslo",                    // quote.number
            target: "Číslo",                    // order.number
            type: "text",
            sync: "always"
        },
        name: {
            source: "Názov",                    // quote.name
            target: "Názov",                    // order.name
            type: "text",
            sync: "always"
        },
        description: {
            source: "Popis cenovej ponuky",     // quote.description
            target: "Popis zákazky",            // order.description ✅ ROZDIELNY NÁZOV
            type: "text",
            sync: "always"
        },
        date: {
            source: "Dátum",                    // quote.date
            target: "Dátum",                    // order.date
            type: "date",
            sync: "always"
        },
        type: {
            source: "Typ cenovej ponuky",       // quote.type (Hodinovka, Položky, Externá)
            target: "Typ zákazky",              // order.orderCalculationType ✅ ROZDIELNY NÁZOV
            type: "radio/choice",
            sync: "always"
        },
        place: {
            source: "Miesto realizácie",        // quote.place
            target: "Miesto",                   // order.place ✅ ROZDIELNY NÁZOV
            type: "entries (linkToEntry)",
            sync: "always"
        }
    },

    // ===== ÚČTOVANIE DOPRAVY =====
    transport: {
        calculation: {
            source: "Účtovanie dopravy",        // quote.rideCalculation
            target: "Účtovanie dopravy",        // order.rideCalculation (field 296)
            type: "choice",
            sync: "always"
        },
        percentage: {
            source: "Doprava %",                // quote.ridePercentage
            target: "Doprava %",                // order.transportPercentage (field 298)
            type: "double",
            sync: "always"
        },
        kmPrice: {
            source: "Doprava cena za km",       // quote.kmPrice
            target: "Doprava cena za km",       // order.kmPrice (field 300)
            type: "entries (linkToEntry)",
            sync: "always"
        },
        flatRate: {
            source: "Doprava paušál",           // quote.rideFlatRate
            target: "Doprava paušál",           // order.rideFlatRate (field 299)
            type: "entries (linkToEntry)",
            sync: "always"
        },
        fixedPrice: {
            source: "Doprava pevná cena",       // quote.fixedTransportPrice
            target: "Doprava pevná cena",       // order.fixedTransportPrice (field 301)
            type: "currency",
            sync: "always"
        }
    },

    // ===== ÚČTOVANIE PRESUNU HMÔT =====
    massTransfer: {
        calculation: {
            source: "Účtovanie presunu hmôt",   // quote.massTransferCalculation
            target: "Účtovanie presunu hmôt",   // order.massTransferCalculation (field 297)
            type: "choice",
            sync: "always"
        },
        percentage: {
            source: "Presun hmôt %",            // quote.massTransferPercentage
            target: "Presun hmôt %",            // order.massTransferPercentage (field 304)
            type: "double",
            sync: "always"
        },
        price: {
            source: "Cena presunu hmôt materiálu", // quote.massTransferPriceEntry
            target: "Cena presunu hmôt",        // order.massTransferPrice (field 302)
            type: "entries (linkToEntry)",
            sync: "always"
        },
        flatRate: {
            source: "Paušál presunu hmôt",      // quote.massTransferFlatRate
            target: "Paušál presunu hmôt",      // order.massTransferFlatRate (field 307)
            type: "entries (linkToEntry)",
            sync: "always"
        },
        fixedPrice: {
            source: "Pevná cena presunu hmôt",  // quote.fixedMassTransferPrice
            target: "Presun hmôt pevná cena",   // order.fixedMassTransferPrice (field 303)
            type: "currency",
            sync: "always"
        },
        materialWeight: {
            source: "Hmotnosť materiálu",       // quote.materialWeight
            target: "Hmotnosť materiálu",       // order.materialWeight (field 306)
            type: "double",
            sync: "always"
        }
    },

    // ===== ÚČTOVANIE SUBDODÁVOK =====
    subcontracts: {
        calculation: {
            source: "Účtovanie subdodávok",     // quote.subcontractsCalculation
            target: "Účtovanie subdodávok",     // order.subcontractsCalculation (field 305)
            type: "choice",
            sync: "always"
        },
        percentage: {
            source: "Subdodávky %",             // quote.subcontractsPercentage
            target: "Prirážka subdodávky",      // order.subcontractorMarkup (field 276) ✅ ROZDIELNY NÁZOV
            type: "double",
            sync: "always"
        }
    },

    // ===== DPH =====
    vat: {
        rate: {
            source: "Sadzba DPH",               // quote.vatRate
            target: "Sadzba DPH",               // order.vatRate ✅ Potrebné doplniť do order fields?
            type: "text/double",
            sync: "always"
        }
    },

    // ===== PREPOJENIA =====
    connections: {
        quoteLink: {
            source: null,                       // Cenová ponuka NEMÁ pole pre zákazku
            target: "Cenová ponuka",            // order.quote (field 141) - linkToEntry
            type: "entries (linkToEntry)",
            sync: "create_only",
            note: "Zákazka → Cenová ponuka (vytvorí linksFrom v cenovej ponuke)"
        }
    },

    // ===== POLIA ČO SA NESYNCUJÚ =====
    ignored: {
        // Cenová ponuka má, Zákazka nemá:
        quoteOnly: [
            "Platnosť do",                      // quote.validUntil
            "Stav cenovej ponuky",              // quote.state
            "Počítanie hodinových sadzieb",     // quote.priceCalculation
            "Počítať zľavy na sadzby",          // quote.discountCalculation
            "budú počítame percentuálne zľavy podľa počtu hodín", // quote.discountDescription
            "Predpokladaný počet jázd",         // quote.expectedRidesCount
            "Predpokladaný počet km",           // quote.expectedKm
            "Cena dopravy",                     // quote.transportPrice (výstup výpočtu)
            "Cena presunu hmôt",                // quote.massTransferPrice (výstup výpočtu)
            "Cena subdodávok",                  // quote.subcontractsPrice
            "Celkom subdodávky",                // quote.subcontractsTotal
            "Cena externej ponuky",             // quote.externalPrice
            "Cena externej ponuky s DPH",       // quote.externalPriceWithVat
            "Celkom",                           // quote.total
            "DPH",                              // quote.vat
            "Cena celkom",                      // quote.totalWithVat
            "Poznámka",                         // quote.note
            "Text cenovej ponuky",              // quote.quoteText
            "Súbory",                           // quote.files
            "Diely",                            // quote.parts ⚠️ SYNC LEN PRI CREATE!
            "Subdodávky"                        // quote.subcontracts
        ],

        // Zákazka má, Cenová ponuka nemá:
        orderOnly: [
            "Stav",                             // order.state
            "Stav platby",                      // order.paymentState
            "Druh zákazky",                     // order.orderWorkType (field 94)
            "Dátum začatia",                    // order.startDate
            "Dátum ukončenia",                  // order.endDate
            "Rozpočet",                         // order.budget
            "Spotrebované",                     // order.spent
            "Zostatok",                         // order.remaining
            "Počet dní",                        // order.daysCount
            "Odpracovaných hodín",              // order.hoursCount
            "Mzdy",                             // order.wageCosts
            "Mzdy odvody",                      // order.wageDeductions
            "Najazdené km",                     // order.km
            "Počet jázd",                       // order.transportCounts
            "Mzdy v aute",                      // order.transportWageCosts
            "Hodiny v aute",                    // order.transportHours

            // VÝNOSY - Fakturácia
            "Práce",                            // order.revenueWork
            "DPH práce",                        // order.revenueWorkVat
            "Materiál",                         // order.revenueMaterial
            "DPH materiál",                     // order.revenueMaterialVat
            "Stroje",                           // order.revenueMachinery
            "DPH stroje",                       // order.revenueMachineryVat
            "Doprava",                          // order.revenueTransport
            "DPH doprava",                      // order.revenueTransportVat
            "Subdodávky",                       // order.revenueSubcontractors
            "DPH subdodávky",                   // order.revenueSubcontractorsVat
            "Ostatné",                          // order.revenueOther
            "DPH ostatné",                      // order.revenueOtherVat
            "Suma celkom",                      // order.revenueTotal
            "DPH celkom",                       // order.revenueTotalVat

            // NÁKLADY
            "Náklady práce",                    // order.costWork
            "Odpočet DPH práce",                // order.costWorkVatDeduction
            "Náklady materiál",                 // order.costMaterial
            "Odpočet DPH materiál",             // order.costMaterialVatDeduction
            "Náklady stroje",                   // order.costMachinery
            "Odpočet DPH stroje",               // order.costMachineryVatDeduction
            "Náklady doprava",                  // order.costTransport
            "Odpočet DPH doprava",              // order.costTransportVatDeduction
            "Náklady subdodávky",               // order.costSubcontractors
            "Odpočet DPH subdodávky",           // order.costSubcontractorsVatDeduction
            "Náklady ostatné",                  // order.costOther
            "Odpočet DPH ostatné",              // order.costOtherVatDeduction
            "Náklady celkom",                   // order.costTotal
            "Odpočet DPH celkom",               // order.costTotalVatDeduction
            "Iné výdavky",                      // order.otherExpenses

            // PRIRÁŽKY
            "Prirážka ostatné",                 // order.otherMarkup

            // ÚČTOVANIE
            "Účtovanie Materiálu",              // order.materialAccounting (field 313)
            "Účtovanie Prác",                   // order.workAccounting (field 312)
            "Účtovanie Subdodávky",             // order.subcontractAccounting (field 315)
            "Účtovanie Ostatné",                // order.otherAccounting (field 314)

            // TELEGRAM
            "Telegram skupina",                 // order.telegramGroup
            "Chat ID",                          // order.chatId
            "Thread ID",                        // order.threadId
            "Notifikácie",                      // order.notifications
            "info_telegram",                    // order.infoTelegram
            "TODO",                             // order.todo

            // VÝKAZY
            "Výkaz dopravy celkom",             // order.transportReportTotal
            "Výkaz materiálu celkom",           // order.materialReportTotal
            "Výkaz strojov celkom",             // order.machineryReportTotal
            "Výkaz prác celkom",                // order.workReportTotal

            // VYÚČTOVANIE
            "Vyúčtovanie",                      // order.billing
            "Vyúčtovanie celkom",               // order.billingTotal
            "txt vyúčtovanie celkom",           // order.billingTotalText

            // FINANČNÉ POLIA
            "efektivita",                       // order.efficiency
            "Marža",                            // order.margin
            "Zisk",                             // order.profit
            "Strata",                           // order.loss
            "Marža po zaplatení",               // order.marginAfterPayment
            "Zisk po zaplatení",                // order.profitAfterPayment
            "Dotácia zákazky",                  // order.subsidy
            "Zostatok rozpočtu",                // order.budgetRemaining
            "Prečerpanie rozpočtu",             // order.budgetOverrun
            "Zaplatené",                        // order.paid
            "Suma na úhradu",                   // order.amountDue

            "Klient",                           // order.client (field 256) ⚠️ MOŽNÉ DOPLNIŤ?
            "Diely"                             // order.parts (field 260) - linkToEntry Zákazky Diely
        ]
    }
};

// ==============================================
// MAPOVANIE POLÍ: Cenové ponuky Diely → Zákazky Diely
// ==============================================

const PARTS_MAPPING = {
    // ===== ZÁKLADNÉ POLIA =====
    basic: {
        number: {
            source: "Číslo",                    // quotePart.number
            target: "Číslo",                    // orderPart.number
            type: "int",
            sync: "create_only"
        },
        date: {
            source: "Dátum",                    // quotePart.date
            target: "Dátum",                    // orderPart.date
            type: "date",
            sync: "create_only"
        },
        quoteNumber: {
            source: "Číslo CP",                 // quotePart.quoteNumber
            target: "Číslo CP",                 // orderPart.quoteNumber
            type: "text",
            sync: "create_only",
            note: "Uložiť číslo cenovej ponuky pre referenciu"
        },
        name: {
            source: "Názov",                    // quotePart.name
            target: "Názov",                    // orderPart.name
            type: "text",
            sync: "create_only"
        },
        partType: {
            source: "Diel cenovej ponuky",      // quotePart.partType
            target: "Diel cenovej ponuky",      // orderPart.partType
            type: "choice",
            sync: "create_only"
        },
        note: {
            source: "Poznámka",                 // quotePart.note
            target: "Poznámka",                 // orderPart.note
            type: "text",
            sync: "create_only"
        }
    },

    // ===== CENOVÉ POLIA =====
    // POZOR: Tieto sa NESYNCUJÚ - v zákazke sa upravujú ručne
    financial: {
        materialSum: {
            source: "Suma materiál",            // quotePart.materialSum
            target: "Suma materiál",            // orderPart.materialSum
            type: "currency",
            sync: "create_only"
        },
        workSum: {
            source: "Suma práce",               // quotePart.workSum
            target: "Suma práce",               // orderPart.workSum
            type: "currency",
            sync: "create_only"
        },
        totalSum: {
            source: "Celkom",                   // quotePart.totalSum
            target: "Celkom",                   // orderPart.totalSum
            type: "currency",
            sync: "create_only"
        }
    },

    // ===== POLOŽKY =====
    // POZOR: Tieto sa NESYNCUJÚ - v zákazke sa upravujú ručne
    items: {
        materials: {
            source: "Materiál",                 // quotePart.materials
            target: "Materiál",                 // orderPart.materials
            type: "entries (linkToEntry)",
            sync: "create_only"
        },
        works: {
            source: "Práce",                    // quotePart.works
            target: "Práce",                    // orderPart.works
            type: "entries (linkToEntry)",
            sync: "create_only"
        }
    },

    ignored: {
        // Cenová ponuka diely má, Zákazka diely nemá:
        quotePartOnly: [
            "Hmotnosť materiálu"                // quotePart.materialWeight
        ]
    }
};

// ==============================================
// SPÔSOB SYNCHRONIZÁCIE
// ==============================================

const SYNC_STRATEGY = {
    create: {
        description: "Vytvorenie novej zákazky z cenovej ponuky",
        steps: [
            "1. Skontroluj či zákazka už neexistuje (linksFrom check)",
            "2. Vytvor nový záznam v knižnici Zákazky",
            "3. Sync všetky polia z FIELD_MAPPING (basic, transport, massTransfer, subcontracts, vat)",
            "4. Vytvor linkToEntry: Zákazka → Cenová ponuka",
            "5. Pre každý diel z Cenové ponuky Diely:",
            "   a. Vytvor nový záznam v Zákazky Diely",
            "   b. Sync všetky polia z PARTS_MAPPING",
            "   c. Vytvor linkToEntry: Zákazka Diel → Zákazka",
            "6. Zobraz hlášku: Zákazka vytvorená + počet dielov"
        ]
    },

    update: {
        description: "Aktualizácia existujúcej zákazky z cenovej ponuky",
        steps: [
            "1. Nájdi existujúcu zákazku cez linksFrom",
            "2. Sync VŠETKY polia z FIELD_MAPPING (okrem connections.quoteLink)",
            "3. ⚠️ DIELY SA NESYNCUJÚ - upravujú sa ručne v zákazke",
            "4. Zobraz hlášku: Zákazka aktualizovaná"
        ]
    }
};

// ==============================================
// EXPORT PRE POUŽITIE V SCRIPTE
// ==============================================

// Použitie v CP.Action.CreateOrder.js:
// var mapping = FIELD_MAPPING;
// var partsMapping = PARTS_MAPPING;
