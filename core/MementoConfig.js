// ==============================================
// MEMENTO CONFIG - CENTRAL CONFIGURATION
// Verzia: 8.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Predchádzajúca verzia: MementoConfig7.js v7.1.0
// ==============================================
// 📋 CHANGELOG: {project_root}/docs/CHANGELOG-MementoConfig.md
// ==============================================
// 📋 ÚČEL:
//    - Centrálny CONFIG pre všetky scripty
//    - Všetky názvy knižníc, polí a atribútov
//    - Globálne nastavenia a konštanty
//    - Jednoduchý prístup cez API
//    - Metadata pre library-specific modules (NOVÉ v7.1.0)
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
//
// NOVÉ v7.1.0 - Prístup k library modules:
//    config.getLibraryModule("Dochadzka");     // Metadata o module
//    config.getModuleFields("Dochadzka");      // Field mappings modulu
// ==============================================
//
// 🔧 CHANGELOG v7.1.0:
//    - PRIDANÉ: MODULE_INFO pre verziovanie
//    - PRIDANÉ: libraryModules section pre metadata library-specific modules
//    - Podpora pre nový modules/ directory architecture
//    - Field mappings pre reusable modules (Dochadzka, Pokladna, CenovePonuky, KnihaJazd)
// ==============================================

var MementoConfig = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoConfig",
        version: "8.0.0",
        author: "ASISTANTO",
        description: "Central configuration for all libraries, fields, icons, and module metadata",
        dependencies: [],  // No dependencies - foundation module
        provides: [
            "getConfig", "getLibrary", "getField", "getIcon",
            "getLibraryModule", "getModuleFields"
        ],
        status: "stable",
        changelog: "v8.0.0 - Standardized version, removed version from filename"
    };

    // Interná konfigurácia
    var CONFIG = {
        version: MODULE_INFO.version,  // CHANGELOG moved to /docs/CHANGELOG-MementoConfig.md - saved ~9KB
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

        // === KONFIGURÁCIA VÝKAZOV ===
        // Spoločná konfigurácia pre všetky typy výkazov
        reportConfigs: {
            // Výkaz prác konfigurácia - aktualizované (2025-10-04)
            work: {
                library: "workReport",
                sourceField: "workRecords", // LinkToEntry pole pre spätný link
                prefix: "VP",
                attributes: ["workDescription", "hoursCount", "billedRate", "totalPrice"], // z workReportWorkRecords
                summaryFields: ["totalHours", "hzsSum", "hzsCount"],
                requiredFields: ["date", "order"],
                // Mapovanie polí pre vytvorenie výkazu
                fieldMapping: {
                    date: "date",
                    identifier: "identifier",
                    description: "description",
                    reportType: "reportType",
                    order: "order"
                }
            },
            // Výkaz dopravy konfigurácia - aktualizované (2025-10-04)
            ride: {
                library: "rideReport",
                sourceField: "rides", // LinkToEntry pole pre spätný link
                prefix: "VD",
                attributes: ["km", "description", "wageCosts", "vehicleCosts", "rideTime", "stopTime", "totalTime"], // z rideReportRides
                summaryFields: ["kmTotal", "hoursTotal", "rideCount", "wageCostsTotal", "transportCosts", "sum"],
                requiredFields: ["date", "order"],
                // Mapovanie polí pre vytvorenie výkazu
                fieldMapping: {
                    date: "date",
                    number: "number",
                    description: "description",
                    reportType: "reportType",
                    order: "order"
                }
            },
            // Výkaz strojov konfigurácia - už aktualizované
            machines: {
                library: "machinesReport",
                sourceField: "workRecord",  // Správne pole pre spätný link
                prefix: "VS",
                attributes: ["mth", "pausalPocet", "cenaMth", "cenaPausal", "cenaCelkom"],  // Aktualizované atribúty
                summaryFields: ["sumWithoutVat", "vat", "sumWithVat"],  // Hlavné súčty
                requiredFields: ["date", "order", "machines"]
            },
            // Výkaz materiálu konfigurácia - zachované
            materials: {
                library: "materialsReport",
                sourceField: "material",
                prefix: "VM",
                attributes: ["quantity", "pricePerUnit", "purchasePrice", "vatRate", "totalPrice", "margin"],
                summaryFields: ["totalQuantity", "purchasePriceTotal", "sellPriceTotal", "marginTotal", "vatTotal", "sumWithVat", "materialCount"],
                requiredFields: ["date", "order"]
            }
        },

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
        libraries: {
            // Evidencia - denné záznamy
            dailyReport: "Denný report",
            attendance: "Dochádzka",
            workRecords: "Záznam prác",  // API ID: ArdaPo5TU
            rideLog: "Kniha jázd",
            cashBook: "Pokladňa",

            // Evidencia pomocné
            workReport: "Výkaz prác",
            materialsReport: "Výkaz materiálu",
            rideReport: "Výkaz dopravy",
            machinesReport: "Výkaz strojov",  // API ID: uCRaUwsTo
            
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
            transportPrices: "ceny dopravy",
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
            quoteParts: "Cenové ponuky Diely",
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

        // === LIBRARY MODULES METADATA (NOVÉ v7.1.0) ===
        // Metadata pre library-specific reusable modules v modules/ directory
        // NOTE: Library module versions listed here for documentation.
        // Always verify against MODULE_INFO.version in actual module files.
        libraryModules: {
            Dochadzka: {
                file: "modules/Dochadzka.js",
                version: "1.0.1",
                library: "Dochádzka",
                status: "active",
                description: "Attendance calculation and wage management module",
                fields: {
                    date: "Dátum",
                    arrival: "Príchod",
                    departure: "Odchod",
                    employees: "Zamestnanci",
                    workTime: "Pracovná doba",
                    workedHours: "Odpracované hodiny",
                    employeeCount: "Počet pracovníkov",
                    wageCosts: "Mzdové náklady",
                    totalWages: "Celková mzda",
                    entryIcons: "ikony záznamu",
                    entryStatus: "Stav záznamu",
                    dayOffReason: "Dôvod voľna",
                    info: "info"
                }
            },
            Pokladna: {
                file: "modules/Pokladna.js",
                version: "1.0.0",
                library: "Pokladňa",
                status: "active",
                description: "Cash register operations and obligations management",
                fields: {
                    date: "Dátum",
                    amount: "Suma",
                    sumWithVat: "Suma s DPH",
                    isVat: "s DPH",
                    vatRate: "Sadzba DPH",
                    description: "Popis",
                    obligations: "Záväzky",
                    recordType: "Typ záznamu",
                    info: "info"
                }
            },
            CenovePonuky: {
                file: "modules/CenovePonuky.js",
                version: "1.0.0",
                library: "Cenové ponuky",
                status: "active",
                description: "Price quote calculations and order creation",
                fields: {
                    identifier: "Identifikátor",
                    description: "Popis",
                    client: "Klient",
                    parts: "Diely",
                    sumWithoutVat: "Suma bez DPH",
                    vat: "DPH",
                    sumWithVat: "Suma s DPH",
                    status: "Stav",
                    info: "info"
                }
            },
            KnihaJazd: {
                file: "modules/KnihaJazd.js",
                version: "1.0.0",
                library: "Kniha jázd",
                status: "active",
                description: "Ride log calculation and daily report integration",
                fields: {
                    date: "Dátum",
                    timeFrom: "Čas od",
                    timeTo: "Čas do",
                    vehicle: "Vozidlo",
                    startLocation: "Začiatok",
                    endLocation: "Koniec",
                    kmStart: "Stav km začiatok",
                    kmEnd: "Stav km koniec",
                    kmTotal: "Km celkom",
                    crew: "Osádka",
                    wageCosts: "Mzdové náklady",
                    transportCosts: "Náklady dopravy",
                    info: "info"
                }
            }
            // Future modules will be added here as they are extracted
        },

        // === ID KNIŽNÍC (pre API prístup) ===
        libraryIds: {
            // Denné záznamy
            dailyReport: "Tt4pxN4xQ", // Denný report

            // Výkazy a reporty
            workReport: null, // Výkaz prác - ID sa získa runtime
            rideReport: null, // Výkaz dopravy - ID sa získa runtime
            machinesReport: "uCRaUwsTo", // Výkaz strojov
            materialsReport: "z3sxkUHgT", // Výkaz materiálu

            // Obchodné dokumenty - Cenové ponuky
            quotes: "90RmdjWuk", // Cenové ponuky
            quoteParts: "nCAgQkfvK", // Cenové ponuky Diely

            // Obchodné dokumenty - Zákazky
            orders: "CfRHN7QTG", // Zákazky
            orderParts: "iEUC79O2T", // Zákazky Diely

            // Aktuálne používané knižnice podľa API analýzy
            employeeRates: "CqXNnosKP", // sadzby zamestnancov

            // Poznámka: Hlavná knižnica "Zamestnanci" (ID: nWb00Nogf) má obmedzený prístup
         
            // Systémové knižnice
            defaults: "KTZ6dsnY9", // ASISTANTO Defaults
            globalLogs: "H6PRzPqxU", // ASISTANTO Logs (verified 2026-03-20)
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
                infoTelegram: "info_telegram", // richtext - Telegram správy
                notifications: "Notifikácie", // linkToEntry - prepojené notifikácie
                recordIcons: "ikony záznamu" // text - textové ikony pre záznam
            },

            // === EVIDENCIA - DENNÉ ZÁZNAMY ===
            // Denný report polia
            dailyReport: {
                date: "Dátum", // date, role: name
                dayOfWeek: "Deň", // choice - názov dňa (Pondelok, Utorok, ...)
                recordIcons: "ikony záznamu", // richtext
                recordDescription: "Popis záznamu", // text, role: desc
                attendance: "Dochádzka", // linkToEntry: Dochádzka
                workRecord: "Záznam prác", // linkToEntry: Záznam prác
                rideLog: "Kniha jázd", // linkToEntry: Kniha jázd
                cashBook: "Pokladňa", // linkToEntry: Pokladňa
                description: "Popis", // richtext
                hoursWorked: "Odpracované", // double - celkové odpracované hodiny
                infoAttendance: "info dochádzka", // richtext - agregovaný info z Dochádzky
                infoWorkRecords: "info záznam prác", // richtext - agregovaný info zo Záznamov prác
                infoCashBook: "info pokladňa", // richtext - agregovaný info z Pokladne
                infoRideLog: "info kniha jázd", // richtext - agregovaný info z Knihy jázd
                // Povinné polia pre validáciu
                requiredFields: ["date"]
            },
            // Dochádzka polia
            attendance: {
                date: "Dátum",
                dayOfWeek: "Deň", // NOVÉ v9.0.0 - deň v týždni (Pondelok, Utorok, ...)
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
                machinesCosts: "Náklady stroje", // currency - náklady za stroje
                workItemsSum: "Suma", // currency - suma z Práce Položky
                startTime: "Od",
                endTime: "Do",
                machinery: "Mechanizácia", // linkToEntry Mechanizácia
                sumMachineryUsage: "Použitie mechanizácie", // linkToEntry Výkaz strojov
                workItems: "Práce Položky", // linkToEntry: Cenník prác
                icons: "ikony záznamu", // text (emoji) - ikony pre vizuálnu indikáciu
                dailyReport: "Denný report", // linkToEntry Denný report
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
                vehicleCosts: "Náklady vozidlo",
                icons: "ikony záznamu", // text (emoji) - ikony pre vizuálnu indikáciu
                dailyReport: "Denný report" // linkToEntry Denný report
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
            // Výkaz prác polia - aktualizované podľa kódu (2025-10-04)
            workReport: {
                // Základné polia
                date: "Dátum", // date - hlavný dátum (aktualizované z 'datum')
                identifier: "Identifikátor", // text - jedinečný identifikátor
                description: "Popis", // text - popis výkazu
                reportType: "Typ výkazu", // choice - typ výkazu
                priceCalculation: "Ceny počítať", // choice - spôsob počítania cien
                quote: "Cenová ponuka", // linkToEntry: Cenové ponuky
                issued: "Vydané", // choice - komu vydané
                order: "Zákazka", // linkToEntry: Zákazky

                // LinkToEntry polia
                workRecords: "Práce HZS", // linkToEntry: Záznam prác (spätný link)
                workItems: "Práce Položky", // linkToEntry: Cenník prác

                // Súčtové polia
                totalHours: "Celkové hodiny", // real - súčet hodín
                hzsSum: "Suma HZS", // currency - suma HZS
                workItemsSum: "Suma", // currency - suma z Práce Položky
                hzsCount: "Počet záznamov", // int - počet záznamov

                // Systémové polia
                info: "info", // richtext - dodatočné informácie

                // Povinné polia pre validáciu
                requiredFields: ["date", "order"]
            },
            // Výkaz strojov polia - aktualizované podľa API analýzy (2025-10-04)
            machinesReport: {
                // Systémové polia
                view: "view", // radio - systémové (field 117)
                vyuctovane: "Vyúčtované", // boolean - stav účtovania (field 119)

                // Hlavné polia
                date: "Dátum", // date - hlavný dátum záznamu (field 2)
                order: "Zákazka", // linkToEntry: Zákazky (field 65)
                description: "Popis", // text - popis výkazu (field 72)
                machines: "Stroje", // linkToEntry: Mechanizácia (field 103) - OPRAVENÉ z 120 na 103
                workRecord: "Záznam práce", // linkToEntry: Záznam prác (field 121)

                // Finančné polia - názvy podľa skutočnej API štruktúry
                sumWithoutVat: "Suma", // currency - hlavná suma bez DPH (field 68) - OPRAVENÉ z "Suma bez DPH"
                vat: "DPH", // currency - DPH suma (field 73)
                sumWithVat: "Suma s DPH", // currency - celková suma s DPH (field 69)

                // Ďalšie polia z API
                stav: "Stav", // choice - stav záznamu (field 126)
                nazovZaznamu: "Názov záznamu", // text (field 129)
                cislo: "Číslo", // int (field 127)
                identifikator: "Identifikátor", // text (field 128)
                pocetZaznamov: "Počet záznamov", // int (field 130)
                pocetStrojov: "Počet strojov", // int (field 131)
                info: "info", // richtext (field 124)
                aktualizacia: "aktualizácia", // richtext (field 134)

                // Duplicitné polia pre kompatibilitu - odstrániť po aktualizácii všetkých skriptov
                zakazka: "zakazka", // entries (field 132) - duplicitné pole
                orderDuplicate: "order", // entries (field 133) - duplicitné pole

                // Povinné polia pre validáciu
                requiredFields: ["date", "order", "machines"]
            },
            // Výkaz materiálu polia
            materialsReport: {
                date: "Dátum",
                state: "Stav", // singleChoice: Čakajúce, Prebieha, Ukončené, Vyúčtované, Zaplatené
                number: "Číslo", // text unique
                description: "Popis", // text
                client: "Klient", // linkToEntry Klienti
                partner: "Partner", // linkToEntry Partneri
                order: "Zákazka", // linkToEntry Zákazky
                material: "Materiál", // linkToEntry Materiál
                totalQuantity: "Množstvo celkom", // real number
                purchasePriceTotal: "Nákupná cena celkom", // real number
                sellPriceTotal: "Predajná cena celkom", // real number
                marginTotal: "Marža celkom", // real number
                vatTotal: "DPH celkom", // real number
                sumWithVat: "Suma s DPH", // real number
                materialCount: "Počet materiálov", // integer
                info: "info", // text
            },
            // Výkaz dopravy polia - aktualizované podľa kódu (2025-10-04)
            rideReport: {
                // Základné polia
                date: "Dátum", // date - hlavný dátum
                state: "Stav", // choice: Čakajúce, Prebieha, Ukončené, Vyúčtované, Zaplatené
                number: "Číslo", // text unique - identifikačné číslo
                description: "Popis", // text - popis výkazu
                reportType: "Typ výkazu", // choice: % zo zákazky, Pevná suma, Cena za km, Počet jazd x paušál
                priceCalculation: "Ceny počítať", // choice: Z cenovej ponuky, z cenníka

                // LinkToEntry polia
                order: "Zákazka", // linkToEntry: Zákazky
                rides: "Doprava", // linkToEntry: Kniha jázd (spätný link)

                // Súčtové polia - agregované z prepojených jázd
                kmTotal: "Km celkom", // real - súčet km z knihy jázd
                hoursTotal: "Hodiny celkom", // real - súčet hodín z knihy jázd
                rideCount: "Počet jázd", // int - počet prepojených záznamov
                wageCostsTotal: "Mzdové náklady celkom", // currency - súčet mzdových nákladov
                transportCosts: "Náklady doprava", // currency - náklady na dopravu
                sum: "Suma celkom", // currency - celková fakturovaná suma

                // Systémové polia
                info: "info", // richtext - dodatočné informácie

                // Povinné polia pre validáciu
                requiredFields: ["date", "order"]
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
            // ceny dopravy polia
            transportPrices: {
                vehicle: "vozidlo",  // linkToEntry Vozidlá - pole ktoré odkazuje späť na vozidlo
                validFrom: "Platnosť od",  // date - od kedy je cena platná
                price: "Cena",  // real number - cena za km (alias pre priceKm)
                priceKm: "Cena km",  // real number - cena za km
                priceFlatRate: "Cena paušál"  // real number - paušálna cena
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
            // ASISTANTO Defaults polia (ID: KTZ6dsnY9)
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

                // Telegram základné nastavenia
                telegramEnabled: "Povoliť Telegram správy", // boolean (id: 38)
                telegramDefaultGroup: "Predvolená Telegram skupina", // entries (id: 39)
                temaNazov: "Téma Názov", // text (id: 67)
                telegramBotApiKey: "Telegram Bot API Key", // password (id: 16)
                telegramBot: "Telegram Bot", // text (id: 44)
                telegramBotToken: "Telegram Bot Token", // password (id: 66)

                // Pracovný čas
                workTimeFrom: "Pracovný čas od", // time (id: 40)
                workTimeTo: "Pracovný čas do", // time (id: 41)

                // Notifikačné nastavenia
                weekendMessages: "Víkendové správy", // boolean (id: 42)
                debugMode: "Debug mód", // boolean (id: 43)
                notificationDelay: "Oneskorenie notifikácie (min)", // int (id: 54)
                summaryDelay: "Oneskorenie súhrnu (min)", // int (id: 55)
                includeStats: "Zahrnúť štatistiky", // boolean (id: 56)
                includeFinancials: "Zahrnúť finančné údaje", // boolean (id: 57)

                // N8N integrácia
                n8nAuthType: "N8N Auth Type", // choice (id: 49)
                n8nWebhookUrl: "N8N Webhook URL", // text (id: 48)
                n8nApiKey: "N8N API Key", // text (id: 50)
                n8nUsername: "N8N Username", // text (id: 58)
                n8nPassword: "N8N Password", // text (id: 59)
                n8nHeaderName: "N8N Header Name", // text (id: 60)

                // Dochádzka
                prichod: "Príchod", // time (id: 0)
                odchod: "Odchod", // time (id: 1)
                dochadzka: "dochádzka", // boolean (id: 51)
                telegramAttendanceId: "Telegram Dochádzka ID", // text (id: 26)
                telegramGroupAttendance: "Telegram skupina dochádzky", // entries (id: 31)
                attendanceIndividualNotifications: "Dochádzka individuálne notifikácie", // boolean (id: 52)
                attendanceGroupNotifications: "Dochádzka skupinové notifikácie", // boolean (id: 65)
                sendGroupAttendanceNotifications: "Posielať group notifikácie dochádzky", // boolean (id: 53)

                // Kniha jázd
                defaultStartAddress: "Východzia štart adresa", // entries (id: 5)
                defaultTargetAddress: "Východzia cieľová adresa", // entries (id: 10)
                defaultZdrzanie: "default zdržanie", // duration (id: 11)
                telegramGroupRideLog: "Telegram skupina knihy jázd", // entries (id: 32)

                // Záznam prác
                defaultHzs: "Default HZS", // entries (id: 6)
                sendWorkRecordNotifications: "Posielať notifikácie záznamu prác zamestnancom", // boolean (id: 36)
                sendGroupWorkRecordNotifications: "Posielať group notifikácie záznamu prác", // boolean (id: 37)
                telegramGroupWorkRecords: "Telegram skupina záznamu prác", // entries (id: 33)

                // Pokladňa
                telegramGroupCashbook: "Telegram skupina pokladne", // entries (id: 34)
                accounts: "Účty", // entries (id: 12)

                // Cenové ponuky - NUMBER PLACEHOLDERS
                cpPlaceholder: "CP Placeholder", // text (id: 7) - Cenové ponuky
                telegramGroupQuotes: "Telegram skupina cenových ponúk", // entries (id: 64)

                // Cenové ponuky - DEFAULT VALUES
                cpDefaultRidePercentage: "CP Default % dopravy", // double - default % dopravy
                cpDefaultKmPrice: "CP Default cena za km", // entries - linkToEntry Cenník prác
                cpDefaultRideFlatRate: "CP Default paušál dopravy", // entries - linkToEntry Cenník prác
                cpDefaultMassTransferPercentage: "CP Default % presunu hmôt", // double - default % presunu hmôt
                cpDefaultMassTransferPrice: "CP Default cena presunu hmôt", // entries - linkToEntry Cenník prác

                // Zákazky - NUMBER PLACEHOLDERS
                zPlaceholder: "Z Placeholder", // text (id: 8) - Zákazky
                telegramGroupOrders: "Telegram skupina zákaziek", // entries (id: 63)
                telegramGroupOrder: "Telegram skupina zákazky", // entries (id: 68)
                ordersGroupNotifications: "Zákazky skupinové notifikácie", // boolean (id: 69)

                // Vyúčtovania - NUMBER PLACEHOLDERS
                vPlaceholder: "V Placeholder" // text (id: 9) - Vyúčtovania
            },

            // === FIREMNÉ KNIŽNICE ===
            // Klienti polia - získané z API (Klienti: rh7YHaVRM)
            client: {
                view: "view", // singleChoice: Editácia, Tlač, Debug
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
                view: "view", // singleChoice
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

            // Zamestnanci polia - aktualizované podľa API analýzy (Zamestnanci: nWb00Nogf)
            employee: {
                // Základné identifikačné polia
                nick: "Nick", // text: unique identifier
                firstName: "Meno", // text
                lastName: "Priezvisko", // text
                active: "Aktívny", // boolean - či je zamestnanec aktívny
                position: "Pozícia", // radio: Brigádnik, Stály zamestnanec, Vedúcko

                // Hodinová sadzba
                hourlyRate: "Aktuálna hodinovka", // double (ID:42) - DOKUMENTÁCIA; runtime používa FIELDS.hourlyRate v modules/Zamestnanci.js

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
                seats: "Počet miest", // integer - počet miest vo vozidle
                rate: "Sadzba za km",
                flatRate: "Paušál za jazdu",
                driver: "Šofér", // linkToEntry Zamestnanci, default zamestnanec ktorý jazdí na tomto vozidle
                parkingBase: "Stanovište", // linkToEntry Miesta, default miesto kde parkuje vozidlo
                odometerValue: "Stav tachometra",
                kmDriven: "Najazdené",
                consumptionRate: "Spotreba",
                costRate: "Nákladová cena", // real number, nákladová cena za km
                lastKmByRideLog: "Posledné km (KJ)" // real number, posledná najazdená vzdialenosť z Knihy jázd (pre prepočet tachometra)
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
                flatRate: "Paušál", // linkToEntry: Cenník prác
                costPriceMth: "Nákladová cena mth", // real number, nákladová cena za motohodinu
                costPriceFlatRate: "Nákladová cena paušál" // real number, nákladová paušálna cena
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
                budget: "Rozpočet", // real number
                budgetSubcontracts: "Rozpočet subdodávky", // real number - rozpočet subdodávok pri "Vytvoriť dodatok"
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
                subcontractsCalculation: "Účtovanie subdodávok", // choice (field 305) - Neúčtovať, Zarátať do ceny, Vytvoriť dodatok
                subcontracts: "Subdodávky", // entries (field 318) - linkToEntry Zákazky Diely (samostatné pole pre subdodávky)
                subcontractsTotal: "Celkom Subdodávky", // currency (field 325) - celková suma subdodávok

                // DIELY ZÁKAZKY
                parts: "Diely", // entries (field 260) - linkToEntry Zákazky Diely

                // CELKOVÉ SUMY (fields 331, 332)
                total: "Celkom", // currency (field 331) - celková suma bez DPH
                totalWithVat: "Celkom s DPH", // currency (field 332) - celková suma s DPH

                // DPH
                vat: "DPH", // currency (field 324)
                vatRate: "Sadzba DPH", // double (field 317)

                // OSTATNÉ
                telegramGroup: "Telegram skupina" // linkToEntry Telegram Groups
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
                type: "Typ", // SingleChoice: Nákup materiálu, Mzda, Podiely, Pôžička, Poistné, Faktúra, Mzdy
                state: "Stav", // SingleChoice: Neuhradené, Čiastočne uhradené, Uhradené
                status: "Stav", // Alias for state (backward compatibility)
                creditor: "Veriteľ", //SingleChoice list: Dodávateľ, Partner, Zamestnanec, Klient
                employee: "Zamestnanec", //linktToEntry Zamestnanci
                supplier: "Dodávateľ", //linktToEntry Dodávatelia
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
                calculationType: "účtovanie", // options: paušál, mth - attr 3 (radio)
                usedMth: "mth", // motohodiny - attr 0 (double)
                priceMth: "sadzba", // cena za motohodinu - attr 5 (double) - OPRAVENÉ z "cena mth"
                flatRate: "paušál", // cena za celoddenné použitie stroja - attr 6 (double) - OPRAVENÉ z "cena paušál"
                totalPrice: "účtovaná suma" // suma ktorá sa účtuje za použitie stroja - attr 7 (double) - OPRAVENÉ z "cena celkom"
            },
            workRecordWorkItems: {
                quantity: "množstvo", // real number - množstvo jednotiek
                price: "cena", // currency - cena za jednotku
                totalPrice: "cena celkom" // currency - celková cena (množstvo × cena)
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
            rideLogOrders: {
                count: "počet", // int - počet výskytov zákazky na trase
                km: "km", // real number - vzdialenosť tam a nazad (2× vzdialenosť miesta)
                revenueKm: "výnosy km", // real number - výnosy podľa km (km × cena za km)
                revenueFlatRate: "výnosy paušál", // real number - paušálna cena za zákazku
                billing: "účtovanie" // text - spôsob účtovania (Km, Paušál, %)
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
            },
            // Cenové ponuky Diely - atribúty položiek (2025-10-06)
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

            // Zákazky Diely - atribúty položiek SKUTOČNÉ hodnoty (2025-10-12)
            orderPartMaterials: {
                quantity: "množstvo", // real number - skutočné množstvo materiálu
                price: "cena", // currency - skutočná cena za jednotku
                totalPrice: "cena celkom" // currency - skutočná celková cena (množstvo × cena)
            },
            orderPartWorks: {
                quantity: "množstvo", // real number - skutočné množstvo hodín/jednotiek
                price: "cena", // currency - skutočná cena za jednotku
                totalPrice: "cena celkom" // currency - skutočná celková cena (množstvo × cena)
            },

            // Zákazky Diely - atribúty položiek z CENOVEJ PONUKY (CP) (2025-10-12)
            orderPartMaterialsCp: {
                quantity: "množstvo cp", // real number - množstvo materiálu z cenovej ponuky
                price: "cena cp", // currency - cena z cenovej ponuky
                totalPrice: "cena celkom cp" // currency - celková cena z cenovej ponuky
            },
            orderPartWorksCp: {
                quantity: "množstvo cp", // real number - množstvo hodín/jednotiek z cenovej ponuky
                price: "cena cp", // currency - cena z cenovej ponuky
                totalPrice: "cena celkom cp" // currency - celková cena z cenovej ponuky
            },

            // Výkaz strojov - atribúty strojov (field 103) - aktualizované podľa API (2025-10-04)
            machinesReportMachines: {
                // Skutočné atribúty podľa API
                mth: "mth", // double - motohodiny (attr id: 1)
                pausalPocet: "paušál počet", // int - počet paušálov (attr id: 6)
                cenaMth: "cena mth", // currency - cena za motohodinu (attr id: 4)
                cenaPausal: "cena paušál", // currency - cena za paušál (attr id: 5)
                cenaCelkom: "cena celkom", // currency - celková cena (attr id: 3)

                // DEPRECATED - staré názvy pre kompatibilitu, odstránit po aktualizácii všetkých skriptov
                calculationType: "účtovanie", // DEPRECATED - nahradiť logickou kombinatiou mth/pausal
                usedMth: "mth", // DEPRECATED - použiť priamo "mth"
                priceMth: "cena mth", // DEPRECATED - použiť priamo "cenaMth"
                flatRate: "cena paušál", // DEPRECATED - použiť priamo "cenaPausal"
                totalPrice: "cena celkom", // DEPRECATED - použiť priamo "cenaCelkom"
                description: "popis použitia", // DEPRECATED - nie je v API atribútoch
                workTime: "pracovný čas" // DEPRECATED - nie je v API atribútoch
            },
            // Výkaz materiálu - atribúty materiálu
            materialsReportMaterial: {
                quantity: "množstvo", // real number - vydané množstvo
                unit: "mj", // text - merná jednotka
                pricePerUnit: "cena za mj", // currency - cena za jednotku
                costPrice: "nákupná cena", // currency - nákupná cena za jednotku
                totalPrice: "cena celkom", // currency - celková predajná cena
                totalCostPrice: "NC celkom", // currency - celková nákupná cena
                vatRate: "sadzba DPH", // text - sadzba DPH
                description: "poznámka", // text - poznámka k položke
                specification: "špecifikácia" // text - špecifikácia materiálu
            },
            // Výkaz prác - atribúty záznamov prác (workRecords LinkToEntry pole)
            workReportWorkRecords: {
                workDescription: "vykonané práce", // text - popis vykonaných prác
                hoursCount: "počet hodín", // real - počet odpracovaných hodín
                billedRate: "účtovaná sadzba", // currency - sadzba za hodinu
                totalPrice: "cena celkom" // currency - celková cena za práce
            },
            // Výkaz prác - atribúty položiek prác (workItems LinkToEntry pole)
            workReportWorkItems: {
                quantity: "množstvo", // real number - množstvo jednotiek
                price: "cena", // currency - cena za jednotku
                totalPrice: "cena celkom" // currency - celková cena (množstvo × cena)
            },
            // Výkaz dopravy - atribúty jázd (rides LinkToEntry pole)
            rideReportRides: {
                km: "km", // real - najazdené kilometre
                description: "popis jazdy", // text - popis účelu jazdy
                wageCosts: "mzdové náklady", // currency - náklady na posádku
                vehicleCosts: "náklady vozidlo", // currency - náklady na vozidlo
                rideTime: "čas jazdy", // real - čas strávený jazdou v hodinách
                stopTime: "čas na zastávkach", // real - čas na zastávkach
                totalTime: "celkový čas" // real - celkový čas jazdy
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
            
            order: "📦",              // Objednávka/zákazka
            jobs: "🛠️",              // Práca/úloha
            driver: "🚚",             // Šofér/vozidlo
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
            material: "🧰",            // Materiál
            daily_report: "📋",        // Denný report (linknutý na záznam)
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
        // Module metadata
        info: MODULE_INFO,
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
        },

        // === NOVÉ API PRE VÝKAZY ===

        /**
         * Získa konfiguráciu pre konkrétny typ výkazu
         * @param {string} reportType - Typ výkazu (work, ride, machines, materials)
         * @returns {Object} Konfigurácia výkazu alebo null
         */
        getReportConfig: function(reportType) {
            return CONFIG.reportConfigs[reportType] || null;
        },

        /**
         * Získa všetky dostupné typy výkazov
         * @returns {Array} Zoznam typov výkazov
         */
        getAllReportTypes: function() {
            return Object.keys(CONFIG.reportConfigs);
        },

        /**
         * Kontrola existencie konfigurácie výkazu
         * @param {string} reportType - Typ výkazu
         * @returns {boolean} True ak existuje konfigurácia
         */
        hasReportConfig: function(reportType) {
            return CONFIG.reportConfigs.hasOwnProperty(reportType);
        },

        // === LIBRARY MODULES (NOVÉ v7.1.0) ===

        /**
         * Získa metadata o library module
         * @param {string} moduleName - Názov modulu (napr. "Dochadzka")
         * @returns {Object|null} Metadata modulu alebo null
         *
         * @example
         * var module = MementoConfig.getLibraryModule("Dochadzka");
         * // Returns: { file: "modules/Dochadzka.js", version: "1.0.1", library: "Dochádzka", ... }
         */
        getLibraryModule: function(moduleName) {
            return CONFIG.libraryModules[moduleName] || null;
        },

        /**
         * Získa field mappings pre library module
         * @param {string} moduleName - Názov modulu
         * @returns {Object|null} Field mappings alebo null
         *
         * @example
         * var fields = MementoConfig.getModuleFields("Dochadzka");
         * // Returns: { date: "Dátum", arrival: "Príchod", ... }
         */
        getModuleFields: function(moduleName) {
            var module = CONFIG.libraryModules[moduleName];
            return module ? module.fields : null;
        },

        /**
         * Získa verziu library modulu
         * @param {string} moduleName - Názov modulu
         * @returns {string|null} Verzia alebo null
         */
        getModuleVersion: function(moduleName) {
            var module = CONFIG.libraryModules[moduleName];
            return module ? module.version : null;
        },

        /**
         * Kontrola existencie library modulu
         * @param {string} moduleName - Názov modulu
         * @returns {boolean} True ak existuje
         */
        hasLibraryModule: function(moduleName) {
            return CONFIG.libraryModules.hasOwnProperty(moduleName);
        },

        /**
         * Získa všetky dostupné library modules
         * @returns {Array<string>} Zoznam názvov modulov
         */
        getAllLibraryModules: function() {
            return Object.keys(CONFIG.libraryModules);
        }
    };
})();