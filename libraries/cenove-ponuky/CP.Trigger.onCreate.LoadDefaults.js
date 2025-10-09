/**
 * ============================================================================
 * CENOVÉ PONUKY - Trigger Script
 * ============================================================================
 *
 * Názov:       CP.Trigger.onCreate.LoadDefaults
 * Typ:         Trigger (onCreate - "Opening card" / Before Save)
 * Verzia:      1.0.0
 * Dátum:       October 2025
 * Knižnica:    Cenové ponuky (ID: 90RmdjWuk)
 *
 * Popis:
 * Načíta defaultné hodnoty z knižnice ASISTANTO Defaults pri vytvorení nového záznamu.
 * Tento trigger sa spúšťa SYNCHRONNE pred prvým uložením záznamu.
 *
 * Trigger fáza: "Opening card" (synchronous, before save)
 * - Spúšťa sa KEĎ sa otvára formulár nového záznamu
 * - Vykonáva sa PRED prvým uložením do databázy
 * - Načíta a nastaví default hodnoty z ASISTANTO Defaults
 *
 * NAČÍTAVANÉ HODNOTY:
 * 1. Doprava % → z "CP Default % dopravy"
 * 2. Doprava cena za km → z "CP Default cena za km" (linkToEntry)
 * 3. Doprava paušál → z "CP Default paušál dopravy" (linkToEntry)
 * 4. Presun hmôt % → z "CP Default % presunu hmôt"
 * 5. Cena presunu hmôt → z "CP Default cena presunu hmôt"
 *
 * Závislosti:
 * - MementoUtils (exportuje funkcie z MementoCore)
 * - MementoConfig (definície polí)
 * - ASISTANTO Defaults knižnica (ID: KTZ6dsnY9)
 *
 * DÔLEŽITÉ: Všetky CORE moduly musia byť načítané ako Shared Scripts
 * v Memento Database
 *
 * Použitie:
 * 1. Skopíruj tento script do knižnice Cenové ponuky v Memento Database
 * 2. Nastav trigger na: onCreate → "Opening card"
 * 3. Script automaticky načíta default hodnoty z ASISTANTO Defaults
 *
 * ============================================================================
 */

// ==============================================
// IMPORT FUNKCIÍ z MementoUtils
// ==============================================

// MementoUtils exportuje všetky potrebné funkcie
if (typeof MementoUtils === 'undefined') {
    message("❌ CHYBA: MementoUtils nie je načítaný!");
    throw new Error("Missing MementoUtils");
}

var utils = MementoUtils;
var centralConfig = utils.config;

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    scriptName: "Cenové ponuky - Load Defaults",
    version: "1.0.0",

    // Názvy knižníc
    defaultsLibraryName: centralConfig.libraries.defaults || "ASISTANTO Defaults",

    // Názvy polí v Cenových ponukách
    quoteFields: centralConfig.fields.quote,

    // Názvy polí v ASISTANTO Defaults
    defaultsFields: centralConfig.fields.defaults
};

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Získa prvý záznam z knižnice ASISTANTO Defaults
 * @returns {Entry|null} - Prvý záznam alebo null ak knižnica neexistuje
 */
function getDefaultsEntry() {
    try {
        var defaultsLib = libByName(CONFIG.defaultsLibraryName);

        if (!defaultsLib) {
            message("❌ Knižnica " + CONFIG.defaultsLibraryName + " nenájdená!");
            return null;
        }

        var defaultsEntries = defaultsLib.entries();

        if (!defaultsEntries || defaultsEntries.length === 0) {
            message("❌ Knižnica " + CONFIG.defaultsLibraryName + " neobsahuje žiadne záznamy!");
            return null;
        }

        return defaultsEntries[0]; // Vráť prvý záznam

    } catch (error) {
        message("❌ CHYBA pri získavaní ASISTANTO Defaults: " + error.toString());
        return null;
    }
}

/**
 * Načíta a nastaví defaultné hodnoty do cenovej ponuky
 * @param {Entry} currentEntry - Aktuálny záznam cenovej ponuky
 * @param {Entry} defaultsEntry - Záznam z ASISTANTO Defaults
 */
function loadDefaultValues(currentEntry, defaultsEntry) {
    try {
        var loadedCount = 0;

        // 1. Doprava % (double)
        var ridePercentage = utils.safeGet(defaultsEntry, CONFIG.defaultsFields.cpDefaultRidePercentage);
        if (ridePercentage !== null && ridePercentage !== undefined) {
            currentEntry.set(CONFIG.quoteFields.ridePercentage, ridePercentage);
            loadedCount++;
        }

        // 2. Doprava cena za km (linkToEntry - Cenník prác)
        var kmPriceEntries = utils.safeGetLinks(defaultsEntry, CONFIG.defaultsFields.cpDefaultKmPrice);
        if (kmPriceEntries && kmPriceEntries.length > 0) {
            currentEntry.set(CONFIG.quoteFields.kmPrice, kmPriceEntries);
            loadedCount++;
        }

        // 3. Doprava paušál (linkToEntry - Cenník prác)
        var rideFlatRateEntries = utils.safeGetLinks(defaultsEntry, CONFIG.defaultsFields.cpDefaultRideFlatRate);
        if (rideFlatRateEntries && rideFlatRateEntries.length > 0) {
            currentEntry.set(CONFIG.quoteFields.rideFlatRate, rideFlatRateEntries);
            loadedCount++;
        }

        // 4. Presun hmôt % (double)
        var massTransferPercentage = utils.safeGet(defaultsEntry, CONFIG.defaultsFields.cpDefaultMassTransferPercentage);
        if (massTransferPercentage !== null && massTransferPercentage !== undefined) {
            currentEntry.set(CONFIG.quoteFields.massTransferPercentage, massTransferPercentage);
            loadedCount++;
        }

        // 5. Cena presunu hmôt (currency)
        var massTransferPrice = utils.safeGet(defaultsEntry, CONFIG.defaultsFields.cpDefaultMassTransferPrice);
        if (massTransferPrice !== null && massTransferPrice !== undefined) {
            currentEntry.set(CONFIG.quoteFields.massTransferPrice, massTransferPrice);
            loadedCount++;
        }

        // Informuj užívateľa o počte načítaných hodnôt
        if (loadedCount > 0) {
            message("✅ Načítané default hodnoty: " + loadedCount + "/5");
        } else {
            message("⚠️ Žiadne default hodnoty nenájdené v ASISTANTO Defaults");
        }

    } catch (error) {
        message("❌ CHYBA pri načítavaní default hodnôt: " + error.toString());
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

var currentEntry = defaultEntry();

try {
    // 1. Získaj záznam z ASISTANTO Defaults
    var defaultsEntry = getDefaultsEntry();

    if (!defaultsEntry) {
        // Chyba už bola zobrazená v getDefaultsEntry()
        return;
    }

    // 2. Načítaj a nastav default hodnoty
    loadDefaultValues(currentEntry, defaultsEntry);

} catch (error) {
    message("❌ KRITICKÁ CHYBA: " + error.toString());
}
