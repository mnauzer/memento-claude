// ==============================================
// VYHĽADANIE TELEGRAM ID CREZ MEMENTO API
// Verzia: 1.0 | Dátum: December 2024 | Autor: ASISTANTO
// ==============================================

var ApiTelegramFinder = (function() {
    'use strict';

    var EMPLOYEES_LIBRARY_ID = "nWb00Nogf"; // ID knižnice Zamestnanci z asistanto.json

    // Lazy loading pre závislosti
    var _ai = null;
    var _core = null;
    var _config = null;

    function getAI() {
        if (!_ai && typeof MementoAI !== 'undefined') {
            _ai = MementoAI;
        }
        return _ai;
    }

    function getCore() {
        if (!_core && typeof MementoCore !== 'undefined') {
            _core = MementoCore;
        }
        return _core;
    }

    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }

    /**
     * Získa API token z nastavení
     */
    function getApiToken() {
        try {
            var core = getCore();
            var config = getConfig();

            var defaultsLib = libByName(config.libraries.defaults);
            if (!defaultsLib) return null;

            var settings = defaultsLib.entries();
            if (!settings || settings.length === 0) return null;

            var defaultSettings = settings[settings.length - 1];

            // Hľadaj API token - pre API responseov použijeme priamy prístup
            if (typeof defaultSettings.field === 'function') {
                // Memento entry objekt
                return core.safeGet(defaultSettings, "Memento API Token") ||
                       core.safeGet(defaultSettings, "API Token") ||
                       core.safeGet(defaultSettings, "Memento Token");
            } else {
                // Obyčajný JS objekt (pre testing)
                return defaultSettings["Memento API Token"] ||
                       defaultSettings["API Token"] ||
                       defaultSettings["Memento Token"];
            }

        } catch (error) {
            return null;
        }
    }

    /**
     * Vyhľadá Rasťa Škubala cez Memento API
     */
    function findRastoViaMementoAPI() {
        try {
            var core = getCore();
            var ai = getAI();

            if (!ai) {
                throw new Error("MementoAI modul nie je dostupný");
            }

            var apiToken = getApiToken();
            if (!apiToken) {
                throw new Error("Memento API token nie je nastavený");
            }

            core.addDebug(entry(), "🔍 Vyhľadávam Rasťa Škubala cez Memento API");
            core.addDebug(entry(), "📚 Library ID: " + EMPLOYEES_LIBRARY_ID);

            // API endpoint pre získanie záznamov knižnice
            var apiUrl = "https://api.mementodatabase.com/v1/libraries/" + EMPLOYEES_LIBRARY_ID + "/entries";

            // Headers pre API request
            var headers = {
                "Authorization": "Bearer " + apiToken,
                "Content-Type": "application/json"
            };

            // Pošli API request
            var response = ai.httpRequest("GET", apiUrl, null, headers);

            if (response.code !== 200) {
                throw new Error("API request failed: " + response.code + " - " + response.body);
            }

            var responseData = JSON.parse(response.body);

            if (!responseData.entries) {
                throw new Error("Neplatná odpoveď z API - chýbajú entries");
            }

            core.addDebug(entry(), "📊 Získané záznamy: " + responseData.entries.length);

            // Hľadaj Rasťa v záznamoch
            var searchTerms = ["rašťo", "rasto", "škubal", "skubal"];
            var foundEmployee = null;

            for (var i = 0; i < responseData.entries.length; i++) {
                var employee = responseData.entries[i];
                var fields = employee.fields;

                // Získaj textové polia na hľadanie
                var searchText = "";
                for (var fieldId in fields) {
                    var field = fields[fieldId];
                    if (field.type === "text" || field.type === "string") {
                        searchText += (field.value || "").toLowerCase() + " ";
                    }
                }

                // Kontrola zhody
                var match = false;
                for (var j = 0; j < searchTerms.length; j++) {
                    if (searchText.includes(searchTerms[j])) {
                        match = true;
                        foundEmployee = employee;
                        break;
                    }
                }

                if (match) {
                    core.addDebug(entry(), "✅ Nájdený zamestnanec (Entry ID: " + employee.id + ")");
                    break;
                }
            }

            if (!foundEmployee) {
                core.addError(entry(), "Rasťo Škubal nenájdený v API výsledkoch", "findRastoViaMementoAPI");
                return null;
            }

            // Hľadaj Telegram ID v poliach
            var telegramId = findTelegramIdInFields(foundEmployee.fields);

            if (telegramId) {
                core.addDebug(entry(), "📱 Telegram ID nájdené: " + telegramId);

                // Ulož výsledok
                var info = "🎯 TELEGRAM ID NÁJDENÉ CREZ API\n";
                info += "Entry ID: " + foundEmployee.id + "\n";
                info += "Telegram ID: " + telegramId + "\n";
                info += "Čas: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
                info += "Metóda: Memento API";

                entry().set("info", info);

                return {
                    success: true,
                    telegramId: telegramId,
                    entryId: foundEmployee.id,
                    method: "api"
                };

            } else {
                core.addError(entry(), "Telegram ID nie je vyplnené", "findRastoViaMementoAPI");
                return {
                    success: false,
                    error: "Telegram ID nie je vyplnené",
                    entryId: foundEmployee.id
                };
            }

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "API chyba: " + error.toString(), "findRastoViaMementoAPI", error);
            }

            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Hľadá Telegram ID v poliach záznamu
     */
    function findTelegramIdInFields(fields) {
        var telegramIdCandidates = [
            "telegram_id",
            "telegram",
            "telegramid",
            "chat_id",
            "chatid"
        ];

        for (var fieldId in fields) {
            var field = fields[fieldId];
            var fieldName = (field.name || "").toLowerCase();

            // Kontrola názvu poľa
            for (var i = 0; i < telegramIdCandidates.length; i++) {
                if (fieldName.includes(telegramIdCandidates[i])) {
                    var value = field.value;
                    if (value && value.toString().trim() !== "") {
                        return value.toString().trim();
                    }
                }
            }
        }

        return null;
    }

    /**
     * Ak API zlyhá, skús cez lokálny prístup
     */
    function findRastoLocal() {
        try {
            var core = getCore();
            var config = getConfig();

            // Skús cez lokálnu knižnicu
            var employeesLib = libByName(config.libraries.employees);
            if (!employeesLib) {
                return { success: false, error: "Lokálna knižnica nedostupná" };
            }

            core.addDebug(entry(), "🔄 Fallback: Hľadám lokálne");

            var employees = employeesLib.entries();
            for (var i = 0; i < employees.length; i++) {
                var employee = employees[i];
                var name = (core.safeGet(employee, "Meno") + " " + core.safeGet(employee, "Priezvisko")).toLowerCase();

                if (name.includes("rašť") || name.includes("rast") || name.includes("škub")) {
                    var telegramId = core.safeGet(employee, "Telegram ID");
                    if (telegramId) {
                        return {
                            success: true,
                            telegramId: telegramId,
                            method: "local"
                        };
                    }
                }
            }

            return { success: false, error: "Nenájdené lokálne" };

        } catch (error) {
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Hlavná funkcia - skúsi API, potom lokálne
     */
    function findTelegramId() {
        var core = getCore();

        core.addDebug(entry(), "🚀 Spúšťam vyhľadávanie Telegram ID");

        // Skús API
        var apiResult = findRastoViaMementoAPI();
        if (apiResult && apiResult.success) {
            return apiResult;
        }

        core.addDebug(entry(), "❌ API zlyhalo, skúšam lokálne");

        // Fallback na lokálne
        var localResult = findRastoLocal();
        return localResult;
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        findTelegramId: findTelegramId,
        findRastoViaMementoAPI: findRastoViaMementoAPI,
        findRastoLocal: findRastoLocal,
        getApiToken: getApiToken
    };
})();

// Spusti vyhľadávanie
var result = ApiTelegramFinder.findTelegramId();

if (result.success) {
    console.log("✅ Telegram ID nájdené: " + result.telegramId);
    console.log("📡 Metóda: " + result.method);
} else {
    console.log("❌ Nepodarilo sa nájsť Telegram ID: " + result.error);
}