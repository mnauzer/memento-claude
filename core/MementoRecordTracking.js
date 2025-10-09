// ==============================================
// MEMENTO RECORD TRACKING - Sledovanie záznamov
// Verzia: 1.0.0 | Dátum: October 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Automatické sledovanie vytvorenia a úpravy záznamov
//    - Správa view režimov (Edit, Tlač, Debug)
//    - Zaznamenávanie užívateľov a časov zmien
// ==============================================
// 🔧 CHANGELOG v1.0.0:
//    - Prvá verzia modulu pre sledovanie záznamov
//    - Funkcie pre nastavenie view režimov
//    - Funkcie pre tracking vytvorenia a úpravy
// ==============================================

var MementoRecordTracking = (function() {
    'use strict';

    var version = "1.0.0";

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
    // VIEW REŽIMY
    // ==============================================

    /**
     * Nastaví view režim na "Editácia " (s medzerou!)
     * Používa sa v onCreate a onUpdate trigger scriptoch (Opening card phase)
     *
     * @param {Entry} entry - Memento entry objekt
     * @returns {boolean} true ak sa podarilo nastaviť
     */
    function setEditMode(entry) {
        try {
            var config = getConfig();
            if (!config) {
                return false;
            }

            var viewField = config.fields.common.view;
            var editMode = config.constants.VIEW_MODES.EDIT; // "Editácia " s medzerou!

            entry.set(viewField, editMode);
            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Nastaví view režim na "Tlač"
     * Používa sa v onUpdate trigger scriptoch (Before save phase)
     *
     * @param {Entry} entry - Memento entry objekt
     * @returns {boolean} true ak sa podarilo nastaviť
     */
    function setPrintMode(entry) {
        try {
            var config = getConfig();
            if (!config) {
                return false;
            }

            var viewField = config.fields.common.view;
            var printMode = config.constants.VIEW_MODES.PRINT; // "Tlač"

            entry.set(viewField, printMode);
            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Nastaví view režim na "Debug"
     * Používa sa manuálne v špeciálnych prípadoch
     *
     * @param {Entry} entry - Memento entry objekt
     * @returns {boolean} true ak sa podarilo nastaviť
     */
    function setDebugMode(entry) {
        try {
            var config = getConfig();
            if (!config) {
                return false;
            }

            var viewField = config.fields.common.view;
            var debugMode = config.constants.VIEW_MODES.DEBUG; // "Debug"

            entry.set(viewField, debugMode);
            return true;

        } catch (error) {
            return false;
        }
    }

    // ==============================================
    // TRACKING VYTVORENIA A ÚPRAVY
    // ==============================================

    /**
     * Zaznamená vytvorenie záznamu
     * Nastaví pole "zapísal" na aktuálneho užívateľa a "dátum zápisu" na aktuálny dátum
     * Používa sa v onCreate trigger scriptoch (After save phase)
     *
     * @param {Entry} entry - Memento entry objekt
     * @returns {boolean} true ak sa podarilo zaznamenať
     */
    function trackRecordCreation(entry) {
        try {
            var config = getConfig();
            if (!config) {
                return false;
            }

            var createdByField = config.fields.common.createdBy;
            var createdDateField = config.fields.common.createdDate;

            // Nastav aktuálneho užívateľa
            var currentUser = user();
            entry.set(createdByField, currentUser);

            // Nastav aktuálny dátum
            var now = new Date();
            entry.set(createdDateField, now);

            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Zaznamená úpravu záznamu
     * Nastaví pole "upravil" na aktuálneho užívateľa a "dátum úpravy" na aktuálny dátum
     * Používa sa v onUpdate trigger scriptoch (After save phase)
     *
     * @param {Entry} entry - Memento entry objekt
     * @returns {boolean} true ak sa podarilo zaznamenať
     */
    function trackRecordModification(entry) {
        try {
            var config = getConfig();
            if (!config) {
                return false;
            }

            var modifiedByField = config.fields.common.modifiedBy;
            var modifiedDateField = config.fields.common.modifiedDate;

            // Nastav aktuálneho užívateľa
            var currentUser = user();
            entry.set(modifiedByField, currentUser);

            // Nastav aktuálny dátum
            var now = new Date();
            entry.set(modifiedDateField, now);

            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Kompletná inicializácia nového záznamu
     * Kombinuje setEditMode() a trackRecordCreation()
     *
     * @param {Entry} entry - Memento entry objekt
     * @returns {Object} { success: boolean, editMode: boolean, tracking: boolean }
     */
    function initializeNewRecord(entry) {
        var result = {
            success: false,
            editMode: false,
            tracking: false
        };

        result.editMode = setEditMode(entry);
        result.tracking = trackRecordCreation(entry);
        result.success = result.editMode && result.tracking;

        return result;
    }

    /**
     * Kompletné spracovanie úpravy záznamu
     * Kombinuje setPrintMode() a trackRecordModification()
     *
     * @param {Entry} entry - Memento entry objekt
     * @returns {Object} { success: boolean, printMode: boolean, tracking: boolean }
     */
    function processRecordUpdate(entry) {
        var result = {
            success: false,
            printMode: false,
            tracking: false
        };

        result.printMode = setPrintMode(entry);
        result.tracking = trackRecordModification(entry);
        result.success = result.printMode && result.tracking;

        return result;
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        version: version,

        // View režimy
        setEditMode: setEditMode,
        setPrintMode: setPrintMode,
        setDebugMode: setDebugMode,

        // Tracking funkcií
        trackRecordCreation: trackRecordCreation,
        trackRecordModification: trackRecordModification,

        // Kombinované funkcie
        initializeNewRecord: initializeNewRecord,
        processRecordUpdate: processRecordUpdate
    };
})();
