/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT LIBRARY
 * ============================================================================
 *
 * Knižnica:    Univerzálna (použiteľné v akejkoľvek knižnici)
 * Názov:       CP.AutoNumber.Lib
 * Typ:         Number Generation Library (Shared Script)
 * Verzia:      1.0.0
 * Dátum:       October 2025
 *
 * Popis:
 * Knižničná verzia funkcie pre automatické generovanie čísel záznamov.
 * Používa placeholder formát z ASISTANTO Defaults.
 * Univerzálne použiteľné pre akúkoľvek knižnicu.
 *
 * Použitie:
 * ```javascript
 * // V trigger scripte:
 * var result = autoGenerateNumber("Cenové ponuky", "Číslo", "CP Placeholder");
 * if (result.success) {
 *     currentEntry.set("Číslo", result.number);
 *     message("✅ Číslo: " + result.number);
 * } else {
 *     message("❌ " + result.error);
 * }
 * ```
 *
 * Placeholder formát v ASISTANTO Defaults:
 * - YYYY = rok 4-ciferný (2025)
 * - YY = rok 2-ciferný (25)
 * - MM = mesiac 2-ciferný (01-12)
 * - DD = deň 2-ciferný (01-31)
 * - XXX = sekvenčné číslo s padding (001, 002, 003...)
 * - Ostatné znaky = literály
 *
 * Príklady:
 * - "CYYXXX" → C25001, C25002, C25003...
 * - "INV-YYYY-XXXX" → INV-2025-0001, INV-2025-0002...
 * - "ZYYMMXXX" → Z2510001, Z2510002...
 *
 * Závislosti:
 * - ASISTANTO Defaults knižnica (ID: KTZ6dsnY9)
 *
 * ============================================================================
 */

// ==============================================
// GLOBÁLNA FUNKCIA - EXPORT
// ==============================================

/**
 * Vygeneruje ďalšie voľné číslo záznamu podľa placeholdera
 * @param {string} libraryName - Názov knižnice
 * @param {string} numberFieldName - Názov poľa s číslom
 * @param {string} placeholderFieldName - Názov poľa v ASISTANTO Defaults s placeholderom
 * @returns {Object} { success: boolean, number?: string, error?: string }
 */
function autoGenerateNumber(libraryName, numberFieldName, placeholderFieldName) {
    try {
        // 1. Získaj placeholder z ASISTANTO Defaults
        var defaultsLib = libByName("ASISTANTO Defaults");
        if (!defaultsLib) {
            return {
                success: false,
                error: "Knižnica ASISTANTO Defaults nenájdená"
            };
        }

        var defaultsEntries = defaultsLib.entries();
        if (!defaultsEntries || defaultsEntries.length === 0) {
            return {
                success: false,
                error: "ASISTANTO Defaults neobsahuje žiadne záznamy"
            };
        }

        // Posledný záznam obsahuje aktuálne nastavenia
        var defaultsEntry = defaultsEntries[defaultsEntries.length - 1];

        // Debug: Skús rôzne spôsoby prístupu k poliam
        var placeholder = null;
        try {
            placeholder = defaultsEntry.field(placeholderFieldName);
        } catch (e) {
            // Pokus sa použiť get() namiesto field()
            try {
                placeholder = defaultsEntry.get(placeholderFieldName);
            } catch (e2) {
                return {
                    success: false,
                    error: "Chyba pri čítaní poľa '" + placeholderFieldName + "': " + e2.toString()
                };
            }
        }

        if (!placeholder || placeholder === "") {
            return {
                success: false,
                error: "Placeholder '" + placeholderFieldName + "' nie je nastavený v ASISTANTO Defaults (hodnota: " + placeholder + ")"
            };
        }

        // 2. Parsuj placeholder a vygeneruj prefix
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var day = now.getDate();

        var parsedPlaceholder = parsePlaceholder(placeholder, year, month, day);
        if (!parsedPlaceholder.success) {
            return parsedPlaceholder;
        }

        var prefix = parsedPlaceholder.prefix;
        var sequenceLength = parsedPlaceholder.sequenceLength;

        // 3. Získaj knižnicu a všetky záznamy s daným prefixom
        var targetLib = libByName(libraryName);
        if (!targetLib) {
            return {
                success: false,
                error: "Knižnica '" + libraryName + "' nenájdená"
            };
        }

        var allEntries = targetLib.entries();
        var existingNumbers = [];

        // Extrahuj sekvenčné čísla zo všetkých existujúcich záznamov
        for (var i = 0; i < allEntries.length; i++) {
            var entryNumber = allEntries[i].field(numberFieldName);
            if (entryNumber && entryNumber.indexOf(prefix) === 0) {
                // Extrahuj sekvenčnú časť
                var seqPart = entryNumber.substring(prefix.length);
                var seqInt = parseInt(seqPart, 10);
                if (!isNaN(seqInt) && seqInt > 0) {
                    existingNumbers.push(seqInt);
                }
            }
        }

        // 4. Nájdi ďalšie voľné číslo (vyplní aj medzery v sekvencii)
        var nextSeq = findNextAvailableNumber(existingNumbers);

        // 5. Vygeneruj finálne číslo s nulami na začiatku
        var sequenceStr = padLeft(nextSeq.toString(), sequenceLength, '0');
        var newNumber = prefix + sequenceStr;

        return {
            success: true,
            number: newNumber,
            prefix: prefix,
            sequence: nextSeq,
            placeholder: placeholder
        };

    } catch (error) {
        return {
            success: false,
            error: "Chyba pri generovaní čísla: " + error.toString()
        };
    }
}

// ==============================================
// HELPER FUNKCIE
// ==============================================

/**
 * Parsuje placeholder a nahradí dátumové tokeny
 */
function parsePlaceholder(placeholder, year, month, day) {
    try {
        var result = placeholder;

        // Nahraď rok (YYYY musí byť pred YY)
        result = result.replace(/YYYY/g, year.toString());
        result = result.replace(/YY/gi, year.toString().slice(-2));

        // Nahraď mesiac
        result = result.replace(/MM/gi, padLeft(month.toString(), 2, '0'));

        // Nahraď deň
        result = result.replace(/DD/gi, padLeft(day.toString(), 2, '0'));

        // Nájdi sekvenčnú časť (X+)
        var sequenceMatch = result.match(/(X+)/i);
        if (!sequenceMatch) {
            return {
                success: false,
                error: "Placeholder neobsahuje sekvenčnú časť (XXX, XXXX, atď.)"
            };
        }

        var sequenceFormat = sequenceMatch[0];
        var sequenceLength = sequenceFormat.length;

        // Odstráň sekvenčnú časť pre získanie prefixu
        var prefix = result.replace(sequenceFormat, '');

        return {
            success: true,
            prefix: prefix,
            sequenceLength: sequenceLength
        };

    } catch (error) {
        return {
            success: false,
            error: "Chyba pri parsovaní placeholdera: " + error.toString()
        };
    }
}

/**
 * Nájde ďalšie voľné číslo v sekvencii (vrátane vyplnenia medzier)
 */
function findNextAvailableNumber(existingNumbers) {
    if (existingNumbers.length === 0) {
        return 1;
    }

    // Odstráň duplicity a zoraď
    var uniqueNumbers = [];
    for (var i = 0; i < existingNumbers.length; i++) {
        if (uniqueNumbers.indexOf(existingNumbers[i]) === -1) {
            uniqueNumbers.push(existingNumbers[i]);
        }
    }
    uniqueNumbers.sort(function(a, b) { return a - b; });

    // Hľadaj prvú medzeru v sekvencii
    for (var j = 0; j < uniqueNumbers.length; j++) {
        if (uniqueNumbers[j] !== j + 1) {
            return j + 1;
        }
    }

    // Ak nie sú žiadne medzery, vráť max + 1
    return uniqueNumbers[uniqueNumbers.length - 1] + 1;
}

/**
 * Helper funkcia - padding zľava
 */
function padLeft(str, length, char) {
    str = str.toString();
    while (str.length < length) {
        str = char + str;
    }
    return str;
}

// ==============================================
// MODULE EXPORT - Pre explicitný import
// ==============================================

/**
 * Namespace objekt pre explicitný import funkcií
 * Použitie:
 *
 * // V inom scripte:
 * var result = CPAutoNumber.generateNumber("Cenové ponuky", "Číslo", "CP Placeholder");
 *
 * // Alebo priamo:
 * var result = autoGenerateNumber("Cenové ponuky", "Číslo", "CP Placeholder");
 */
var CPAutoNumber = (function() {
    'use strict';

    // Public API
    return {
        // Hlavná funkcia pre generovanie čísel
        generateNumber: autoGenerateNumber,

        // Helper funkcie (pre pokročilé použitie)
        parsePlaceholder: parsePlaceholder,
        findNextAvailableNumber: findNextAvailableNumber,
        padLeft: padLeft,

        // Metadata
        version: "1.0.0",
        description: "Auto-generovanie čísel záznamov s placeholder formátom"
    };
})();
