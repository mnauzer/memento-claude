// ==============================================
// MEMENTO DATABASE - EXTRACT LIBRARY IDS
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// Typ: Debugging/Utility Script | Spustenie: Manual Action
// ==============================================
// 📋 FUNKCIA:
//    - Extrahovanie ID všetkých knižníc v databáze
//    - Vytvorenie formátovaného zoznamu pre .env súbor
//    - Identifikácia kľúčových knižníc používaných v systéme
//    - Export výsledkov pre externe API pripojenie
// ==============================================
// 🔧 POUŽÍVA:
//    - Memento Database SQL API
//    - JavaScript SQL queries
//    - Library metadata access
// 📝 VÝSTUP:
//    - Info pole s formátovaným zoznamom library IDs
//    - .env format pre Python API prístup
// ==============================================

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    scriptName: "Extract Library IDs",
    version: "1.0.0",

    // Kľúčové knižnice ktoré hľadáme (based on MementoConfig.js)
    expectedLibraries: {
        "Materiál": "LIBRARY_ID_MATERIAL",
        "Dochádzka": "LIBRARY_ID_ATTENDANCE",
        "Záznam prác": "LIBRARY_ID_WORK_RECORDS",
        "Kniha jázd": "LIBRARY_ID_VEHICLE_LOGBOOK",
        "Pokladňa": "LIBRARY_ID_CASH_REGISTER",
        "Notifikácie": "LIBRARY_ID_NOTIFICATIONS",
        "ASISTANTO Defaults": "LIBRARY_ID_DEFAULTS",
        "sadzby DPH": "LIBRARY_ID_VAT_RATES",
        "zamestnanci": "LIBRARY_ID_EMPLOYEES",
        "zákazníci": "LIBRARY_ID_CUSTOMERS",
        "projekty": "LIBRARY_ID_PROJECTS",
        "ceny materiálu": "LIBRARY_ID_PRICE_HISTORY",
        "záväzky": "LIBRARY_ID_OBLIGATIONS",
        "vozidlá": "LIBRARY_ID_VEHICLES",
        "ASISTANTO API": "LIBRARY_ID_API_KEYS"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        var output = [];
        output.push("🔗 === MEMENTO DATABASE LIBRARY IDS ===");
        output.push("📅 Extrahované: " + new Date().toLocaleString());
        output.push("🛠️ Script: " + CONFIG.scriptName + " v" + CONFIG.version);
        output.push("");

        // Získanie zoznamu všetkých knižníc
        var libraries = extractAllLibraries();

        if (!libraries || libraries.length === 0) {
            output.push("❌ CHYBA: Žiadne knižnice neboli nájdené!");
            return createResult(output.join("\\n"));
        }

        output.push("📊 POČET KNIŽNÍC: " + libraries.length);
        output.push("");
        output.push("===============================================");
        output.push("📋 VŠETKY KNIŽNICE V DATABÁZE:");
        output.push("===============================================");

        // Zoradenie knižníc podľa názvu
        libraries.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });

        // Výpis všetkých knižníc
        for (var i = 0; i < libraries.length; i++) {
            var lib = libraries[i];
            output.push("• " + lib.name + " (ID: " + lib.id + ")");
        }

        output.push("");
        output.push("===============================================");
        output.push("🔧 .ENV FORMÁT PRE PYTHON API:");
        output.push("===============================================");

        // Generovanie .env formátu
        var envLines = generateEnvFormat(libraries);
        output.push("");
        output.push(envLines.join("\\n"));

        output.push("");
        output.push("===============================================");
        output.push("⚠️ KĽÚČOVÉ KNIŽNICE (KONTROLA):");
        output.push("===============================================");

        // Kontrola kľúčových knižníc
        var missingLibraries = checkExpectedLibraries(libraries);
        if (missingLibraries.length > 0) {
            output.push("");
            output.push("❌ CHÝBAJÚCE KĽÚČOVÉ KNIŽNICE:");
            for (var j = 0; j < missingLibraries.length; j++) {
                output.push("• " + missingLibraries[j]);
            }
        } else {
            output.push("✅ Všetky kľúčové knižnice nájdené!");
        }

        output.push("");
        output.push("===============================================");
        output.push("📝 INŠTRUKCIE:");
        output.push("===============================================");
        output.push("1. Skopírujte .env formát vyššie");
        output.push("2. Nahraďte príslušné hodnoty v .env súbore");
        output.push("3. Pridajte váš Memento API key");
        output.push("4. Otestujte Python API prístup");
        output.push("");
        output.push("✅ EXTRAKCIA DOKONČENÁ");

        return createResult(output.join("\\n"));

    } catch (error) {
        return createResult("❌ KRITICKÁ CHYBA: " + error.toString());
    }
}

// ==============================================
// EXTRAKCIA KNIŽNÍC
// ==============================================

/**
 * Extrahovanie všetkých knižníc z databázy pomocou SQL
 */
function extractAllLibraries() {
    try {
        // Pokus o získanie knižníc cez SQL - rôzne možné názvy tabuliek
        var possibleQueries = [
            "SELECT id, name FROM libraries ORDER BY name",
            "SELECT id, title as name FROM libraries ORDER BY title",
            "SELECT library_id as id, library_name as name FROM libraries ORDER BY library_name",
            "SELECT lib_id as id, lib_name as name FROM libs ORDER BY lib_name"
        ];

        for (var i = 0; i < possibleQueries.length; i++) {
            try {
                var result = sql(possibleQueries[i]);
                var libraries = result.asObjects();
                if (libraries && libraries.length > 0) {
                    return libraries;
                }
            } catch (sqlError) {
                // Pokračuj na ďalší query
                continue;
            }
        }

        // Ak SQL nefunguje, pokús sa použiť alternatívny prístup
        return extractLibrariesAlternative();

    } catch (error) {
        throw new Error("Chyba pri extrakcii knižníc: " + error.toString());
    }
}

/**
 * Alternatívny spôsob extrakcie knižníc
 */
function extractLibrariesAlternative() {
    try {
        // Pokus o získanie informácií cez systémové funkcie
        // Toto je experimentálne - možno nebude fungovať

        var libraries = [];

        // Pokús sa získať library z kontextu alebo globálnych objektov
        // Toto bude závisieť od konkrétnej implementácie Memento

        // Ak máme prístup k library() funkcii
        if (typeof library === 'function') {
            try {
                var currentLib = library();
                if (currentLib && currentLib.id && currentLib.name) {
                    libraries.push({
                        id: currentLib.id,
                        name: currentLib.name
                    });
                }
            } catch (e) {
                // Ignoruj chybu
            }
        }

        // Fallback: vytvor dummy zoznam pre testovanie
        if (libraries.length === 0) {
            libraries = [
                { id: "dummy_1", name: "TEST - Spustite tento script v Memento Database" },
                { id: "dummy_2", name: "TEST - Potrebný SQL prístup k systémovým tabuľkám" }
            ];
        }

        return libraries;

    } catch (error) {
        throw new Error("Alternatívna extrakcia zlyhala: " + error.toString());
    }
}

// ==============================================
// GENEROVANIE VÝSTUPU
// ==============================================

/**
 * Generuje .env formát pre Python API
 */
function generateEnvFormat(libraries) {
    var envLines = [];

    // Pre každú nájdenú knižnicu
    for (var i = 0; i < libraries.length; i++) {
        var lib = libraries[i];
        var envKey = getEnvKeyForLibrary(lib.name);

        if (envKey) {
            envLines.push(envKey + "=" + lib.id);
        } else {
            // Pre neočakávané knižnice vytvor generický kľúč
            var genericKey = "LIBRARY_ID_" + lib.name.toUpperCase()
                .replace(/[^A-Z0-9]/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "");
            envLines.push("# " + genericKey + "=" + lib.id + " # " + lib.name);
        }
    }

    return envLines;
}

/**
 * Získa ENV kľúč pre knižnicu
 */
function getEnvKeyForLibrary(libraryName) {
    return CONFIG.expectedLibraries[libraryName] || null;
}

/**
 * Kontrola kľúčových knižníc
 */
function checkExpectedLibraries(libraries) {
    var foundLibraries = {};

    // Vytvor mapu nájdených knižníc
    for (var i = 0; i < libraries.length; i++) {
        foundLibraries[libraries[i].name] = true;
    }

    // Kontrola chýbajúcich
    var missing = [];
    for (var expectedName in CONFIG.expectedLibraries) {
        if (!foundLibraries[expectedName]) {
            missing.push(expectedName);
        }
    }

    return missing;
}

/**
 * Vytvorenie výsledku
 */
function createResult(message) {
    // Pokús sa nastaviť do info poľa ak existuje
    try {
        if (typeof entry === 'function') {
            var currentEntry = entry();
            if (currentEntry) {
                // Pokús sa nájsť info pole
                var infoFields = ["info", "Info", "INFO", "result", "Result", "output"];

                for (var i = 0; i < infoFields.length; i++) {
                    try {
                        currentEntry.set(infoFields[i], message);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
    } catch (error) {
        // Ignoruj chyby nastavenia
    }

    // Zobraz aj ako dialog
    if (typeof dialog === 'function') {
        dialog("📋 LIBRARY IDS EXTRACTED\\n\\nVýsledok bol uložený do info poľa záznamu.\\n\\nSkopírujte .env formát a použite ho v Python scripte.");
    }

    return message;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();