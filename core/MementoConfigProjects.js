// ==============================================
// MEMENTO CONFIG PROJECTS - Optimalizovaná konfigurácia
// Verzia: 1.2.2 | Dátum: 2025-10-14 | Autor: ASISTANTO
// ==============================================
// 🔧 CHANGELOG v1.2.2 (2025-10-14):
//    - 🐛 CRITICAL FIX: Opravené field ID pre order.partsHzs
//      → Bolo: field 260 (rovnaké ako parts - chyba!)
//      → Správne: field 330 (overené cez Memento API)
//      → Toto spôsobovalo chybu pri linkovaní dielov v CP.Action.CreateOrder.Module.js
// 🔧 CHANGELOG v1.2.1 (2025-10-14):
//    - 🐛 FIX: Opravené preklepy v orderPartWorks atribútoch
//      → qoteQuantity → quoteQuantity
//      → qutePrice → quotePrice
// 🔧 CHANGELOG v1.2.0 (2025-10-14):
//    - 🗑️ CLEANUP: Odstránené polia infoTelegram z common, telegramGroup z order
//    - 🆕 NOVÉ POLIA: order.spentSubcontracts, order.remainingSubcontracts
//      → Umožňuje sledovať spotrebu a zostatok subdodávok oddelene
//    - 📝 IMPROVEMENT: Doplnené komentáre pre budget polia s vysvetlením výpočtu
//
// 🔧 CHANGELOG v1.1.0 (2025-10-14):
//    - 🆕 NOVÉ POLE: orderPart.subcontract = "Subdodávka" (checkbox)
//      → Umožňuje označiť diel ako subdodávku namiesto použitia partType
//      → Používa sa v Order.Calculate.Module.js v2.2.0+
// ==============================================
// 📋 ÚČEL:
//    - Optimalizovaný CONFIG pre calculation scripts
//    - Obsahuje len konfigurácie pre:
//      * Cenové ponuky a Zákazky (Quotes & Orders)
//      * Cenník prác a Materiál (PriceList & Inventory)
//      * Historické ceny (workPrices, materialPrices, vatRates)
//      * Základné firemné knižnice (Clients, Places, Suppliers)
//    - Eliminuje attendance, workRecords, reports, telegram details
//    - Znížená pamäťová záťaž pre calculation scripts
// ==============================================
//
// 🔧 POUŽITIE V CALCULATION MODULOCH:
// Základné použitie:
//    var config = MementoConfig.getConfig();  // Celý CONFIG objekt
//
// DÔLEŽITÉ: Tento súbor je optimalizovaná verzia MementoConfig.js
// Pre plnú konfiguráciu použite MementoConfig.js


var MementoConfig = (function() {
    'use strict';
    
    // Interná konfigurácia
    var CONFIG = {
        version: "1.2.2",  // MementoConfigProjects - optimalizovaná verzia pre calculation scripts


        // Defaultné hodnoty pre globálne nastavenia
        defaults: {
            debug: false, // Predvolený debug mód
            workHoursPerDay: 8, // Predvolená pracovná doba za deň
            roundToQuarterHour: true // Zaokrúhľovanie na 15 minút
        },
        // === GLOBÁLNE NASTAVENIA ===
        global: {
            debug: true,
            defaultTimeout: 30000,
            dateFormat: "DD.MM.YYYY",
            timeFormat: "HH:mm",
            timezone: "Europe/Bratislava",
            currency: "EUR",
            currencySymbol: "€",
            language: "sk_SK"
        },
        
        // === NÁZVY A ID KNIŽNÍC ===
        // OPTIMALIZOVANÉ PRE CALCULATION SCRIPTS - Ponuky a Zákazky
        libraries: {
            // Cenníky a sklad
            priceList: "Cenník prác",
            inventory: "Materiál",

            // Historical data - potrebné pre calculation
            workPrices: "ceny prác",
            materialPrices: "ceny materiálu",
            vatRatesLib: "sadzby dph",

            // Systémové knižnice
            defaults: "ASISTANTO Defaults",

            // Firemné knižnice - potrebné pre calculation
            suppliers: "Dodávatelia",
            partners: "Partneri",
            clients: "Klienti",
            places: "Miesta",
            addresses: "Adresy",

            // Obchodné dokumenty
            quotes: "Cenové ponuky",
            quoteParts: "Cenové ponuky Diely",
            orders: "Zákazky",
            orderParts: "Zákazky Diely"
        },

        // === ID KNIŽNÍC (pre API prístup) ===
        libraryIds: {
            // Obchodné dokumenty - Cenové ponuky
            quotes: "90RmdjWuk", // Cenové ponuky
            quoteParts: "nCAgQkfvK", // Cenové ponuky Diely

            // Obchodné dokumenty - Zákazky
            orders: "CfRHN7QTG", // Zákazky
            orderParts: "iEUC79O2T", // Zákazky Diely

            // Systémové knižnice
            defaults: "KTZ6dsnY9" // ASISTANTO Defaults
        },

        // === NÁZVY POLÍ ===
        fields: {
            // Spoločné polia vo všetkých knižniciach
            // DÔLEŽITÉ: view pole má možnosti "Tlač", "Editácia " (s medzerou!), "Debug"
            common: {
                id: "ID", // int - automaticky generované ID záznamu
                view: "view", // radio - režim zobrazenia: "Tlač" (1), "Editácia" (4), "Debug" (5)
                debugLog: "Debug_Log", // text - debug výstupy z trigger scriptov
                errorLog: "Error_Log", // text - chybové správy
                info: "info", // richtext - informačné pole
                createdBy: "zapísal", // user - užívateľ ktorý vytvoril záznam
                modifiedBy: "upravil", // user - užívateľ ktorý naposledy upravil záznam
                createdDate: "dátum zápisu", // date - dátum vytvorenia záznamu
                modifiedDate: "dátum úpravy", // date - dátum poslednej úpravy
                rowColor: "farba záznamu", // color - farba riadku v zozname
                backgroundColor: "farba pozadia", // color - farba pozadia karty
                notifications: "Notifikácie", // linkToEntry - prepojené notifikácie
                recordIcons: "ikony záznamu" // text - textové ikony pre záznam
            },
            // ASISTANTO Defaults polia (ID: KTZ6dsnY9)
            // OPTIMALIZOVANÉ - iba polia potrebné pre calculation scripts
            defaults: {
                // Základné firemné údaje
                accountingYear: "Účtovný rok", // int (id: 24)
                date: "Dátum", // date (id: 2)
                companyName: "Názov firmy", // text (id: 17)
                street: "Ulica", // text (id: 18)
                postalCode: "PSČ", // text (id: 19)
                city: "Mesto", // text (id: 20)
                ico: "IČO", // text (id: 21)
                dic: "DIČ", // text (id: 23)
                icDph: "IČ DPH", // text (id: 22)

                // Cenové ponuky - NUMBER PLACEHOLDERS a DEFAULT VALUES
                cpPlaceholder: "CP Placeholder", // text (id: 7) - Cenové ponuky
                cpDefaultRidePercentage: "CP Default % dopravy", // double - default % dopravy
                cpDefaultKmPrice: "CP Default cena za km", // entries - linkToEntry Cenník prác
                cpDefaultRideFlatRate: "CP Default paušál dopravy", // entries - linkToEntry Cenník prác
                cpDefaultMassTransferPercentage: "CP Default % presunu hmôt", // double - default % presunu hmôt
                cpDefaultMassTransferPrice: "CP Default cena presunu hmôt", // entries - linkToEntry Cenník prác

                // Zákazky - NUMBER PLACEHOLDERS
                zPlaceholder: "Z Placeholder", // text (id: 8) - Zákazky

                // Vyúčtovania - NUMBER PLACEHOLDERS
                vPlaceholder: "V Placeholder" // text (id: 9) - Vyúčtovania
            },

            // === CENNÍKY A SKLAD ===
            // Cenník prác polia
            priceList: {
                number: "Číslo", // text
                name: "Názov", // text
                description: "Popis", // text
                unit: "mj", // singleChoice
                price: "Cena", // realNumber
                priceWithVat: "Cena s DPH", // realNumber
                category: "Kategória", // singleChoice/tree
                tags: "Štítky", // tags
                note: "Poznámka" // text
            },
            // Materiál polia
            items: {
                number: "Číslo", // text
                plu: "PLU", // text
                name: "Názov", // text
                name2: "Názov2", // text
                specification: "Špecifikácia", // text
                group: "Skupina", // typ strom
                category: "Kategória", // typ strom
                status: "Stav", // singleChoice
                unit: "mj", // singleChoice
                price: "Cena", // realNumber
                priceWithVat: "Cena s DPH", // realNumber
                price2Unit: "Cena 2MJ", // realNumber
                price2UnitWithVat: "Cena 2MJ s DPH", // realNumber
                tags: "Štítky", // tags
                warehouse: "Sklad", // linkToEntry Sklady
                purchasePrice: "Nákupná cena", // realNumber
                purchasePriceWithVat: "Nákupná cena s DPH", // realNumber
                vatRate: "sadzba DPH", // singleChoice: Základná, Znížená, Nulová
                vatRateValue: "DPH", // realNumber
                vatRatePercentage: "Sadzba", // realNumber
                priceCalculation: "Prepočet ceny", // singleChoice: Pevná cena, Podľa prirážky, Neprepočítavať
                markupPercentage: "Obchodná prirážka", // realNumber
                priceRounding: "Zaokrúhľovanie cien", // singleChoice: Nahor, Nadol, Nezaokrúhľovať, Najbližšie
                roundingValue: "Hodnota zaokrúhenia", // singleChoice: Desatiny, Jednotky, Desiatky, Stovky
                purchasePriceChange: "Zmena nákupnej ceny", // singleChoice: Upozorniť, Prepočítať, Upozorniť a prepočítať, Ignorovať
                changePercentage: "Percento zmeny", // realNumber
                calculatedMargin: "Vypočítaná marža", // realNumber
                description: "Popis", // text
                manufacturer: "Výrobca", // text
                weight: "Hmotnosť", // realNumber
                note: "Poznámka", // text
                manual: "Manual", // link to file
                secondUnit: "Druhá MJ", // checkBox
                secondUnitType: "2 MJ", // singleChoice: ks, m2, t ...
                unitRatio: "MJ/2MJ", // realNumber - pomer prvej MJ k 2MJ
                icons: "icons", // text (emoji)
            },
            // ceny materiálu polia
            materialPrices: {
                material: "Materiál", // linkToEntry Materiál
                date: "Platnosť od", // date
                purchasePrice: "nc", // real number Nákupná cena
                sellPrice: "pc" // real number Predajná cena

            },
            // ceny prác polia
            workPrices: {
                work: "Práca",  // Pole ktoré odkazuje späť na HZS
                validFrom: "Platnosť od",
                price: "Cena"
            },
            // sadzby DPH
            vatRates: {
                validFrom: "Platnosť od",
                standard: "základná",
                reduced: "znížená"
            },
            // Klienti polia - získané z API (Klienti: rh7YHaVRM)
            client: {
                type: "Firma/Osoba", // singleChoice: Osoba, Firma
                active: "Aktívny", // checkbox
                firstName: "Meno", // text
                lastName: "Priezvisko", // text
                title: "Titul", // text
                company: "Firma", // text
                nick: "Nick", // text, role: name
                identifier: "Identifikátor", // text
                contact: "Kontakt", // contact
                street: "Ulica", // text
                postalCode: "PSČ", // text
                city: "Mesto", // text
                email: "Email", // email
                mobile: "Mobil", // text
                note: "Poznámka", // text
                ico: "IČO", // text
                vatPayer: "Platca DPH", // checkbox
                icDph: "IČ DPH", // text
                // Deprecated/backward compatibility
                name: "Meno" // DEPRECATED - use firstName
            },
            // Dodávatelia polia - získané z API (Dodávatelia: 3FSQN0reH)
            supplier: {
                name: "Názov", // text
                nick: "Názov", // alias for name
                description: "Popis", // text
                info: "info", // text
                street: "Ulica", // text
                postalCode: "PSČ", // text
                city: "Mesto", // text
                www: "www", // url
                email: "Email", // text
                debugLog: "Debug_Log", // text
                errorLog: "Error_Log" // text
            },
            // Partneri polia - získané z API (Partneri: NffZSLRKU)
            partner: {
                type: "Firma/Osoba", // singleChoice: Osoba, Firma
                active: "Aktívny", // checkbox
                nick: "Nick", // text
                name: "Názov", // text
                firstName: "Meno", // text
                lastName: "Priezvisko", // text
                contact: "Kontakt", // contact
                // Linky na iné knižnice
                partnerLink: "Partner", // linkToEntry Partneri
                supplierLink: "Dodávateľ", // linkToEntry Dodávatelia
                clientLink: "Klient" // linkToEntry Klienti
            },
            // Miesto
            place: {
                category: "Kategória", // singleChoice: Klient, Dodávateľ, Partner, Zamestnanec, Iné
                active: "Aktívny", // checkbox
                name: "Názov", // text - formát: Nick (Lokalita)
                nick: "Nick", // text - vygenerované z linku podľa kategórie
                locality: "Lokalita", // text
                customer: "Klient", // linkToEntry Klienti
                supplier: "Dodávateľ", // linkToEntry Dodávatelia
                partner: "Partner", // linkToEntry Partneri
                employee: "Zamestnanec", // linkToEntry Zamestnanci
                distance: "Vzdialenosť", // real number - km od východzej adresy
                address: "Adresa", // text
                gps: "GPS", // JSGeolocation
                view: "view", // singleChoice: Editácia, Debug
                debugLog: "Debug_Log", // text/memo
                errorLog: "Error_Log", // text/memo
                isOrder: "Zákazka" // checkbox
            },

            // === OBCHODNÉ DOKUMENTY ===
            // Cenové ponuky polia (Library ID: 90RmdjWuk)
            quote: {
                // Základné identifikačné polia
                number: "Číslo", // text (field 186) - role: name
                name: "Názov", // text (field 250) - role: name
                description: "Popis cenovej ponuky", // text (field 187) - role: desc
                date: "Dátum", // date (field 2)
                validUntil: "Platnosť do", // date (field 98)

                // Stav a klasifikácia
                state: "Stav cenovej ponuky", // choice (field 130) - Návrh, Odoslaná, Schválená, Zamietnutá, Stornovaná
                type: "Typ cenovej ponuky", // radio (field 170) - Hodinovka, Položky, Externá

                // Prepojenia
                place: "Miesto realizácie", // entries (field 79) - linkToEntry Miesta

                // Nastavenia výpočtov
                priceCalculation: "Počítanie hodinových sadzieb", // choice (field 123)
                discountCalculation: "Počítať zľavy na sadzby", // boolean (field 248)
                discountDescription: "budú počítame percentuálne zľavy podľa počtu hodín", // text (field 249)

                // Doprava - účtovanie a sadzby
                rideCalculation: "Účtovanie dopravy", // choice (field 126) - Paušál, Km, % zo zákazky, Pevná cena, Neúčtovať
                ridePercentage: "Doprava %", // double (field 265)
                expectedRidesCount: "Predpokladaný počet jázd", // int - počet predpokladaných jázd
                expectedKm: "Predpokladaný počet km", // real number - VÝSTUP: vzdialenosť × 2 × počet jázd
                kmPrice: "Doprava cena za km", // entries (field 266) - linkToEntry Cenník prác
                rideFlatRate: "Doprava paušál", // entries (field 267) - linkToEntry Cenník prác
                transportPrice: "Cena dopravy", // currency (field 268) - VÝSTUP vypočítanej ceny dopravy
                fixedTransportPrice: "Doprava pevná cena", // currency - VSTUP pre pevnú cenu dopravy

                // Účtovanie ďalších položiek
                materialWeight: "Hmotnosť materiálu", // double - celková hmotnosť materiálov v tonách (t)
                massTransferCalculation: "Účtovanie presunu hmôt", // choice - Neúčtovať, Paušál, Podľa hmotnosti materiálu, % zo zákazky, Pevná cena
                massTransferPercentage: "Presun hmôt %", // double
                massTransferPrice: "Cena presunu hmôt", // currency - VÝSTUP vypočítanej ceny presunu hmôt
                massTransferPriceEntry: "Cena presunu hmôt materiálu", // entries - linkToEntry Cenník prác - VSTUP pre metódu "Podľa hmotnosti"
                massTransferFlatRate: "Paušál presunu hmôt", // entries - linkToEntry Cenník prác
                fixedMassTransferPrice: "Pevná cena presunu hmôt", // currency - VSTUP pre pevnú cenu presunu hmôt
                subcontractsCalculation: "Účtovanie subdodávok", // choice - Neúčtovať, % zo zákazky, Pevná cena
                subcontractsPercentage: "Subdodávky %", // double
                subcontractsPrice: "Cena subdodávok", // currency

                // Položky cenovej ponuky
                parts: "Diely", // entries (field 263) - linkToEntry Cenové ponuky Diely (pre typ "Položky")
                partsHzs: "Diely HZS", // entries - linkToEntry Cenové ponuky Diely (pre typ "Hodinovka")
                subcontracts: "Subdodávky", // entries - linkToEntry Cenové ponuky Diely (diely s partType = "Subdodávky")
                subcontractsTotal: "Celkom subdodávky", // currency - súčet subdodávok v samostatnom poli

                // Externá ponuka
                externalPrice: "Cena externej ponuky", // double (field 253)
                externalPriceWithVat: "Cena externej ponuky s DPH", // double (field 254) - role: status

                // Finančné súčty
                total: "Celkom", // double (field 257) - role: status
                vat: "DPH", // double (field 258)
                vatRate: "Sadzba DPH", // double (field 264)
                totalWithVat: "Cena celkom", // double (field 256) - role: status

                // Poznámky a prílohy
                note: "Poznámka", // text (field 207)
                quoteText: "Text cenovej ponuky", // richtext (field 208)
                files: "Súbory", // file (field 199)

                // Systémové polia - použiť fields.common pre prístup
                // view, id, createdBy, createdDate, modifiedBy, modifiedDate,
                // rowColor, backgroundColor, debugLog, errorLog

                // Deprecated/backward compatibility
                customer: "Klient", // DEPRECATED - nie je v API štruktúre
                workHZS: "Hodinová zúčtovacia sadzba", // DEPRECATED - nie je v API štruktúre
                fixRidePrice: "Pevná cena dopravy", // DEPRECATED - použiť transportPrice
                rateRidePrice: "Doprava %", // DEPRECATED - použiť ridePercentage
                kmRidePrice: "Cena za km", // DEPRECATED - použiť kmPrice
                flatRateRidePrice: "Paušál dopravy" // DEPRECATED - použiť rideFlatRate
            },
            // Cenové ponuky Diely polia (Library ID: nCAgQkfvK)
            quotePart: {
                // Základné identifikačné polia
                number: "Číslo", // int (field 283) - role: name
                quoteNumber: "Číslo CP", // text (field 281) - role: desc - číslo nadradenej cenovej ponuky
                name: "Názov", // text (field 250) - role: desc
                date: "Dátum", // date (field 269)

                // Klasifikácia dielu
                partType: "Diel cenovej ponuky", // choice (field 257) - role: name, typ dielu ponuky

                // Cenové polia - súčty za kategórie
                materialSum: "Suma materiál", // currency (field 271)
                workSum: "Suma práce", // currency (field 272)
                totalSum: "Celkom", // currency (field 275) - role: status

                // Hmotnosť materiálu
                materialWeight: "Hmotnosť materiálu", // double - celková hmotnosť materiálov v tonách (t)

                // Položky po kategóriách - linkToEntry polia
                materials: "Materiál", // entries (field 264) - linkToEntry Materiál
                works: "Práce", // entries (field 265) - linkToEntry Práce

                // Poznámky a debug
                note: "Poznámka" // text (field 207)
                // info, debugLog, errorLog - použiť fields.common

                // Systémové polia - použiť fields.common pre prístup
                // view, id, createdBy, createdDate, modifiedBy, modifiedDate,
                // rowColor, backgroundColor
            },
            // Zákazky polia
            order: {
                state: "Stav", // singleChoice: Čakajúca, Čakjaúca (klient), Prebieha, Ukončená
                paymentState: "Stav platby", // singleChoice: Nevyúčtovaná, Čiastočne vyúčtovaná, Vyúčtovaná, Zaplatená, Stornovaná
                orderCalculationType: "Typ zákazky", // options: Hodinovka, Položky, Externá, Reklamácia
                orderWorkType: "Typ práce (výber)", // singleChoice: Realizácia, Údržba, Servis AZS, Iné
                number: "Číslo", // text unique
                name: "Názov", // text
                description: "Popis zákazky", // text
                place: "Miesto", // linkToEntry Miesta
                client: "Klient", // linkToEntry Klienti (field 256)
                quote: "Cenová ponuka", // linkToEntry Cenové ponuky
                date: "Dátum",
                startDate: "Dátum začatia",
                endDate: "Dátum ukončenia",
                budget: "Rozpočet", // real number - rozpočet z CP dielov (Diely + Diely HZS)
                budgetSubcontracts: "Rozpočet subdodávky", // real number - rozpočet subdodávok z CP (Subdodávky)
                spent: "Spotrebované", // real number - spotrebované z dielov (Diely + Diely HZS)
                spentSubcontracts: "Spotrebované subdodávky", // real number - spotrebované zo subdodávok (Subdodávky)
                remaining: "Zostatok", // real number - zostatok (Rozpočet - Spotrebované)
                remainingSubcontracts: "Zostatok subdodávky", // real number - zostatok subdodávok (Rozpočet subdodávky - Spotrebované subdodávky)
                daysCount: "Počet dní", // integer, endDate - startDate
                hoursCount: "Odpracovaných hodín", // real number, súčet odpracovaných hodín z dennej dochádzky
                wageCosts: "Mzdy", // real number, súčet mzdových nákladov z dennej dochádzky
                wageDeductions: "Mzdy odvody", // real number, odvody do poisťovní a dane za zamestnanca aj zamestnávateľa
                km: "Najazdené km", // real number, súčet km z knihy jázd
                transportCounts: "Počet jázd", // integer, počet záznamov z knihy jázd
                transportWageCosts: "Mzdy v aute", // real number, súčet nákladov na dopravu z knihy jázd
                transportHours: "Hodiny v aute", // real number, súčet hodín z knihy jázd
                // VÝNOSY - Fakturácia zákazníkovi
                revenueWork: "Práce", // real number, fakturované práce bez DPH
                revenueWorkVat: "DPH práce", // real number, DPH z prác
                revenueMaterial: "Materiál", // real number, fakturovaný materiál bez DPH
                revenueMaterialVat: "DPH materiál", // real number, DPH z materiálu
                revenueMachinery: "Stroje", // real number, fakturované stroje bez DPH
                revenueMachineryVat: "DPH stroje", // real number, DPH zo strojov
                revenueTransport: "Doprava", // real number, fakturovaná doprava bez DPH
                revenueTransportVat: "DPH doprava", // real number, DPH z dopravy
                revenueSubcontractors: "Subdodávky", // real number, fakturované subdodávky bez DPH
                revenueSubcontractorsVat: "DPH subdodávky", // real number, DPH zo subdodávok
                revenueOther: "Ostatné", // real number, ostatné fakturované položky bez DPH
                revenueOtherVat: "DPH ostatné", // real number, DPH z ostatných položiek
                revenueTotal: "Suma celkom", // real number, celková fakturovaná suma bez DPH
                revenueTotalVat: "DPH celkom", // real number, celkové DPH

                // NÁKLADY - Naše náklady a odvody
                costWork: "Náklady práce", // real number, naše náklady na práce
                costWorkVatDeduction: "Odpočet DPH práce", // real number, odpočet DPH z nákladov na práce
                costMaterial: "Náklady materiál", // real number, naše náklady na materiál
                costMaterialVatDeduction: "Odpočet DPH materiál", // real number, odpočet DPH z materiálu
                costMachinery: "Náklady stroje", // real number, naše náklady na stroje
                costMachineryVatDeduction: "Odpočet DPH stroje", // real number, odpočet DPH zo strojov
                costTransport: "Náklady doprava", // real number, naše náklady na dopravu
                costTransportVatDeduction: "Odpočet DPH doprava", // real number, odpočet DPH z dopravy
                costSubcontractors: "Náklady subdodávky", // real number, naše náklady na subdodávky
                costSubcontractorsVatDeduction: "Odpočet DPH subdodávky", // real number, odpočet DPH zo subdodávok
                costOther: "Náklady ostatné", // real number, ostatné náklady
                costOtherVatDeduction: "Odpočet DPH ostatné", // real number, odpočet DPH z ostatných nákladov
                costTotal: "Náklady celkom", // real number, celkové náklady
                otherExpenses: "Iné výdavky", // real number, dodatočné výdavky

                // CELKOVÉ ODPOČTY DPH
                costTotalVatDeduction: "Odpočet DPH celkom", // real number, celkový odpočet DPH z nákladov

                // PRIRÁŽKY - Percentuálne prirážky na náklady
                subcontractorMarkup: "Prirážka subdodávky", // real number, percentuálna prirážka na subdodávky
                otherMarkup: "Prirážka ostatné", // real number, percentuálna prirážka na ostatné náklady

                // ÚČTOVANIE DOPRAVY (fields 145, 296-301, 321)
                rideCalculation: "Účtovanie dopravy", // choice (field 296) - Neúčtovať, Paušál, Km, % zo zákazky, Pevná cena
                transportPercentage: "Doprava %", // double (field 298) - percentuálna prirážka dopravy
                expectedRidesCount: "Počet jázd", // int (field 145) - počet jázd (WARNING: v API môže byť už najazdené, nie predpokladané!)
                kmPrice: "Doprava cena za km", // entries (field 300) - linkToEntry Cenník prác
                rideFlatRate: "Doprava paušál", // entries (field 299) - linkToEntry Cenník prác
                transportPrice: "Cena dopravy", // currency (field 321) - VÝSTUP vypočítanej ceny dopravy
                fixedTransportPrice: "Doprava pevná cena", // currency (field 301) - VSTUP pevná cena dopravy

                // ÚČTOVANIE PRESUNU HMÔT (fields 297, 302-307, 306, 320)
                massTransferCalculation: "Účtovanie presunu hmôt", // choice (field 297) - Neúčtovať, Paušál, Podľa hmotnosti materiálu, % zo zákazky, Pevná cena
                massTransferPercentage: "Presun hmôt %", // double (field 304) - percentuálna prirážka presunu hmôt
                massTransferPrice: "Cena presunu hmôt", // currency (field 320) - VÝSTUP vypočítanej ceny presunu hmôt
                massTransferPriceEntry: "Cena presunu hmôt", // entries (field 302) - linkToEntry Cenník prác - VSTUP pre metódu "Podľa hmotnosti"
                massTransferFlatRate: "Paušál presunu hmôt", // entries (field 307) - linkToEntry Cenník prác
                fixedMassTransferPrice: "Presun hmôt pevná cena", // currency (field 303) - VSTUP pevná cena presunu hmôt
                materialWeight: "Hmotnosť materiálu", // double (field 306) - celková hmotnosť materiálov v tonách

                // ÚČTOVANIE SUBDODÁVOK (fields 305, 318, 325)
                subcontractsCalculation: "Metóda subdodávok", // choice (field 305) - Neúčtovať, Zarátať do ceny, Vytvoriť dodatok
                subcontracts: "Subdodávky", // entries (field 318) - linkToEntry Zákazky Diely (samostatné pole pre subdodávky)
                subcontractsTotal: "Celkom Subdodávky", // currency (field 325) - celková suma subdodávok

                // DIELY ZÁKAZKY
                parts: "Diely", // entries (field 260) - linkToEntry Zákazky Diely
                partsHzs: "Diely HZS", // entries (field 330) - linkToEntry Zákazky Diely

                // CELKOVÉ SUMY (fields 331, 332)
                total: "Celkom", // currency (field 331) - celková suma bez DPH
                totalWithVat: "Celkom s DPH", // currency (field 332) - celková suma s DPH

                // DPH
                vat: "DPH", // currency (field 324)
                vatRate: "Sadzba DPH" // double (field 317)
            },
            // Zákazky Diely polia (Library ID: iEUC79O2T)
            orderPart: {
                // Základné identifikačné polia
                number: "Číslo", // int (field 283) - role: name
                date: "Dátum", // date (field 269)
                orderNumber: "Číslo zákazky", // text (field 281) - role: desc, číslo zákazky
                name: "Názov", // text (field 250) - role: desc

                // Klasifikácia dielu
                partType: "Diel zákazky", // choice (field 257) - role: name, druh dielu zákazky
                subcontract: "Subdodávka", // checkbox - NOVÉ! označuje či je diel subdodávkou

                // Cenové polia - súčty za kategórie (skutočné hodnoty)
                materialSum: "Suma materiál", // currency (field 271), suma za materiály
                workSum: "Suma práce", // currency (field 272), suma za práce
                totalSum: "Celkom", // currency (field 275) - role: status, celková suma dielu

                // Cenové polia - súčty z cenovej ponuky (CP)
                materialSumCp: "Suma materiál CP", // currency, suma za materiály z cenovej ponuky
                workSumCp: "Suma práce CP", // currency, suma za práce z cenovej ponuky
                totalSumCp: "Celkom CP", // currency, celková suma dielu z cenovej ponuky

                // Hmotnosť
                materialWeight: "Hmotnosť materiálu", // double, celková hmotnosť materiálov v tonách (skutočná)
                materialWeightCp: "Hmotnosť materiálu CP", // double, celková hmotnosť materiálov z cenovej ponuky

                // Položky po kategóriách - linkToEntry polia
                materials: "Materiál", // entries (field 264), linkToEntry do materiálov
                works: "Práce", // entries (field 265), linkToEntry do prác

                // Poznámky
                note: "Poznámka" // text (field 207), poznámky k dielu
                // info (field 284), debugLog (field 277), errorLog (field 278) - použiť fields.common
            },

        },        
        // === ATRIBÚTY ===
        // OPTIMALIZOVANÉ - iba atribúty pre calculation scripts
        attributes: {
            quotePartMaterials: {
                quantity: "množstvo", // real number - množstvo materiálu
                price: "cena", // currency - cena za jednotku
                totalPrice: "cena celkom" // currency - celková cena (množstvo × cena)
            },
            quotePartWorks: {
                quantity: "množstvo", // real number - množstvo hodín/jednotiek
                price: "cena", // currency - cena za jednotku
                totalPrice: "cena celkom" // currency - celková cena (množstvo × cena)
            },
            // Zákazky Diely - atribúty položiek (2025-10-12)
            orderPartMaterials: {
                quoteQuantity: "množstvo cp", // real number - množstvo materiálu z cenovej ponuky
                quotePrice: "cena cp", // currency - cena z cenovej ponuky (source: "cena" z quote)
                quoteTotalPrice: "cena celkom cp", // currency - celková cena z cenovej ponuky
                quantity: "množstvo", // real number - množstvo materiálu dodané
                price: "cena", // currency - cena dodaného materiálu
                totalPrice: "cena celkom" // currency - celková cena dodaného materiálu
            },
            orderPartWorks: {
                quoteQuantity: "množstvo cp", // real number - množstvo hodín/jednotiek z cenovej ponuky
                quotePrice: "cena cp", // currency - cena z cenovej ponuky (source: "cena" z quote)
                quoteTotalPrice: "cena celkom cp", // currency - celková cena z cenovej ponuky
                quantity: "množstvo", // real number - množstvo hodín/jednotiek dodané
                price: "cena", // currency - cena dodané (source: "cena" z quote)
                totalPrice: "cena celkom" // currency - celková cena dodané
            },
            // Zákazky Diely - CP (Cenová Ponuka) atribúty položiek
            orderPartMaterialsCp: {
                quantity: "množstvo cp", // real number - množstvo materiálu z cenovej ponuky
                price: "cena cp", // currency - cena z cenovej ponuky
                totalPrice: "cena celkom cp" // currency - celková cena z cenovej ponuky
            },
            orderPartWorksCp: {
                quantity: "množstvo cp", // real number - množstvo hodín/jednotiek z cenovej ponuky
                price: "cena cp", // currency - cena z cenovej ponuky
                totalPrice: "cena celkom cp" // currency - celková cena z cenovej ponuky
            }
        },

        // === KONŠTANTY ===
        constants: {
            // Režimy zobrazenia view poľa
            // DÔLEŽITÉ: "Editácia " má medzeru na konci!
            VIEW_MODES: {
                PRINT: "Tlač",          // Tlačový režim (id: 1)
                EDIT: "Editácia ",      // Editačný režim (id: 4) - POZOR: má medzeru na konci!
                DEBUG: "Debug"          // Debug režim (id: 5)
            },

            // Stavové hodnoty
            status: {
                active: "Aktívny",
                inactive: "Neaktívny",
                pending: "Čaká",
                completed: "Dokončené",
                error: "Chyba",
                sent: "Odoslané",
                failed: "Zlyhalo"
            },

            // View typy
            viewTypes: {
                print: "Tlač",
                edit: "Editácia",
                debug: "Debug"
            }
        },
        
        // === EMOJI A IKONY ===
        // OPTIMALIZOVANÉ - iba essential ikony pre calculation scripts
        icons: {
            // Základné statusy
            success: "✅",            // Úspech
            error: "❌",              // Chyba
            warning: "⚠️",            // Varovanie
            info: "ℹ️",               // Informácia
            debug: "🐛",              // Debug

            // Obchodné entity
            order: "📦",              // Zákazka
            money: "💰",              // Peniaze/finančné sumy
            document: "📄",           // Dokument

            // Akcie
            start: "🚀",              // Spustenie procesu
            update: "🔄",            // Aktualizácia
            checkmark: "☑️",          // Označené

            // Projekty
            work: "🔨",               // Práca
            material: "🧰",           // Materiál
            completed: "🏁",          // Dokončené
            pending: "⏳",            // Čakajúce
            inProgress: "⚙️"         // Prebieha
        }
    }

    // === POMOCNÉ FUNKCIE ===
    
    /**
     * Získa hodnotu z vnorenej štruktúry pomocou cesty
     * @param {string} path - Cesta k hodnote (napr. "fields.attendance.date")
     * @param {*} defaultValue - Predvolená hodnota ak cesta neexistuje
     * @returns {*} Hodnota alebo defaultValue
     */
    function getByPath(path, defaultValue) {
        try {
            var parts = path.split('.');
            var value = CONFIG;
            
            for (var i = 0; i < parts.length; i++) {
                value = value[parts[i]];
                if (value === undefined) {
                    return defaultValue !== undefined ? defaultValue : null;
                }
            }
            
            return value;
        } catch (e) {
            return defaultValue !== undefined ? defaultValue : null;
        }
    }
    
    /**
     * Získa celú sekciu konfigurácie
     * @param {string} section - Názov sekcie (napr. "fields", "libraries")
     * @returns {Object} Sekcia alebo prázdny objekt
     */
    function getSection(section) {
        return CONFIG[section] || {};
    }
    
    // === PUBLIC API ===
    return {
        version: CONFIG.version,
        
        // Priamy prístup k celému CONFIGu
        getConfig: function() {
            return CONFIG;
        },
        
        // Prístup cez cestu
        get: function(path, defaultValue) {
            return getByPath(path, defaultValue);
        },
        
        // Získanie celej sekcie
        getSection: function(section) {
            return getSection(section);
        },
        
        // Špecifické gettery pre najčastejšie použitie
        getLibrary: function(name) {
            return CONFIG.libraries[name] || null;
        },
        
        getField: function(category, field) {
            if (CONFIG.fields[category]) {
                return CONFIG.fields[category][field] || null;
            }
            return null;
        },
        
        getCommonField: function(field) {
            return CONFIG.fields.common[field] || null;
        },
        
        getAttribute: function(category, attr) {
            if (CONFIG.attributes[category]) {
                return CONFIG.attributes[category][attr] || null;
            }
            return null;
        },
        
        getConstant: function(category, key) {
            if (CONFIG.constants[category]) {
                return CONFIG.constants[category][key] || null;
            }
            return null;
        },
        
        getIcon: function(name) {
            return CONFIG.icons[name] || "";
        },

        getLibraryId: function(name) {
            return CONFIG.libraryIds[name] || null;
        },
        
        // Utility funkcie
        getGlobalSetting: function(key) {
            return CONFIG.global[key] || null;
        },
        
        // Debug info
        getAllLibraries: function() {
            return Object.keys(CONFIG.libraries);
        },
        
        getAllFields: function(category) {
            return category ? Object.keys(CONFIG.fields[category] || {}) : Object.keys(CONFIG.fields);
        },
        
        // Kontrola existencie
        hasLibrary: function(name) {
            return CONFIG.libraries.hasOwnProperty(name);
        },

        hasField: function(category, field) {
            return CONFIG.fields[category] && CONFIG.fields[category].hasOwnProperty(field);
        }
    };
})();