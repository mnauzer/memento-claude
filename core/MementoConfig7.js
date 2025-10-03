// ==============================================
// MEMENTO CONFIG - Centralizovaná konfigurácia
// Verzia: 7.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Centrálny CONFIG pre všetky scripty
//    - Všetky názvy knižníc, polí a atribútov
//    - Globálne nastavenia a konštanty
//    - Jednoduchý prístup cez API
// ==============================================
//
// 🔧 POUŽITIE V INÝCH MODULOCH:
// Základné použitie:
//    var config = MementoConfig.getConfig();  // Celý CONFIG objekt
//
// Špecifické funkcie z return objektu:
//    var config = MementoConfig;
//    config.getLibrary("attendance");           // Názov knižnice
//    config.getField("attendance", "date");     // Pole v kategórii
//    config.getCommonField("debugLog");         // Spoločné pole
//    config.getConstant("status", "active");    // Konštanta
//    config.getIcon("success");                 // Emoji ikona
//    config.getAttribute("employees", "wage");  // Atribút
//    config.getGlobalSetting("timezone");      // Globálne nastavenie
//    config.get("fields.attendance.date");     // Cesta k hodnote
//    config.getSection("libraries");           // Celá sekcia
//
// Kontrolné funkcie:
//    config.hasLibrary("attendance");          // Existuje knižnica?
//    config.hasField("attendance", "date");    // Existuje pole?
//    config.getAllLibraries();                 // Zoznam všetkých knižníc
//    config.getAllFields("attendance");        // Zoznam polí kategórie
// ==============================================

var MementoConfig = (function() {
    'use strict';
    
    // Interná konfigurácia
    var CONFIG = {
        version: "7.0.8",
        recipientMapping: {
            "Partner": {
                linkField: "Partner",
                telegramField: "Telegram ID",
                type: "individual"
            },
            "Zamestnanec": {
                linkField: "Zamestnanec",
                telegramField: "Telegram ID",
                type: "individual"
            },
            "Klient": {
                linkField: "Klient",
                telegramField: "Telegram ID",
                type: "individual"
            },
            "Zákazka": {
                linkField: "Zákazka",
                telegramGroupField: "Telegram skupina",  // Pole v zákazke
                type: "customer"  // Špeciálny typ
            },
            "Skupina": {
                linkField: "Skupina/Téma",
                chatIdField: "Chat ID",
                threadIdField: null,
                type: "group"
            },
            "Skupina-Téma": {
                linkField: "Skupina/Téma",
                chatIdField: "Chat ID",
                threadIdField: "Thread ID",
                type: "group"
            }
        },

        // Mapovanie knižníc na ich konfigurácie
        libraryMapping: {
            "Dochádzka": {
                telegramGroupField: "Telegram skupina dochádzky",
                permissionField: "Dochádzka skupinové notifikácie"
            },
            "Záznam práce": {
                telegramGroupField: "Telegram skupina záznamu prác",
                permissionField: "Záznam prác skupinové notifikácie"
            },
            "ASISTANTO API": {
                telegramGroupField: "Telegram skupina záznamu prác",
                permissionField: "Záznam prác skupinové notifikácie"
            },
            "Kniha jázd": {
                telegramGroupField: "Telegram skupina knihy jázd",
                permissionField: "Kniha jázd skupinové notifikácie"
            },
            "Zákazky": {
                telegramGroupField: "Telegram skupina zákazky",
                permissionField: "Zákazky skupinové notifikácie"
            }
        },
        // Defaultné hodnoty pre globálne nastavenia
        defaults: {
            debug: false, // Predvolený debug mód
            workHoursPerDay: 8, // Predvolená pracovná doba za deň
            roundToQuarterHour: false // Zaokrúhľovanie na 15 minút
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
        libraries: {
            // Evidencia - denné záznamy
            dailyReport: "Denný report",
            attendance: "Dochádzka",
            workRecords: "Záznam prác",
            rideLog: "Kniha jázd",
            cashBook: "Pokladňa",
    
            // Evidencia pomocné
            workReport: "Výkaz prác",
            materialsReport: "Výkaz materiálu",
            rideReport: "Výkaz dopravy",
            machinesReport: "Výkaz strojov",
            
            // Cenníky a sklad
            priceList: "Cenník prác",
            inventory: "Materiál",
            materialExpenses: "Výdajky materiálu",
            materialIncomes: "Príjemky materiálu",
            
            // Historical data
            workPrices: "ceny prác",
            materialPrices: "ceny materiálu",
            wages: "sadzby zamestnancov",
            machinePrices: "ceny mechanizácie",
            vatRatesLib: "sadzby dph",
            
            // Systémové knižnice
            defaults: "ASISTANTO Defaults",
            apiKeys: "ASISTANTO API",
            globalLogs: "ASISTANTO Logs",
            
            // Firemné knižnice
            employees: "Zamestnanci", // Aktuálna: "Zamestnanci Semiramis" ID: qU4Br5hU6
            suppliers: "Dodávatelia",
            partners: "Partneri",
            clients: "Klienti",
            vehicles: "Vozidlá",
            machines: "Mechanizácia",
            places: "Miesta",
            addresses: "Adresy",
            accounts: "Účty",
            
            // Obchodné dokumenty
            quotes: "Cenové ponuky",
            orders: "Zákazky",
            orderSettlements: "Vyúčtovania",
            issuedInvoices: "Vystavené faktúry", // pridané
            receivedInvoices: "Prijaté faktúry", // pridané
            receivables: "Pohľadávky",
            obligations: "Záväzky",
            
            // Telegram knižnice
            notifications: "Notifications",
            telegramGroups: "Telegram Groups"
        },

        // === ID KNIŽNÍC (pre API prístup) ===
        libraryIds: {
            // Denné záznamy
            dailyReport: "Tt4pxN4xQ", // Denný report

            // Aktuálne používané knižnice podľa API analýzy
            employees: "qU4Br5hU6", // Zamestnanci Semiramis (obsahuje všetky potrebné polia)
            employeesBackup: "nmDvBcEwg", // Zamestnanci Backup
            employeesArchive2019: "hNasN9vjf", // del Zamestnanci 2019 (archív)
            employeeRates: "CqXNnosKP", // sadzby zamestnancov

            // Poznámka: Hlavná knižnica "Zamestnanci" (ID: nWb00Nogf) má obmedzený prístup
            // Pre scripts používať "Zamestnanci Semiramis" (qU4Br5hU6)
        },

        // === NÁZVY POLÍ ===
        fields: {
            // Spoločné polia vo všetkých knižniciach
            common: {
                id: "ID",
                view: "view",
                debugLog: "Debug_Log",
                errorLog: "Error_Log",
                info: "info",
                createdBy: "zapísal",
                modifiedBy: "upravil",
                createdDate: "dátum zápisu",
                modifiedDate: "dátum úpravy",
                rowColor: "farba záznamu",
                backgroundColor: "farba pozadia",
                infoTelegram: "info_telegram",    // NOVÉ
                notifications: "Notifikácie",     // NOVÉ - link field
            },

            // === EVIDENCIA - DENNÉ ZÁZNAMY ===
            // Denný report polia
            dailyReport: {
                date: "Dátum",
                attendance: "Dochádzka", // linkToEntry: Dochádzka
                workRecord: "Záznam prác", // linkToEntry: Záznam prác
                rideLog: "Kniha jázd", // linkToEntry: Kniha jázd
                cashBook: "Pokladňa", // linkToEntry: Pokladňa
                description: "Popis", // richtext
                // Povinné polia pre validáciu
                requiredFields: ["date"]
            },
            // Dochádzka polia
            attendance: {
                date: "Dátum",
                arrival: "Príchod",
                departure: "Odchod",
                employees: "Zamestnanci",
                works: "Práce", // linkToEntry: záznamy knižnice Záznam prác
                rides: "Jazdy", // linkToEntry: záznamy knižnice Knija jázd
                cashBook: "Pokladňa", // linkToEntry: záznamy knižnice Pokladňa
                material: "Materiál", // NOVÉ - linkToEntry: záznamy knižnice Materiál
                notifications: "Notifikácie", // linkToEntry: záznamy knižnice Notifikácie (group notifications)
                obligations: "Záväzky",
                employeeCount: "Počet pracovníkov",
                workTime: "Pracovná doba",
                workedHours: "Odpracované",
                workedOnOrders: "Na zákazkách",
                downTime: "Prestoje",
                wageCosts: "Mzdové náklady",
                keys: "keys",
                entryStatus: "stav záznamu", // multiCheckboxes: Záväzky, Práce, Jazdy, Notifikácie, Skontrolované, Voľno
                dayOffReason: "Dôvod voľna", // singleChoice: Dážď, Mokro, Oddych, Dovolenka, Iné
                entryIcons: "ikony záznamu",
                note: "Poznámka", // NOVÉ - text field, role: desc
                entryInfo: "entry info", // NOVÉ - text field, role: desc
                entryPhoto: "foto záznamu", // NOVÉ - image field
                infoRich: "info", // NOVÉ - richtext field
                employeeAttributes: {
                    workedHours: "odpracované",
                    hourlyRate: "hodinovka",
                    bonus: "+príplatok (€/h)",
                    premium: "+prémia (€)",
                    penalty: "-pokuta (€)",
                    dailyWage: "denná mzda",
                    note: "poznámka"
                },
                // Povinné polia pre validáciu
                requiredFields: ["date", "arrival", "departure", "employees"]
            },
            // Záznam práce polia
            workRecord: {
                date: "Dátum",
                order: "Zákazka",
                employees: "Zamestnanci",
                hzs: "Hodinová zúčtovacia sadzba",
                workReport: "Výkaz prác",
                workDescription: "Vykonané práce",
                employeeCount: "Počet pracovníkov",
                workTime: "Pracovná doba",
                workedHours: "Odpracované",
                wageCosts: "Mzdové náklady",
                hzsSum: "Suma HZS",
                machinesSum: "Suma stroje",
                startTime: "Od",
                endTime: "Do",
                machinery: "Mechanizácia", // linkToEntry Mechanizácia
                sumMachineryUsage: "Použitie mechanizácie", // linkToEntry Výkaz strojov
                // Povinné polia pre validáciu
                requiredFields: ["date", "order", "employees", "startTime", "endTime"]
            },
            // Kniha jázd polia
            rideLog: {
                zastavky: "Zastávky",
                ciel: "Cieľ",
                casJazdy: "Čas jazdy",
                casNaZastavkach: "Čas na zastávkach",
                celkovyCas: "Celkový čas",
                posadka: "Posádka",
                sofer: "Šofér",
                datum: "Dátum",
                mzdy: "Mzdové náklady",
                date: "Dátum",
                rideType: "Typ jazdy",
                ridePurpose: "Účel jazdy",
                rideDescription: "Popis jazdy",
                vehicle: "Vozidlo",
                driver: "Šofér",
                crew: "Posádka",
                orders: "Zákazky",
                rate: "Sadzba za km",
                km: "Km",
                wageCosts: "Mzdové náklady",
                rideTime: "Čas jazdy",
                stopTime: "Čas na zastávkach",
                totalTime: "Celkový čas",
                start: "Štart",
                destination: "Cieľ",
                stops: "Zastávky",
                trasa: "",
                vehicleCosts: "Náklady vozidlo"
            },
            // Pokladňa polia
            cashBook: {
                date: "Dátum",
                transactionType: "Pohyb", //s ingleChoice: Príjem, Výdaj, PP (Priebežná položka)
                fromAccount: "Z pokladne", // linkToEntry: Účty (Accounts)
                toAccount: "Do pokladne", // linkToEntry: Účty (Accounts)
                paidBy: "Platbu vykonal", // linkToEntry: Zamestnanci (Employees), kto vykonal platbu
                paidTo: "Platbu prijal", // linkToEntry: Zamestnanci (Employees), kto prijal platbu
                obligationPayment: "Úhrada záväzku", //Checkbox - či sa platbou uhrádzajú záväzky
                obligationType: "Typ záväzku", //singleChoice: Mzdy, Faktúry, Nájomné, Leasing (pribudnú ďalšie)
                offsetClaim: "Započítať pohľadávku", //Checkbox - pri úhrade záväzku sa môže započítať pohľadávka ak je rovnaký subjekt (creditor)
                fromOverpaymentCreate: "Z preplatku vytvoriť", //Options: Zálohu, Prémiu, Pohľadávku (ak pri platbe vznikne preplatok, uplatní sa jedna z možností)
                obligations: "Záväzky", //linkToEntry: Záväzky (prepojené úhrádzané záväzky)
                claims: "Pohľadávky", //linkToEntry: Pohľadávky (prepojené pohľadávky ktoré uhrádzajú záväzky alebo vznikli platbou)
                transferPurpose: "Účel prevodu", // singleChoice: Dotácia pokladne, Vklad na účet, Presun hotovosti, (použíje sa pri Priebežná položka)
                // tieto polia pravdepodobne prerobím na linksFrom
                recordToCustomer: "Evidovať na zákazku", // Checkbox: platba sa bude evidovať na konkrétnu zákazku
                customer: "Zákazka", // linkToEntry: Zákazky, prepojenie so zákazkou s ktorou súvisí platba
                order: "Zákazka", // linkToEntry: Zákazky, prepojenie so zákazkou s ktorou súvisí platba
                rezia: "Prevádzková réžia", // singleChoice: PHM Vozidlá, PHM Stroje, ND a servis vozidlá, ND a servis stroje, PR Pitný režim, Stravné, Potraviny, Réžia rôzne, DHIM, Výdavky na zákazku, Pracovné odevy, Externá doprava, Kancelárske potreby
                tool: "Stroj", // linkToEntry: Stroje
                vehicle: "Vozidlo", // linkToEntry: Stroje
                financialFees: "Finančné poplatky", //singleChoice: Odvody ZP a SP, Poistenie MV, Diaľničná známka, DPH, Pokuty a penále, Poplatky banka (ďalšie položky sa môžu vytvárať postupne)
                employee: "Zamestnanec", // linkToEntry: Zamestnanci
                supplier: "Dodávateľ", // linkToEntry: Dodávatelia
                partner: "Partner", // linkToEntry: Partneri
                sum: "Suma", // suma záznamu bez dph
                sumTotal: "Suma s DPH", // suma záznamu s dph
                vat: "DPH", // suma DPH
                description: "Popis platby",
                note: "Poznámka",
                image: "Doklad", // screenshot alebo foto reálneho dokladu
                isVat: "s DPH", // checkbox: či je záznam s dph alebo bez dph
                vatRate: "sadzba DPH", // singleChoice: základná, znížená, nulová
                vatRateValue: "DPH%"
            },

            // === EVIDENCIA POMOCNÉ ===
            // Výkaz prác polia
            workReport: {
                datum: "Dátum",
                identifikator: "Identifikátor",
                popis: "Popis",
                typVykazu: "Typ výkazu",
                cenyPocitat: "Ceny počítať",
                cenovaPonuka: "Cenová ponuka",
                vydane: "Vydané",
                zakazka: "Zákazka",
                praceHZS: "Práce HZS",
                info: "info",
                totalHours: "Celkové hodiny",
                hzsSum: "Suma HZS",
                hzsCount: "Počet záznamov"
            },
            // Výkaz dopravy polia
            rideReport: {
                date: "Dátum",
                state: "Stav", // singleChoice: Čakajúce, Prebieha, Ukončené, Vyúčtované, Zaplatené
                number: "Číslo", // text unique
                description: "Popis", // text
                reportType: "Typ výkazu", // options: % zo zákazky, Pevná suma, Cena za km, Počet jazd x paušál
                priceCalculation: "Ceny počítať", // singleChoice: Z cenovej ponuky, z cenníka
                order: "Zákazka", // linkToEntry Zákazky
                kmTotal: "Km celkom", // real number, súčet km z výkazu dopravy
                hoursTotal: "Hodiny celkom", // real number, súčet hodín z výkazu dopravy
                rideCount: "Počet jázd", // integer, počet záznamov z výkazu dopravy
                wageCostsTotal: "Mzdové náklady celkom", // real number, súčet mzdových nákladov z výkazu dopravy
                sum: "Suma celkom", // real number
                ride: "Doprava", // linkToEntry Kniha jázd
            },

            // === CENNÍKY A SKLAD ===
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
            // Príjemky materiálu polia
            materialIncomes: {
                number: "Číslo", // text
                date: "Dátum", // date
                description: "Popis", // text
                supplier: "Dodávateľ", // linkToEntry Dodávatelia
                partner: "Partner", // linkToEntry Partneri
                sum: "Suma", // real number
                vat: "DPH", // real number
                sumWithVat: "Suma s DPH", // real number
                items: "Položky", // linkToEntry Materiál
                transportPrice: "Cena za prepravu" // real number
            },
            // Výdajky materiálu polia
            materialExpenses: {
                number: "Číslo", // text
                date: "Dátum", // date
                description: "Popis", // text
                issuedTo: "Vydané", // singleChoice: Zákazka, Partner, Klient
                client: "Klient", // linkToEntry Klienti
                order: "Zákazka", // linkToEntry Zákazky
                partner: "Partner", // linkToEntry Partneri
                sum: "Suma", // real number
                vat: "DPH", // real number
                sumWithVat: "Suma s DPH", // real number
                items: "Položky", // linkToEntry Materiál
                transportPrice: "Cena za prepravu" // real number
            },

            // ceny materiálu polia
            materialPrices: {
                material: "Materiál", // linkToEntry Materiál
                date: "Platnosť od", // date
                purchasePrice: "nc", // real number Nákupná cena
                sellPrice: "pc" // real number Predajná cena

            },

            // === HISTORICAL DATA ===
            // ceny prác polia
            workPrices: {
                work: "Práca",  // Pole ktoré odkazuje späť na HZS
                validFrom: "Platnosť od",
                price: "Cena"
            },
            // ceny strojov polia
            machinePrice: {
                machine: "Mechanizácia",  // Pole ktoré odkazuje späť na Mechanizáciu
                validFrom: "Platnosť od",
                priceMth: "Cena mth",
                flatRate: "Cena paušál"
            },
            // Sadzby zamestnancov polia
            wages: {
                employee: "Zamestnanec",
                hourlyRate: "Sadzba",
                validFrom: "Platnosť od",
                validTo: "Platnosť do",
                rateType: "Typ sadzby",
                note: "Poznámka"
            },
            // sadzby DPH
            vatRates: {
                validFrom: "Platnosť od",
                standard: "základná",
                reduced: "znížená"
            },

            // === SYSTÉMOVÉ KNIŽNICE ===
            // ASISTANTO Defaults polia
            defaults: {
                // Kniha jázd
                defaultZdrzanie: "Default zdržanie",

                // Main
                date: "Dátum",
                companyName: "Názov firmy",
                street: "Ulica",
                postalCode: "PSČ",
                city: "Mesto",
                ico: "IČO",
                dic: "DIČ",
                icDph: "IČ DPH",
                accountingYear: "Účtovný rok",
                workTimeFrom: "Pracovný čas od",
                workTimeTo: "Pracovný čas do",
                // Strana záznam prác
                defaultHzs: "Default HZS",

                // Telegram nastavenia
                telegramEnabled: "Povoliť Telegram správy",
                telegramApiKey: "Telegram Bot API Key",
                telegramBotName: "Telegram Bot",
                telegramDefaultGroup: "Predvolená Telegram skupina",
                telegramAttendanceId: "Telegram Dochádzka ID",
                telegramGroupId: "Telegram Skupina ID",

                // Notifikačné nastavenia
                notificationDelay: "Oneskorenie notifikácie (min)",
                summaryDelay: "Oneskorenie súhrnu (min)",
                includeStats: "Zahrnúť štatistiky",
                includeFinancials: "Zahrnúť finančné údaje",
                weekendMessages: "Víkendové správy",
                individualNotifications: "Notifikácie individuálne",
                groupNotifications: "Notifikácie skupinové",
                attendanceIndividualNotifications: "Dochádzka individuálne notifikácie",
                attendanceGroupNotifications: "Dochádzka skupinové notifikácie",

                // Debug nastavenia
                debugMode: "Debug mód"
            },

            // === FIREMNÉ KNIŽNICE ===
            // Zamestnanci polia - aktualizované podľa API analýzy (Zamestnanci Semiramis: qU4Br5hU6)
            employee: {
                // Základné identifikačné polia
                nick: "Nick", // text: unique identifier
                firstName: "Meno", // text
                lastName: "Priezvisko", // text
                active: "Aktívny", // boolean - či je zamestnanec aktívny
                position: "Pozícia", // radio: Brigádnik, Stály zamestnanec, Vedúcko

                // Hodinová sadzba
                hourlyRate: "Hodinovka", // double - aktuálna hodinová sadzba pre výpočty

                // Odpracované hodiny - aktuálne obdobie
                workedTime: "Odpracované", // double - odpracované hodiny (filter obdobie)
                workedOnOrders: "Odpracované na zákazkach", // double - hodiny na zákazkách
                drivingTime: "Jazdy", // double - čas jazdy zo záznamu knihy jázd

                // Odpracované hodiny - celkové
                workTimeTotal: "Odpracované total", // double - celkové odpracované hodiny
                workedOnOrdersTotal: "Odpracované na zákazkach total", // double - celkové hodiny na zákazkách
                drivingTimeTotal: "Jazdy total", // double - celkový čas jazdy

                // Finančné údaje - aktuálne obdobie
                wage: "Zarobené", // currency - zarobené za obdobie (z dennej mzdy)
                paid: "Vyplatené", // currency - vyplatené za obdobie
                balance: "Preplatok/Nedoplatok", // currency - rozdiel zarobené/vyplatené

                // Finančné údaje - celkové
                wageTotal: "Zarobené total", // currency - celkové zarobené
                paidTotal: "Vyplatené total", // currency - celkové vyplatené

                // Počítadlá záznamov
                attendanceCount: "Dochádzka", // int - počet záznamov dochádzky
                orderCount: "Zákazky", // int - počet záznamov práce na zákazkách
                totalCount: "Celkom", // int - celkový počet záznamov

                // Štatistické filtre
                periodFilter: "výber obdobia", // multichoice filter pre obdobie
                totalPeriodFilter: "obdobie total", // multichoice filter pre celkové obdobie
                seasonWorked: "Odpracované sezóny", // multichoice - sezónne odpracované
                seasonFilter: "Výber sezóny na prepočet", // multichoice - filter sezóny

                // Kontaktné údaje
                mobile: "Mobil", // phone
                email: "Email", // email
                telegram: "Telegram ID", // text - Telegram username/ID
                note: "Poznámka", // text

                // Mapovanie starých názvov pre backward compatibility
                telegramId: "Telegram ID", // DEPRECATED - use telegram
                telegramID: "Telegram ID", // DEPRECATED - use telegram
                phone: "Mobil", // DEPRECATED - use mobile
                unpaid: "Preplatok/Nedoplatok", // DEPRECATED - use balance

                // Dodatočné finančné polia (ak sú potrebné)
                bonuses: "Prémie", // sum prémie (z knižnice Pokladňa)
                obligations: "Záväzky", // sum záväzky
                receivables: "Pohľadávky", // sum pohľadávky
                saldo: "Saldo", // Záväzky - Pohľadávky
            },
            // Vozidlo
            vehicle: {
                active: "Aktívny", // checkbox:
                name: "Názov",
                type: "Typ", // singleChoice: Dodávka, Valník, Osobné
                rate: "Sadzba za km",
                flatRate: "Paušál za jazdu",
                driver: "Šofér", // linkToEntry Zamestnanci, default zamestnanec ktorý jazdí na tomto vozidle
                parkingBase: "Stanovište", // linkToEntry Miesta, default miesto kde parkuje vozidlo
                odometerValue: "Stav tachometra",
                kmDriven: "Najazdené",
                consumptionRate: "Spotreba",
                costRate: "Nákladová cena" // real number, nákladová cena za km
            },
            // Stroje (Mechanizácia)
            machine: {
                type: "Typ", // singleChoice: Stroj, Technika, Ručné náradie, Príslušenstvo
                status: "status", // options: vlastné, externé, požičovňa
                name: "Názov",
                description: "Popis",
                owner: "Vlastník",
                mth: "MTH", // motohodiny
                hzs: "HZS", // linkToEntry: Cenník prác
                flatRate: "Paušál" // linkToEntry: Cenník prác
            },
            // Miesto
            place: {
                category: "Kategória", // singleChoice: Klient, Dodávateľ, Partner, Zamestnanec, Iné
                active: "Aktívny", // checkbox
                name: "Názov",
                customer: "Klient", // linkToEntry Klienti
                supplier: "Dodávateľ", // linkToEntry Dodávatelia
                partner: "Partner", // linkToEntry Partneri
                employee: "Zamestnanec", // linkToEntry Zamestnanci
                distantce: "Vzdialenosť",
                address: "Adresa",
                gps: "GPS",
                location: "Lokalita",
                isOrder: "Zákazka" // checkbox
            },
            // Účty (Accounts)
            account: {
                type: "Typ", //options: Hotovosť, Banka
                name: "Názov", //
                accountNumber: "Číslo účtu", //
                iban: "IBAN", //
                initialValue: "Počiatočný stav", //
                balance: "Stav"
            },

            // === OBCHODNÉ DOKUMENTY ===
            // Cenové ponuky polia
            quote: {
                state: "Stav", // singleChoice: Návrh, Odoslaná, Schválená, Zamietnutá, Stornovaná
                number: "Číslo", // text unique
                name: "Názov", // text
                description: "Popis cenovej ponuky", // text
                date: "Dátum",
                validUntil: "Platnosť do", // date
                place: "Miesto realizácie", // linkToEntry Miesta
                customer: "Klient", // linkToEntry Klienti
                type: "Typ cenovej ponuky", // options: Hodinovka, Položky, Externá,
                rideCalculation: "Účtovanie dopravy", // singleChoice: Paušál, Km, % zo zákazky, Pevná cena, Neúčtovať
                fixRidePrice: "Pevná cena dopravy", // real number
                rateRidePrice: "Doprava %", // real number % decimal
                kmRidePrice: "Cena za km", // linkToEntry Cenník prác
                flatRateRidePrice: "Paušál dopravy", // linkToEntry Cenník prác
                total: "Suma celkom", // real number, súčet všetkých položiek
                priceCalculation: "Ceny počítať", // singleChoice: Z cenovej ponuky, z cenníka

                workHZS: "Hodinová zúčtovacia sadzba", // real number
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
                quote: "Cenová ponuka", // linkToEntry Cenové ponuky
                date: "Dátum",
                startDate: "Dátum začatia",
                endDate: "Dátum ukončenia",
                budget: "Rozpočet", // real number
                spent: "Spotrebované", // real number
                remaining: "Zostatok", // real number, budget - spent
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

                vatRate: "Sadzba DPH", // text, z knižnice ASISTANTO Defaults
                telegramGroup: "Telegram skupina" // linkToEntry Telegram Groups
            },
            // Pohľadávky
            receivables: {
                date: "Dátum",
                type: "Typ",
                state: "Stav",
                creditor: "Veriteľ",
                employee: "Zamestnanec",
                supplier: "Dodávateľ",
                partner: "Partner",
                client: "Klient",
                amount: "Suma",
                paid: "Zaplatené",
                balance: "Zostatok",
                description: "Popis",
                info: "info",
                debtor: "Dlžník",        // Pridané
                cashBook: "Pokladňa"      // Pridané
            },
            // Záväzky polia
            obligations: {
                date: "Dátum",
                dueDate: "Splatnosť",
                type: "Typ", // SingleChoice: Nákup materiálu, Mzda, Podiely, Pôžička, Poistné, Faktúra
                state: "Stav", // SingleChoice: Neuhradené, Čiastočne uhradené, Uhradené
                creditor: "Veriteľ", //SingleChoice list: Dodávateľ, Partner, Zamestnanec, Klient
                employee: "Zamestnanec", //linktToEntry Zamestnanci
                supplier: "Dodávateľ", //linktToEntry Zamestnanci
                client: "Klient", //linktToEntry Klienti
                partner: "Partner", //linktToEntry Partneri
                attendance: "Dochádzka", //linktToEntry Dochádzka
                invoices: "Faktúry prijaté", //linktToEntry Faktúry prijaté
                description: "Popis",
                isVat: "s DPH", // Checkbox
                vatRateOption: "sadzba dph", // Options: Základná, Znížená, Nulová
                vatRate: "sadzba DPH",
                amount: "Suma",
                vatAmount: "DPH",
                totalAmount: "Suma s DPH",
                paid: "Zaplatené",
                balance: "Zostatok", // amount || totalAmount - paid
                info: "info úhrada",
                obligations: "Záväzky" // Chceckbox, true ak sync zaväzkov prebehol úspešne
            },

            // === TELEGRAM KNIŽNICE ===
            // Notifications polia
            notifications: {
                status: "Status",
                priority: "Priorita",
                messageType: "Typ správy",
                messageSource: "Zdroj správy",
                formatting: "Formátovanie",
                recipient: "Adresát",
                groupOrTopic: "Skupina/Téma",
                employeeOrClient: "Zamestnanec/klient",
                customer: "Zákazka",
                message: "Správa",
                attachment: "Príloha",
                chatId: "Chat ID",
                threadId: "Thread ID",
                messageId: "Message ID",
                lastMessage: "Posledná správa",
                lastUpdate: "Posledná aktualizácia",
                messageCount: "Počet správ",
                retryCount: "Retry Count",
                lastError: "Posledná chyba"
            },
            // Telegram Groups polia
            telegramGroups: {
                groupName: "Názov skupiny",
                groupType: "Typ skupiny",
                chatId: "Chat ID",
                hasTopic: "Má tému",
                threadId: "Thread ID",
                topicName: "Názov témy",
                description: "Popis skupiny",
                enableNotifications: "Povoliť notifikácie",
                workTimeFrom: "Pracovný čas od",
                workTimeTo: "Pracovný čas do",
                weekendEnabled: "Víkend povolený",
                messagePriority: "Priorita správ",
                dailyMessageLimit: "Denný limit správ",
                silentMessage: "Tichá správa",
                lastMessage: "Posledná správa",
                messageCount: "Počet správ",
                totalMessageCount: "Celkový počet správ",
                lastError: "Posledná chyba"
            }
        },        
        // === ATRIBÚTY ===
        attributes: {
            employees: {
                workedHours: "odpracované",
                hourlyRate: "hodinovka",
                costs: "náklady",
                bonus: "+príplatok (€/h)",
                premium: "+prémia (€)",
                penalty: "-pokuta (€)",
                dailyWage: "denná mzda",
                note: "poznámka"
            },
            workRecordEmployees: {
                workedHours: "odpracované",
                hourlyRate: "hodinovka", 
                wageCosts: "mzdové náklady"
            },
            workRecordHzs: {
                price: "cena",
            },
            workRecordMachines: {
                calculationType: "účtovanie", // options: paušál, mth 
                usedMth: "mth", // motohodiny
                priceMth: "sadzba", // cena za motohodinu - doplní sa z cenníka mechanizácie
                flatRate: "paušál", // cena za celoddenné použitie stroja - doplní sa z cenníka mechanizácie
                totalPrice: "účtovaná suma" // suma ktorá sa účtuje za použitie stroja buď podľa motohodín alebo paušálu
            },
            workReport: {
                workDescription: "vykonané práce",
                hoursCount: "počet hodín",
                billedRate: "účtovaná sadzba",
                totalPrice: "cena celkom"
            },
            rideLogCrew: {
                hourlyRate: "hodinovka",
                wage: "mzda",
            },
            rideLogStops: {
                km: "km",
                duration: "trvanie",
                delay: "zdržanie",
                description: "popis jazdy"
            },
            crew: {
                hourlyRate: "hodinovka",
                bonus: "príplatok"
            },
            stops: {
                km: "km",
                duration: "trvanie",
                delay: "zdržanie",
                crew: "posádka"
            },
            rideReport: {
                km: "km",
                description: "popis jazdy",
                wageCosts: "mzdové náklady",
                vehicleCosts: "náklady vozidlo",
                rideTime: "čas jazdy",
                stopTime: "čas na zastávkach",
                totalTime: "celkový čas"
            },
            // Výdajky materiálu - atribúty položiek
            materialExpensesItems: {
                quantity: "množstvo", // real number
                price: "cena", // real number
                totalPrice: "cena celkom" // real number
            },
            // Príjemky materiálu - atribúty položiek
            materialIncomesItems: {
                quantity: "množstvo", // real number
                price: "cena", // real number
                totalPrice: "cena celkom" // real number
            }

        },
        
        // === KONŠTANTY ===
        constants: {
            // Typy dochádzky
            attendanceTypes: {
                work: "Práca",
                holiday: "Sviatok",
                vacation: "Dovolenka",
                sick: "PN",
                doctor: "Lekár",
                office: "Úrad"
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
            },
            
            // Stavy záväzkov
            obligationStates: {
                unpaid: "Neuhradené",
                partiallyPaid: "Čiastočne uhradené",
                paid: "Uhradené"
            },
            
            // Typy správ
            messageTypes: {
                attendance: "Dochádzka",
                workRecord: "Záznam prác",
                bookOfRides: "Kniha jázd",
                todo: "ToDo",
                manual: "Manuálna",
                reminder: "Pripomienka",
                summary: "Súhrn"
            },
            
            // Priority
            priorities: {
                low: "Nízka",
                normal: "Normálna",
                high: "Vysoká",
                urgent: "Urgentné"
            },
            
            // Typ jazdy
            rideTypes: {
                business: "Firemná",
                private: "Súkromná",
                other: "Iná"
            },
            
            // Účel jazdy
            ridePurposes: {
                work: "Pracovná",
                consultations: "Konzultácie",
                unspecified: "Neurčené"
            },
            
            // Typ pohybu v pokladni
            cashMovementTypes: {
                income: "Príjem",
                expense: "Výdavok",
                transfer: "PP"
            },
            
            // Typ záväzku
            obligationTypes: {
                wages: "Mzdy",
                invoices: "Faktúry",
                rent: "Nájomné",
                leasing: "Leasing"
            },
            
            // Formátovanie správ
            messageFormatting: {
                text: "Text",
                markdown: "Markdown",
                html: "HTML"
            },
            
            // Zdroj správy
            messageSources: {
                automatic: "Automatická",
                manual: "Manuálna",
                scheduled: "Naplánovaná"
            },
            
            // Typ adresáta
            recipientTypes: {
                employee: "Zamestnanec",
                client: "Klient",
                partner: "Partner",
                group: "Skupina",
                customer: "Zákazka"
            },
            
            // Typ Telegram skupiny
            telegramGroupTypes: {
                general: "Všeobecná",
                customer: "Zákazka",
                hr: "HR",
                individual: "Individuálne"
            }
        },
        
        // === EMOJI A IKONY ===
        icons: {
            // ═══════════════════════════════════════════════════════════════
            // VŠEOBECNÉ STATUSY A AKCIE  
            // ═══════════════════════════════════════════════════════════════
            start: "🚀",              // Spustenie procesu
            success: "✅",            // Všeobecný úspech
            error: "❌",              // Všeobecná chyba
            warning: "⚠️",            // Všeobecné varovanie
            info: "ℹ️",               // Informácia
            debug: "🐛",              // Debug
            
            // Akcie
            create: "➕",             // Vytvorenie
            update: "🔄",            // Aktualizácia  
            delete: "🗑️",            // Vymazanie
            search: "🔍",            // Vyhľadávanie
            save: "💾",              // Uloženie
            
            // Stavy
            checkmark: "☑️",          // Označené
            cross: "❎",              // Neoznačené  
            questionMark: "❓",       // Otázka
            exclamation: "❗",        // Výkričník
            round: "🔄",             // Rotácia/cyklus (rovnaké ako update - OK!)
            
            // ═══════════════════════════════════════════════════════════════
            // OBJEKTY A ENTITY
            // ═══════════════════════════════════════════════════════════════
            person: "👤",             // Osoba
            group: "👥",              // Skupina  
            money: "💰",              // Peniaze
            rate: "💶",               // Kurz
            time: "⏰",               // Čas (všeobecný)
            calendar: "📅",           // Kalendár
            document: "📄",           // Dokument

            // ═══════════════════════════════════════════════════════════════
            // DOCHÁDZKA (rovnaké emoji, iný kontext!)
            // ═══════════════════════════════════════════════════════════════
            attendance: "📋",         // Dochádzka
            present: "✅",            // Prítomný (rovnaké ako success - OK!)
            absent: "❌",             // Neprítomný (rovnaké ako error - OK!)
            late: "⏰",               // Oneskorenie (rovnaké ako time - OK!)
            overtime: "🕐",           // Nadčas
            vacation: "🏖️",          // Dovolenka
            sick: "🤒",               // Choroba

            // ═══════════════════════════════════════════════════════════════  
            // PRÁCA A PROJEKTY
            // ═══════════════════════════════════════════════════════════════
            work: "🔨",               // Práca
            project: "📊",            // Projekt
            task: "✔️",               // Úloha
            completed: "🏁",          // Dokončené
            inProgress: "⚙️",         // Prebieha
            pending: "⏳",            // Čakajúce
            priority: "🔴",           // Priorita

            // ═══════════════════════════════════════════════════════════════
            // DOPRAVA (rovnaké emoji pre príbuzné funkcie)
            // ═══════════════════════════════════════════════════════════════
            transport: "🚚",          // Doprava
            // Palivo a servis
            fuel: "⛽",               // Palivo
            maintenance: "🔧",        // Údržba
            service: "🛠️",           // Servis
            parking: "🅿️",           // Parkovanie
            breakdown: "⚠️",          // Porucha (rovnaké ako warning - OK!)

            heavy_machine: "🚜",       // Ťažký stroj)
            accessory: "🔩",           // Príslušenstvo
            machine_use: "⚙️",        // Použitie stroja (rovnaké ako inProgress - OK!)
            // ═══════════════════════════════════════════════════════════════
            // POČASIE (kombinované emoji sú skvelé!)
            // ═══════════════════════════════════════════════════════════════
            weather: "🌤️",           // Všeobecné počasie
            rain: "🌧️",              // Dážď
            heavy_rain: "⛈️",        // Silný dážď  
            light_rain: "🌦️",        // Slabý dážď
            storm: "⛈️",             // Búrka (rovnaké ako heavy_rain - OK!)
            wet: "💧",               // Mokro
            // Mraky
            cloud: "☁️",             // Mrak
            cloudy: "🌥️",           // Oblačno
            overcast: "☁️",          // Zamračené (rovnaké ako cloud - OK!)
            fog: "🌫️",              // Hmla
            mist: "🌫️",             // Opar (rovnaké ako fog - OK!)
            // Podmienky
            muddy: "🟤",             // Bahno
            slippery: "⚠️",          // Šmykľavo (rovnaké ako warning - OK!)  
            splash: "💦",            // Striekanie
            
            // Pracovné podmienky  
            work_stop: "🛑",         // Zastavenie práce
            weather_delay: "⏰🌧️",  // Odklad kvôli počasiu
            indoor_work: "🏠",       // Práca v interiéri
            weather_ok: "☀️",        // Vhodné počasie
            
            // Špeciálne kombinované (výborné!)
            rain_cross: "🌧️❌",     // Dážď - nemožno pracovať
            wet_warn: "⚠️💧",       // Mokro - varovanie  
            fog_eye: "🌫️👁️",       // Hmla - viditeľnosť
            wind: "💨⚠️",           // Vietor - varovanie
            frost: "❄️🛑",          // Mráz - stop
            soil_wet: "🌱💧",       // Mokrá pôda

            // ═══════════════════════════════════════════════════════════════
            // FINANČNÉ A ZÁVÄZKY  
            // ═══════════════════════════════════════════════════════════════
            obligations: "💸",       // Záväzky
            debt: "🔴",             // Dlh
            liability: "⚖️",         // Zodpovednosť
            payment: "💳",          // Platba
            
            // Zmluvy
            obligation: "⚖️",        // Povinnosť (rovnaké ako liability - OK!)
            bond: "🔗",             // Spojenie

            // ═══════════════════════════════════════════════════════════════
            // SYSTÉMOVÉ A APLIKAČNÉ
            // ═══════════════════════════════════════════════════════════════
            database: "🗄️",         // Databáza
            sync: "🔄",             // Synchronizácia (rovnaké ako update - OK!)
            backup: "💾",           // Záloha (rovnaké ako save - OK!)
            settings: "⚙️",         // Nastavenia
            security: "🔒",         // Bezpečnosť
            key: "🔑",              // Kľúč
            
            // Aplikačné
            notification: "🔔",      // Notifikácia
            telegram: "📱",          // Telegram
            validation: "🛡️",       // Validácia  
            calculation: "🧮",       // Výpočet
            note: "📝",             // Poznámka (rovnaké ako contract - OK!)

            // DÔVERNOSŤ A BEZPEČNOSŤ
            confidential: "🔒",       // Dôverné
            classified: "🔐",         // Utajované
            private: "🛡️",           // Súkromné
            restricted: "🚫",         // Obmedzené
            secure: "🔑",             // Zabezpečené
            // ÚROVNE DÔVERNOSTI
            top_secret: "㊙️",        // Prísne tajné
            // BEZPEČNOSTNÉ AKCIE
            access_granted: "✅🔑",   // Prístup povolený
            access_denied: "❌🔒",    // Prístup zamietnutý
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
        
        // Špeciálne gettery pre často používané kombinácie
        getAttendanceField: function(field) {
            return CONFIG.fields.attendance[field] || null;
        },
        
        getWorkRecordField: function(field) {
            return CONFIG.fields.workRecord[field] || null;
        },
        
        getEmployeeAttribute: function(attr) {
            return CONFIG.attributes.employees[attr] || null;
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