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
// 🔧 CHANGELOG v7.0:
//    - Kompletne nová štruktúra bez spätnej kompatibility
//    - Všetky názvy polí z reálnych .mlt2 súborov
//    - Lazy loading podpora
//    - Slovenské komentáre
// ==============================================

var MementoConfig = (function() {
    'use strict';
    
    // Interná konfigurácia
    var CONFIG = {
        version: "7.0",
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
        
        // === NÁZVY KNIŽNÍC ===
        libraries: {
            // Evidencia - denné záznamy
            attendance: "Dochádzka",
            workRecords: "Záznam práce",
            rideLog: "Kniha jázd",
            cashBook: "Pokladňa",
    
            // Evidencia pomocné
            workReport: "Výkaz prác",
            materialsReport: "Výkaz materiálu",
            transportReport: "Výkaz dopravy",
            machinesReport: "Výkaz strojov",
            
            priceList: "Cenník prác",
            inventory: "Sklad",
            
            // Historical data 
            workPrices: "ceny prác",
            materialPrices: "ceny materiálu",
            wages: "sadzby zamestnancov",
            
            // Systémové knižnice
            defaults: "ASISTANTO Defaults",
            apiKeys: "ASISTANTO API",
            globalLogs: "ASISTANTO Logs",
            
            // Firemné knižnice
            employees: "Zamestnanci",
            suppliers: "Dodávatelia",
            partners: "Partneri",
            clients: "Klienti",
            vehicles: "Vozidlá",
            machines: "Stroje",
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
                debugFields: "Debug_Fields",
                infoTelegram: "info_telegram",    // NOVÉ
                notifications: "Notifikácie",     // NOVÉ - link field
            },
            workPrices: {
                work: "Práca",  // Pole ktoré odkazuje späť na HZS
                validFrom: "Platnosť od",
                price: "Cena"
            },
            orders: {
                telegramGroup: "Telegram skupina"
            },
            // Dochádzka polia
            attendance: {
                date: "Dátum",
                arrival: "Príchod",
                departure: "Odchod",
                employees: "Zamestnanci",
                works: "Práce",
                rides: "Jazdy",
                obligations: "Záväzky",
                employeeCount: "Počet pracovníkov",
                workTime: "Pracovná doba",
                workedHours: "Odpracované",
                onProjects: "Na zákazkách",
                downtime: "Prestoje",
                wageCosts: "Mzdové náklady",
                keys: "keys",
                notifications: "Notifikácie",
                employeeAttributes: {
                    workedHours: "odpracované",
                    hourlyRate: "hodinovka",
                    bonus: "+príplatok (€/h)",
                    premium: "+prémia (€)",
                    penalty: "-pokuta (€)",
                    dailyWage: "denná mzda",
                    note: "poznámka"
                },
            },
            // Záznam práce polia
            workRecord: {
                date: "Dátum",
                customer: "Zákazka",
                employees: "Zamestnanci",
                hzs: "Hodinová zúčtovacia sadzba",
                workReport: "Výkaz prác",
                workDescription: "Vykonané práce",
                employeeCount: "Počet pracovníkov",
                workTime: "Pracovná doba",
                workedHours: "Odpracované",
                wageCosts: "Mzdové náklady",
                hzsSum: "Suma HZS",
                startTime: "Od",
                endTime: "Do"
            },
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
            // Zamestnanci polia
            employee: {
                nick: "Nick",
                firstName: "Meno",
                lastName: "Priezvisko",
                fullName: "Celé meno",
                status: "Status",
                phone: "Telefón",
                email: "Email",
                position: "Pozícia",
                department: "Oddelenie",
                telegramId: "Telegram ID",
                address: "Adresa",
                birthDate: "Dátum narodenia",
                startDate: "Dátum nástupu",
                telegramID: "Telegram ID"
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
            
            // ASISTANTO Defaults polia
            defaults: {
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
                defaultHzs: "Predvolená HZS",
                
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
            },
            
            // Záväzky polia
            obligations: {
                number: "Číslo", // TODO: automatické generovanie
                date: "Dátum",
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
                info: "info úhrada"
            },
            
            // Zákazky polia
            customers: {
                state: "Stav",
                paymentState: "Stav platby",
                workType: "Typ práce (výber)",
                hourlyRateSetting: "Nastavenie hodinovka",
                priceCalculation: "Počítanie cien",
                materialPriceCalc: "Počítanie cien Materiálu",
                workPriceCalc: "Počítanie cien Prác",
                transportPriceCalc: "Počítanie cien Dopravy",
                priceOffer: "Cenová ponuka"
            },
            
            // Kniha jázd polia
            bookOfRides: {
                date: "Dátum",
                rideType: "Typ jazdy",
                ridePurpose: "Účel jazdy",
                rideDescription: "Popis jazdy",
                vehicle: "Vozidlo",
                driver: "Šofér",
                crew: "Posádka",
                customers: "Zákazky",
                km: "Km",
                wageCosts: "Mzdové náklady",
                rideTime: "Čas jazdy",
                stopTime: "Čas na zastávkach",
                totalTime: "Celkový čas",
                start: "Štart",
                destination: "Cieľ",
                stops: "Zastávky"
            },
            
            // Pokladňa polia
            cashRegister: {
                date: "Dátum",
                movement: "Pohyb",
                fromCashRegister: "Z pokladne",
                toCashRegister: "Do pokladne",
                obligationPayment: "Úhrada záväzku",
                obligationType: "Typ záväzku",
                offsetClaim: "Započítať pohľadávku",
                fromOverpaymentCreate: "Z preplatku vytvoriť",
                obligations: "Záväzky",
                claims: "Pohľadávky",
                transferPurpose: "Účel prevodu/výdaja",
                recordToCustomer: "Evidovať na zákazku",
                customer: "Zákazka",
                financialFees: "Finančné poplatky",
                employee: "Zamestnanec",
                supplier: "Dodávateľ",
                machineOrVehicle: "Stroj/Vozidlo"
            }
        },
        
        // === ATRIBÚTY ===
        attributes: {
            // Zamestnanci atribúty (v Dochádzke a Zázname práce)
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
            // V MementoConfig7.js - attributes sekcii pridaj:
            workRecordEmployees: {
                workedHours: "odpracované",
                hourlyRate: "hodinovka", 
                wageCosts: "mzdové náklady"
            },
            workReport: {
                workDescription: "vykonané práce",
                hoursCount: "počet hodín",
                billedRate: "účtovaná sadzba",
                totalPrice: "cena celkom"
            },
                        
            // HZS atribúty
            hzs: {
                price: "cena"
            },
            
            // Posádka atribúty (v Knihe jázd)
            crew: {
                hourlyRate: "hodinovka",
                bonus: "príplatok"
            },
            
            // Zastávky atribúty (v Knihe jázd)
            stops: {
                km: "km",
                duration: "trvanie",
                delay: "zdržanie",
                crew: "posádka"
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
            // Všeobecné
            start: "🚀",
            success: "✅",
            error: "❌",
            warning: "⚠️",
            info: "ℹ️",
            debug: "🐛",
            
            // Akcie
            create: "➕",
            update: "🔄",
            delete: "🗑️",
            search: "🔍",
            save: "💾",
            
            // Objekty
            person: "👤",
            group: "👥",
            money: "💰",
            rate: "💶",
            time: "⏰",
            calendar: "📅",
            document: "📄",
            
            // Stavy
            checkmark: "☑️",
            cross: "❎",
            questionMark: "❓",
            exclamation: "❗",
            round: "🔄",
            
            // Špecifické
            attendance: "📋",
            work: "🔨",
            car: "🚗",
            notification: "🔔",
            telegram: "📱",
            validation: "🛡️",
            calculation: "🧮",
            note: "📝",


        }
    };
    
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