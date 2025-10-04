// ==============================================
// MEMENTO DATABASE - MIESTA PREPOČET
// Verzia: 2.0.0 | Dátum: október 2025 | Autor: ASISTANTO
// Knižnica: Miesta | Trigger: Before Save
// ==============================================
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
    version: "2.0.0",

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
        // Získaj GPS súradnice aktuálneho miesta
        var currentGPS = utils.safeGet(currentEntry, CONFIG.fields.place.gps);

        if (!currentGPS) {
            utils.addDebug(currentEntry, "  ℹ️ Miesto nemá GPS súradnice - preskakujem výpočet vzdialenosti");
            return result;
        }

        utils.addDebug(currentEntry, "  📍 GPS aktuálneho miesta: " + JSON.stringify(currentGPS));

        // Extrahuj GPS súradnice do formátu {lat, lon}
        var currentCoords = extractGPSCoordinates(currentGPS);
        if (!currentCoords) {
            utils.addDebug(currentEntry, "  ⚠️ Nepodarilo sa extrahovať GPS súradnice");
            return result;
        }

        // Získaj východziu adresu z ASISTANTO Defaults
        var defaultsLib = libByName(CONFIG.libraries.asistantoDefaults);
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

        // Získaj GPS východzej adresy
        var defaultGPS = utils.safeGet(defaultPlace, CONFIG.fields.place.gps);
        if (!defaultGPS) {
            utils.addDebug(currentEntry, "  ⚠️ Východzia adresa nemá GPS súradnice");
            return result;
        }

        var defaultCoords = extractGPSCoordinates(defaultGPS);
        if (!defaultCoords) {
            utils.addDebug(currentEntry, "  ⚠️ Nepodarilo sa extrahovať GPS súradnice východzej adresy");
            return result;
        }

        // Vypočítaj vzdialenosť pomocou MementoGPS
        utils.addDebug(currentEntry, "  🧮 Výpočet vzdialenosti...");
        var distance = gps.calculateAirDistance(defaultCoords, currentCoords);

        // Zaokrúhli na celé číslo hore
        var roundedDistance = Math.ceil(distance);

        utils.addDebug(currentEntry, "  ✅ Vzdialenosť: " + distance.toFixed(2) + " km (zaokrúhlené: " + roundedDistance + " km)");

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
        var locality = utils.safeGet(currentEntry, CONFIG.fields.place.locality, "");
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

/**
 * Extrahuje GPS súradnice do formátu {lat, lon}
 */
function extractGPSCoordinates(gpsValue) {
    try {
        if (!gpsValue) {
            return null;
        }

        var lat = null;
        var lon = null;

        // JSGeolocation objekt má properties lat a lng
        if (typeof gpsValue === 'object' && gpsValue !== null) {
            if (typeof gpsValue.lat !== 'undefined') {
                lat = parseFloat(gpsValue.lat);
            }
            if (typeof gpsValue.lng !== 'undefined') {
                lon = parseFloat(gpsValue.lng);
            } else if (typeof gpsValue.lon !== 'undefined') {
                lon = parseFloat(gpsValue.lon);
            }
        }

        // Validácia
        if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                return { lat: lat, lon: lon };
            }
        }

        return null;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri extrakcii GPS súradníc: " + error.toString(), "extractGPSCoordinates", error);
        return null;
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();
