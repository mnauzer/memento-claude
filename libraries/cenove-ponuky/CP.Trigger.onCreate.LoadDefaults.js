/**
 * ============================================================================
 * CENOVÉ PONUKY - Trigger Script
 * ============================================================================
 *
 * Názov:       CP.Trigger.onCreate.LoadDefaults
 * Typ:         Trigger (onCreate - "Opening card" / Before Save)
 * Verzia:      1.1.0
 * Dátum:       October 2025
 * Knižnica:    Cenové ponuky (ID: 90RmdjWuk)
 *
 * Popis:
 * Načíta defaultné hodnoty z knižnice ASISTANTO Defaults pri vytvorení nového záznamu.
 * Tento trigger sa spúšťa SYNCHRONNE pred prvým uložením záznamu.
 * Všetky debug logy a chybové hlásenia sa zapisujú do ASISTANTO Logs.
 *
 * Trigger fáza: "Opening card" (synchronous, before save)
 * - Spúšťa sa KEĎ sa otvára formulár nového záznamu
 * - Vykonáva sa PRED prvým uložením do databázy
 * - Načíta a nastaví default hodnoty z ASISTANTO Defaults
 * - Vytvorí log záznam v ASISTANTO Logs s detailným priebehom
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
 * - ASISTANTO Logs knižnica (pre logovanie)
 *
 * DÔLEŽITÉ: Všetky CORE moduly musia byť načítané ako Shared Scripts
 * v Memento Database
 *
 * CHANGELOG v1.1.0:
 * - Pridané logovanie do ASISTANTO Logs namiesto message()
 * - Detailné debug logy pre každé pole
 * - Lepšie error handling
 *
 * Použitie:
 * 1. Skopíruj tento script do knižnice Cenové ponuky v Memento Database
 * 2. Nastav trigger na: onCreate → "Opening card"
 * 3. Script automaticky načíta default hodnoty z ASISTANTO Defaults
 * 4. Skontroluj ASISTANTO Logs pre detailné informácie o načítaní
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
    version: "1.1.0",

    // Názvy knižníc
    defaultsLibraryName: centralConfig.libraries.defaults || "ASISTANTO Defaults",
    logsLibrary: centralConfig.libraries.globalLogs || "ASISTANTO Logs",

    // Názvy polí v Cenových ponukách
    quoteFields: centralConfig.fields.quote,

    // Názvy polí v ASISTANTO Defaults
    defaultsFields: centralConfig.fields.defaults,

    // Polia v ASISTANTO Logs
    logFields: {
        date: "date",
        library: "library",
        script: "script",
        debugLog: "Debug_Log",
        errorLog: "Error_Log",
        info: "info"
    }
};

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Vytvorí log záznam v ASISTANTO Logs
 * @returns {Entry|null} - Log záznam alebo null ak knižnica neexistuje
 */
function createLogEntry() {
    try {
        var logsLib = libByName(CONFIG.logsLibrary);
        if (!logsLib) {
            message("❌ Knižnica " + CONFIG.logsLibrary + " neexistuje!");
            return null;
        }

        var newLog = logsLib.create({});

        // Základné polia
        newLog.set(CONFIG.logFields.date, new Date());
        newLog.set(CONFIG.logFields.library, "Cenové ponuky");
        newLog.set(CONFIG.logFields.script, CONFIG.scriptName + " v" + CONFIG.version);

        // Inicializuj log polia
        newLog.set(CONFIG.logFields.debugLog, "");
        newLog.set(CONFIG.logFields.errorLog, "");
        newLog.set(CONFIG.logFields.info, "");

        return newLog;

    } catch (error) {
        message("❌ Kritická chyba pri vytváraní log záznamu: " + error.toString());
        return null;
    }
}

/**
 * Získa prvý záznam z knižnice ASISTANTO Defaults
 * @returns {Entry|null} - Prvý záznam alebo null ak knižnica neexistuje
 */
function getDefaultsEntry(logEntry) {
    try {
        utils.addDebug(logEntry, "Hľadám knižnicu: " + CONFIG.defaultsLibraryName);
        var defaultsLib = libByName(CONFIG.defaultsLibraryName);

        if (!defaultsLib) {
            utils.addError(logEntry, "Knižnica " + CONFIG.defaultsLibraryName + " nenájdená!", "getDefaultsEntry");
            return null;
        }

        utils.addDebug(logEntry, "✓ Knižnica nájdená, získavam záznamy...");
        var defaultsEntries = defaultsLib.entries();

        if (!defaultsEntries || defaultsEntries.length === 0) {
            utils.addError(logEntry, "Knižnica " + CONFIG.defaultsLibraryName + " neobsahuje žiadne záznamy!", "getDefaultsEntry");
            return null;
        }

        utils.addDebug(logEntry, "✓ Nájdených " + defaultsEntries.length + " záznamov, používam prvý");
        return defaultsEntries[0]; // Vráť prvý záznam

    } catch (error) {
        utils.addError(logEntry, "CHYBA pri získavaní ASISTANTO Defaults", "getDefaultsEntry", error);
        return null;
    }
}

/**
 * Načíta a nastaví defaultné hodnoty do cenovej ponuky
 * @param {Entry} currentEntry - Aktuálny záznam cenovej ponuky
 * @param {Entry} defaultsEntry - Záznam z ASISTANTO Defaults
 * @param {Entry} logEntry - Log záznam
 */
function loadDefaultValues(currentEntry, defaultsEntry, logEntry) {
    try {
        var loadedCount = 0;
        utils.addDebug(logEntry, "=== NAČÍTAVAM DEFAULT HODNOTY ===");

        // 1. Doprava % (double)
        var ridePercentageField = CONFIG.defaultsFields.cpDefaultRidePercentage;
        utils.addDebug(logEntry, "1. Doprava % - pole: '" + ridePercentageField + "'");
        var ridePercentage = utils.safeGet(defaultsEntry, ridePercentageField);
        utils.addDebug(logEntry, "   Hodnota: " + (ridePercentage !== null ? ridePercentage : "NULL"));
        if (ridePercentage !== null && ridePercentage !== undefined) {
            currentEntry.set(CONFIG.quoteFields.ridePercentage, ridePercentage);
            utils.addDebug(logEntry, "   ✓ Nastavené");
            loadedCount++;
        } else {
            utils.addDebug(logEntry, "   ✗ Preskočené (prázdne)");
        }

        // 2. Doprava cena za km (linkToEntry - Cenník prác)
        var kmPriceField = CONFIG.defaultsFields.cpDefaultKmPrice;
        utils.addDebug(logEntry, "2. Doprava cena za km - pole: '" + kmPriceField + "'");
        var kmPriceEntries = utils.safeGetLinks(defaultsEntry, kmPriceField);
        utils.addDebug(logEntry, "   Hodnota: " + (kmPriceEntries ? kmPriceEntries.length + " entries" : "NULL"));
        if (kmPriceEntries && kmPriceEntries.length > 0) {
            currentEntry.set(CONFIG.quoteFields.kmPrice, kmPriceEntries);
            utils.addDebug(logEntry, "   ✓ Nastavené");
            loadedCount++;
        } else {
            utils.addDebug(logEntry, "   ✗ Preskočené (prázdne)");
        }

        // 3. Doprava paušál (linkToEntry - Cenník prác)
        var rideFlatRateField = CONFIG.defaultsFields.cpDefaultRideFlatRate;
        utils.addDebug(logEntry, "3. Doprava paušál - pole: '" + rideFlatRateField + "'");
        var rideFlatRateEntries = utils.safeGetLinks(defaultsEntry, rideFlatRateField);
        utils.addDebug(logEntry, "   Hodnota: " + (rideFlatRateEntries ? rideFlatRateEntries.length + " entries" : "NULL"));
        if (rideFlatRateEntries && rideFlatRateEntries.length > 0) {
            currentEntry.set(CONFIG.quoteFields.rideFlatRate, rideFlatRateEntries);
            utils.addDebug(logEntry, "   ✓ Nastavené");
            loadedCount++;
        } else {
            utils.addDebug(logEntry, "   ✗ Preskočené (prázdne)");
        }

        // 4. Presun hmôt % (double)
        var massTransferPercentageField = CONFIG.defaultsFields.cpDefaultMassTransferPercentage;
        utils.addDebug(logEntry, "4. Presun hmôt % - pole: '" + massTransferPercentageField + "'");
        var massTransferPercentage = utils.safeGet(defaultsEntry, massTransferPercentageField);
        utils.addDebug(logEntry, "   Hodnota: " + (massTransferPercentage !== null ? massTransferPercentage : "NULL"));
        if (massTransferPercentage !== null && massTransferPercentage !== undefined) {
            currentEntry.set(CONFIG.quoteFields.massTransferPercentage, massTransferPercentage);
            utils.addDebug(logEntry, "   ✓ Nastavené");
            loadedCount++;
        } else {
            utils.addDebug(logEntry, "   ✗ Preskočené (prázdne)");
        }

        // 5. Cena presunu hmôt (currency)
        var massTransferPriceField = CONFIG.defaultsFields.cpDefaultMassTransferPrice;
        utils.addDebug(logEntry, "5. Cena presunu hmôt - pole: '" + massTransferPriceField + "'");
        var massTransferPrice = utils.safeGet(defaultsEntry, massTransferPriceField);
        utils.addDebug(logEntry, "   Hodnota: " + (massTransferPrice !== null ? massTransferPrice : "NULL"));
        if (massTransferPrice !== null && massTransferPrice !== undefined) {
            currentEntry.set(CONFIG.quoteFields.massTransferPrice, massTransferPrice);
            utils.addDebug(logEntry, "   ✓ Nastavené");
            loadedCount++;
        } else {
            utils.addDebug(logEntry, "   ✗ Preskočené (prázdne)");
        }

        // Informuj užívateľa o počte načítaných hodnôt
        utils.addDebug(logEntry, "=== VÝSLEDOK: " + loadedCount + "/5 načítaných ===");

        if (loadedCount > 0) {
            message("✅ Načítané default hodnoty: " + loadedCount + "/5 (log v ASISTANTO Logs)");
            utils.addInfo(logEntry, "Úspešne načítané hodnoty", {
                loadedCount: loadedCount,
                total: 5
            });
        } else {
            message("⚠️ Žiadne default hodnoty nenájdené (log v ASISTANTO Logs)");
            utils.addError(logEntry, "Žiadne default hodnoty nenájdené v ASISTANTO Defaults", "loadDefaultValues");
        }

    } catch (error) {
        message("❌ CHYBA pri načítavaní default hodnôt (log v ASISTANTO Logs)");
        utils.addError(logEntry, "CHYBA pri načítavaní default hodnôt", "loadDefaultValues", error);
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

var currentEntry = entry();
var logEntry = null;

try {
    // 1. Vytvor log záznam
    logEntry = createLogEntry();
    if (!logEntry) {
        message("❌ Nepodarilo sa vytvoriť log záznam v ASISTANTO Logs");
        // Nemôžeme pokračovať bez logu
        throw new Error("Cannot create log entry");
    }

    utils.addDebug(logEntry, "=== CP.Trigger.onCreate.LoadDefaults v" + CONFIG.version + " ===");
    utils.addDebug(logEntry, "Čas spustenia: " + moment().format("DD.MM.YYYY HH:mm:ss"));

    // 2. Získaj záznam z ASISTANTO Defaults
    var defaultsEntry = getDefaultsEntry(logEntry);

    if (defaultsEntry) {
        // 3. Načítaj a nastav default hodnoty
        loadDefaultValues(currentEntry, defaultsEntry, logEntry);
    } else {
        utils.addError(logEntry, "Nie je možné načítať default hodnoty - ASISTANTO Defaults je nedostupný", "main");
        message("❌ Nie je možné načítať default hodnoty (log v ASISTANTO Logs)");
    }

    utils.addDebug(logEntry, "=== TRIGGER DOKONČENÝ ===");

} catch (error) {
    if (logEntry) {
        utils.addError(logEntry, "KRITICKÁ CHYBA v hlavnej funkcii", "main", error);
    }
    message("❌ KRITICKÁ CHYBA: " + error.toString());
}
