// ==============================================
// MEMENTO DATABASE - MINIMÁLNY TEST SCRIPT
// Verzia: 1.0 | Dátum: 12.08.2025
// Účel: Základný test bez komplexných API volání
// ==============================================

try {
    // Vyčisti Debug_Log
    currentEntry.set("Debug_Log", "");
    
    // Basic timestamp
    var timestamp = moment().format("HH:mm:ss");
    var log = "";
    
    function addLog(message) {
        log += "[" + timestamp + "] " + message + "\n";
        currentEntry.set("Debug_Log", log);
    }
    
    addLog("🚀 === MINIMÁLNY TEST SCRIPT ===");
    
    // TEST 1: currentEntry
    addLog("TEST 1: currentEntry check...");
    if (currentEntry) {
        addLog("✅ currentEntry OK");
        
        try {
            var entryId = currentEntry.field("ID") || "N/A";
            addLog("   Entry ID: " + entryId);
        } catch (idError) {
            addLog("   ⚠️ ID field error: " + idError.toString());
        }
    } else {
        addLog("❌ currentEntry NEDOSTUPNÝ!");
        throw new Error("currentEntry not available");
    }
    
    // TEST 2: lib() function
    addLog("TEST 2: lib() function check...");
    if (typeof lib === 'function') {
        addLog("✅ lib() function exists");
        
        try {
            var currentLib = lib();
            if (currentLib) {
                addLog("✅ lib() returns object");
                
                // Test entries() method
                try {
                    var entries = currentLib.entries();
                    addLog("✅ entries() works: " + entries.length + " záznamov");
                } catch (entriesError) {
                    addLog("⚠️ entries() error: " + entriesError.toString());
                }
                
            } else {
                addLog("❌ lib() returns null");
            }
        } catch (libError) {
            addLog("❌ lib() call error: " + libError.toString());
        }
    } else {
        addLog("❌ lib() function neexistuje!");
    }
    
    // TEST 3: MementoUtils check  
    addLog("TEST 3: MementoUtils check...");
    if (typeof MementoUtils === 'undefined') {
        addLog("❌ MementoUtils NEDOSTUPNÁ!");
        addLog("   Riešenie: Nahraj MementoUtils.js do JavaScript knižníc");
    } else {
        addLog("✅ MementoUtils dostupná");
        addLog("   Verzia: " + (MementoUtils.version || "neznáma"));
        
        // Test basic function
        if (typeof MementoUtils.addDebug === 'function') {
            addLog("✅ MementoUtils.addDebug() dostupná");
        } else {
            addLog("⚠️ MementoUtils.addDebug() chýba");
        }
        
        if (typeof MementoUtils.safeGet === 'function') {
            addLog("✅ MementoUtils.safeGet() dostupná");
        } else {
            addLog("⚠️ MementoUtils.safeGet() chýba");
        }
    }
    
    // TEST 4: Basic field access
    addLog("TEST 4: Field access test...");
    var basicFields = ["Dátum", "Od", "Do", "Dp", "Zamestnanci"];
    var existingFields = [];
    var missingFields = [];
    
    for (var i = 0; i < basicFields.length; i++) {
        var fieldName = basicFields[i];
        try {
            var fieldValue = currentEntry.field(fieldName);
            existingFields.push(fieldName);
            addLog("✅ Pole '" + fieldName + "': " + (fieldValue ? "HAS_VALUE" : "EMPTY"));
        } catch (fieldError) {
            missingFields.push(fieldName);
            addLog("❌ Pole '" + fieldName + "': NEEXISTUJE");
        }
    }
    
    // TEST 5: libByName test
    addLog("TEST 5: libByName() test...");
    var testLibraries = ["Zamestnanci", "sadzby zamestnancov"];
    
    for (var j = 0; j < testLibraries.length; j++) {
        var libName = testLibraries[j];
        try {
            var testLib = libByName(libName);
            if (testLib) {
                addLog("✅ Knižnica '" + libName + "': EXISTS");
            } else {
                addLog("❌ Knižnica '" + libName + "': NULL");
            }
        } catch (libByNameError) {
            addLog("❌ Knižnica '" + libName + "': ERROR - " + libByNameError.toString());
        }
    }
    
    // FINAL SUMMARY
    addLog("📊 === SÚHRN TESTU ===");
    addLog("✅ Existujúce polia: " + existingFields.length + " (" + existingFields.join(", ") + ")");
    addLog("❌ Chýbajúce polia: " + missingFields.length + " (" + missingFields.join(", ") + ")");
    
    if (existingFields.length === 0) {
        addLog("🚨 PROBLÉM: Žiadne testované polia neexistujú!");
        addLog("💡 RIEŠENIE: Skontroluj názvy polí v Záznam prác knižnici");
        
        if (missingFields.indexOf("Do") >= 0 && missingFields.indexOf("Dp") >= 0) {
            addLog("💡 TIP: Možno máš pole 'Koniec' alebo iný názov namiesto 'Do'/'Dp'");
        }
    }
    
    if (typeof MementoUtils === 'undefined') {
        addLog("🚨 HLAVNÝ PROBLÉM: MementoUtils knižnica chýba!");
        addLog("💡 RIEŠENIE:");
        addLog("   1. Choď do JavaScript knižníc");
        addLog("   2. Vytvor nový záznam s názvom 'MementoUtils'");
        addLog("   3. Vlož MementoUtils v2.1 kód");
        addLog("   4. Ulož a skús znovu");
    }
    
    addLog("✅ === TEST DOKONČENÝ ===");
    
    // Success message
    message("✅ Minimálny test dokončený!\n📋 Všetky výsledky v Debug_Log\n🔍 Pozri Debug_Log pre detaily");
    
} catch (fatalError) {
    // Emergency error handling
    var errorMsg = "💥 FATÁLNA CHYBA: " + fatalError.toString();
    
    try {
        currentEntry.set("Debug_Log", log + errorMsg + "\n");
        currentEntry.set("Error_Log", "[" + moment().format("YYYY-MM-DD HH:mm:ss") + "] " + errorMsg + "\n");
    } catch (logError) {
        // Last resort
        message("💥 FATÁLNA CHYBA!\n\n" + fatalError.toString() + "\n\nCannot write to logs: " + logError.toString());
    }
    
    message("❌ Test zlyhal!\n💥 " + fatalError.toString() + "\n\n📋 Pozri Debug_Log a Error_Log");
}