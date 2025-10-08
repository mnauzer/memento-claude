// ==============================================
// MEMENTO DATABASE - MIESTA PREPOČET
// Verzia: 2.1.0 | Dátum: október 2025 | Autor: ASISTANTO
// Knižnica: Miesta | Trigger: Before Save
// ==============================================
// ✅ REFAKTOROVANÉ v2.1:
//    - OPRAVENÉ: Správne volanie utils.extractGPSFromPlace(entry)
//    - OPRAVENÉ: calculateSegment vracia objekt {success, km, duration, metoda}
//    - Odstránená duplicitná lokálna funkcia extractGPSCoordinates
//    - Používa sa konzistentne MementoGPS.extractGPSFromPlace pre obe miesta
// ✅ REFAKTOROVANÉ v2.0:
//    - Integrácia s MementoGPS pre výpočet vzdialenosti
//    - Použitie MementoUtils a MementoConfig
//    - Automatické vyplnenie poľa Názov vo formáte "Nick (Lokalita)"
//    - Nick sa získava z linknutého záznamu podľa kategórie
//    - Lokalita sa získava z poľa Lokalita
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var gps = MementoGPS;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Miesta Prepočet",
    version: "2.1.0",

    // Referencie na centrálny config
    fields: {
        place: centralConfig.fields.place,
        common: centralConfig.fields.common,
        client: centralConfig.fields.client,
        supplier: centralConfig.fields.supplier,
        partner: centralConfig.fields.partner,
        employee: centralConfig.fields.employee
    },
    libraries: centralConfig.libraries,
    icons: centralConfig.icons
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.clearLogs(currentEntry, true);

        // Krok 1: Vypočítaj vzdialenosť od východzej adresy
        utils.addDebug(currentEntry, utils.getIcon("calculation") + " KROK 1: Výpočet vzdialenosti");
        var distanceResult = calculateDistance();

        // Krok 2: Vygeneruj a nastav pole Názov
        utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 2: Generovanie názvu");
        var nameResult = generateName();

        utils.addDebug(currentEntry, utils.getIcon("success") + " === PREPOČET DOKONČENÝ ===");

        // Zhrnutie
        var summary = "";
        if (distanceResult.success) {
            summary += "✅ Vzdialenosť: " + distanceResult.distance + " km\n";
        }
        if (nameResult.success) {
            summary += "✅ Názov: " + nameResult.name + "\n";
        }

        if (summary) {
            message(summary);
        }

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// VÝPOČET VZDIALENOSTI
// ==============================================

function calculateDistance() {
    var result = {
        success: false,
        distance: 0
    };

    try {
        // Extrahuj GPS súradnice aktuálneho miesta pomocou MementoGPS
        utils.addDebug(currentEntry, "  📍 Extrakcia GPS aktuálneho miesta...");
        var currentCoords = utils.extractGPSFromPlace(currentEntry);

        if (!currentCoords) {
            utils.addDebug(currentEntry, "  ℹ️ Miesto nemá GPS súradnice - preskakujem výpočet vzdialenosti");
            return result;
        }

        // Získaj východziu adresu z ASISTANTO Defaults
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) {
            utils.addDebug(currentEntry, "  ⚠️ Knižnica ASISTANTO Defaults nenájdená");
            return result;
        }

        var defaultEntry = defaultsLib.lastEntry();
        if (!defaultEntry) {
            utils.addDebug(currentEntry, "  ⚠️ ASISTANTO Defaults neobsahuje záznamy");
            return result;
        }

        // Získaj link na východziu adresu
        var defaultAddressField = "Východzia štart adresa";
        var defaultAddress = utils.safeGetLinks(defaultEntry, defaultAddressField);

        if (!defaultAddress || defaultAddress.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Východzia adresa nie je nastavená");
            return result;
        }

        var defaultPlace = defaultAddress[0];
        var defaultPlaceName = utils.safeGet(defaultPlace, CONFIG.fields.place.name, "Východzia adresa");
        utils.addDebug(currentEntry, "  🏠 Východzia adresa: " + defaultPlaceName);

        // Extrahuj GPS súradnice východzej adresy pomocou MementoGPS
        var defaultCoords = utils.extractGPSFromPlace(defaultPlace);
        if (!defaultCoords) {
            utils.addDebug(currentEntry, "  ⚠️ Nepodarilo sa extrahovať GPS súradnice východzej adresy");
            return result;
        }

        // Vypočítaj vzdialenosť pomocou MementoGPS
        utils.addDebug(currentEntry, "  🧮 Výpočet vzdialenosti...");
        var distanceResult = utils.calculateSegment(defaultCoords, currentCoords, "Vzdialenosť miesta");

        if (!distanceResult.success) {
            utils.addDebug(currentEntry, "  ⚠️ Nepodarilo sa vypočítať vzdialenosť");
            return result;
        }

        var distance = distanceResult.km;
        var method = distanceResult.metoda || "N/A";

        // Zaokrúhli na celé číslo hore
        var roundedDistance = Math.ceil(distance);

        utils.addDebug(currentEntry, "  ✅ Vzdialenosť: " + distance.toFixed(2) + " km (zaokrúhlené: " + roundedDistance + " km)");
        utils.addDebug(currentEntry, "  📊 Metóda: " + method);

        // Ulož vzdialenosť
        utils.safeSet(currentEntry, CONFIG.fields.place.distance, roundedDistance);

        result.success = true;
        result.distance = roundedDistance;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte vzdialenosti: " + error.toString(), "calculateDistance", error);
    }

    return result;
}

// ==============================================
// GENEROVANIE NÁZVU
// ==============================================

function generateName() {
    var result = {
        success: false,
        name: ""
    };

    try {
        // Získaj kategóriu
        var category = utils.safeGet(currentEntry, CONFIG.fields.place.category);
        if (!category) {
            utils.addDebug(currentEntry, "  ℹ️ Kategória nie je nastavená - preskakujem generovanie názvu");
            return result;
        }

        utils.addDebug(currentEntry, "  📋 Kategória: " + category);

        // Získaj Nick z príslušného linku podľa kategórie
        var nick = "";
        var linkFieldName = "";

        switch (category) {
            case "Klient":
                linkFieldName = CONFIG.fields.place.customer;
                var customers = utils.safeGetLinks(currentEntry, linkFieldName);
                if (customers && customers.length > 0) {
                    nick = utils.safeGet(customers[0], CONFIG.fields.client.nick, "");
                }
                break;

            case "Dodávateľ":
                linkFieldName = CONFIG.fields.place.supplier;
                var suppliers = utils.safeGetLinks(currentEntry, linkFieldName);
                if (suppliers && suppliers.length > 0) {
                    nick = utils.safeGet(suppliers[0], CONFIG.fields.supplier.nick, "");
                }
                break;

            case "Partner":
                linkFieldName = CONFIG.fields.place.partner;
                var partners = utils.safeGetLinks(currentEntry, linkFieldName);
                if (partners && partners.length > 0) {
                    nick = utils.safeGet(partners[0], CONFIG.fields.partner.nick, "");
                }
                break;

            case "Zamestnanec":
                linkFieldName = CONFIG.fields.place.employee;
                var employees = utils.safeGetLinks(currentEntry, linkFieldName);
                if (employees && employees.length > 0) {
                    nick = utils.safeGet(employees[0], CONFIG.fields.employee.nick, "");
                }
                break;

            default:
                utils.addDebug(currentEntry, "  ⚠️ Neznáma kategória: " + category);
                return result;
        }

        if (!nick) {
            utils.addDebug(currentEntry, "  ⚠️ Nick nenájdený v linknutom zázname");
            return result;
        }

        utils.addDebug(currentEntry, "  ✅ Nick: " + nick);

        // Získaj Lokalitu
        var locality = utils.safeGet(currentEntry, CONFIG.fields.place.locality, "").trim();
        if (!locality) {
            utils.addDebug(currentEntry, "  ℹ️ Lokalita nie je vyplnená");
            // Názov bude len Nick
            result.name = nick;
        } else {
            utils.addDebug(currentEntry, "  ✅ Lokalita: " + locality);
            // Názov bude Nick (Lokalita)
            result.name = nick + " (" + locality + ")";
        }

        // Ulož názov
        utils.safeSet(currentEntry, CONFIG.fields.place.name, result.name);
        utils.addDebug(currentEntry, "  ✅ Názov nastavený: " + result.name);

        result.success = true;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri generovaní názvu: " + error.toString(), "generateName", error);
    }

    return result;
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

// Extrakcia GPS sa rieši cez utils.extractGPSFromPlace(entry)
// z MementoGPS modulu

// ==============================================
// SPUSTENIE
// ==============================================

main();
