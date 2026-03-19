// ==============================================
// MEMENTO ID CONFLICT RESOLVER - Riešenie konfliktov ID
// Verzia: 1.0.0 | Dátum: October 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Automatická detekcia a riešenie ID konfliktov v team verzii Memento Database
//    - Kontrola unique constraint pred uložením záznamu
//    - Nájdenie voľného ID čísla pri konflikte
// ==============================================
// 🔧 CHANGELOG v1.0.0:
//    - Prvá verzia modulu pre ID conflict resolution
//    - Funkcia checkAndResolveIDConflict() pre detekciu a opravu konfliktov
//    - Podpora pre int autoincrement ID polia
//    - Optimalizovaný algoritmus (jedna iterácia pre detekciu + max ID)
// ==============================================
// 💡 KED POUŽÍVAŤ:
//    - Team verzia Memento Database (viacero užívateľov)
//    - ID pole typu int, autoincrement +1, unique
//    - Problémy so synchronizáciou a duplicate ID konfliktami
// ==============================================

var MementoIDConflictResolver = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoIDConflictResolver",
        version: "1.1.0",
        author: "ASISTANTO",
        description: "ID conflict detection and resolution for team version",
        dependencies: ["MementoConfig", "MementoCore"],
        provides: ["checkAndResolveIDConflict", "findMaxID", "idExists"],
        status: "stable"
    };

    var version = MODULE_INFO.version;

    // Lazy loading pre závislosti
    var _config = null;
    var _core = null;

    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }

    function getCore() {
        if (!_core && typeof MementoCore !== 'undefined') {
            _core = MementoCore;
        }
        return _core;
    }

    // ==============================================
    // HLAVNÁ FUNKCIA - ID CONFLICT DETECTION & RESOLUTION
    // ==============================================

    /**
     * Skontroluje a vyriesi konflikt ID čísla v zázname
     * Používa sa v onCreate trigger scriptoch (Opening card / Before save phase)
     *
     * Algoritmus:
     * 1. Získa aktuálne ID z entry
     * 2. Iteruje cez existujúce záznamy v knižnici
     * 3. Trackuje maximum ID a hľadá konflikt
     * 4. Ak je konflikt, nastaví nové ID = maxID + 1
     *
     * @param {Entry} entry - Memento entry objekt
     * @param {string} idFieldName - Názov ID poľa (default: "ID")
     * @returns {Object} {
     *   success: boolean,
     *   conflictDetected: boolean,
     *   oldID: number,
     *   newID: number,
     *   error: string
     * }
     */
    function checkAndResolveIDConflict(entry, idFieldName) {
        var result = {
            success: false,
            conflictDetected: false,
            oldID: null,
            newID: null,
            error: null
        };

        try {
            // Default ID field name
            if (!idFieldName) {
                var config = getConfig();
                if (config && config.fields && config.fields.common && config.fields.common.id) {
                    idFieldName = config.fields.common.id;
                } else {
                    idFieldName = "ID";
                }
            }

            // Získaj aktuálne ID z entry
            var currentID = entry.get(idFieldName);
            result.oldID = currentID;

            // Ak ID je null alebo undefined, nastavíme nové
            var needsNewID = (currentID === null || currentID === undefined);

            // Získaj všetky existujúce záznamy v knižnici
            var lib = library();
            var allEntries = lib.entries();

            // Ak nie sú žiadne záznamy, nastav ID = 1
            if (!allEntries || allEntries.length === 0) {
                if (needsNewID || currentID === null || currentID === undefined) {
                    entry.set(idFieldName, 1);
                    result.success = true;
                    result.newID = 1;
                    result.conflictDetected = needsNewID;
                } else {
                    result.success = true;
                    result.newID = currentID;
                }
                return result;
            }

            // Iteruj cez všetky záznamy a trackuj maximum + hľadaj konflikt
            var maxID = 0;
            var conflictFound = false;

            for (var i = 0; i < allEntries.length; i++) {
                var existingEntry = allEntries[i];

                // Skip self (ak entry už existuje v knižnici)
                if (existingEntry.id() === entry.id()) {
                    continue;
                }

                var existingID = existingEntry.get(idFieldName);

                // Trackuj maximum
                if (existingID !== null && existingID !== undefined && existingID > maxID) {
                    maxID = existingID;
                }

                // Hľadaj konflikt
                if (!needsNewID && existingID === currentID) {
                    conflictFound = true;
                    result.conflictDetected = true;
                }
            }

            // Ak je potrebné nové ID (konflikt alebo null)
            if (conflictFound || needsNewID) {
                var newID = maxID + 1;
                entry.set(idFieldName, newID);
                result.success = true;
                result.newID = newID;
                result.conflictDetected = true;

                // Debug log (ak je dostupný)
                var core = getCore();
                if (core && core.addDebug) {
                    var msg = "ID konflikt vyriešený: " + currentID + " → " + newID;
                    core.addDebug(entry, msg);
                }

                return result;
            }

            // Žiadny konflikt
            result.success = true;
            result.newID = currentID;
            return result;

        } catch (error) {
            result.success = false;
            result.error = error.toString();

            // Error log (ak je dostupný)
            var core = getCore();
            if (core && core.addError) {
                core.addError(entry, "ID conflict resolver error: " + error.toString());
            }

            return result;
        }
    }

    /**
     * Nájde najvyššie ID v knižnici
     * Helper funkcia pre testovanie a debugging
     *
     * @param {string} idFieldName - Názov ID poľa
     * @returns {number} Maximum ID v knižnici (0 ak žiadne záznamy)
     */
    function findMaxID(idFieldName) {
        try {
            if (!idFieldName) {
                idFieldName = "ID";
            }

            var lib = library();
            var allEntries = lib.entries();

            if (!allEntries || allEntries.length === 0) {
                return 0;
            }

            var maxID = 0;
            for (var i = 0; i < allEntries.length; i++) {
                var existingID = allEntries[i].get(idFieldName);
                if (existingID !== null && existingID !== undefined && existingID > maxID) {
                    maxID = existingID;
                }
            }

            return maxID;

        } catch (error) {
            return 0;
        }
    }

    /**
     * Skontroluje či existuje záznam s daným ID
     * Helper funkcia pre testovanie a debugging
     *
     * @param {number} id - ID na kontrolu
     * @param {string} idFieldName - Názov ID poľa
     * @returns {boolean} true ak ID existuje v knižnici
     */
    function idExists(id, idFieldName) {
        try {
            if (!idFieldName) {
                idFieldName = "ID";
            }

            var lib = library();
            var allEntries = lib.entries();

            if (!allEntries || allEntries.length === 0) {
                return false;
            }

            for (var i = 0; i < allEntries.length; i++) {
                var existingID = allEntries[i].get(idFieldName);
                if (existingID === id) {
                    return true;
                }
            }

            return false;

        } catch (error) {
            return false;
        }
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module metadata
        info: MODULE_INFO,
        version: version,

        // Hlavná funkcia
        checkAndResolveIDConflict: checkAndResolveIDConflict,

        // Helper funkcie (pre debugging a testovanie)
        findMaxID: findMaxID,
        idExists: idExists
    };
})();
