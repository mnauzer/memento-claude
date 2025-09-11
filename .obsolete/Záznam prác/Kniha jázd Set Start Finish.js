// ==============================================
// JEDNODUCHÝ AUTO-LINKOVANIE ŠTART A CIEĽ
// ==============================================
// Trigger: Creating entry, Before saving

// ==============================================
// JEDNODUCHÝ AUTO-LINKOVANIE ŠTART A CIEĽ
// ==============================================
// Trigger: Creating entry, Before saving

function autoLinkStartCiel() {
    var linkSuccess = false;
    
    try {
        // Získaj ASISTANTO Defaults
        var defaultsLib = libByName("ASISTANTO Defaults");
        if (!defaultsLib) {
            message("❌ Knižnica 'ASISTANTO Defaults' neexistuje");
        } else {
            var defaultEntry = defaultsLib.entries()[0];
            if (!defaultEntry) {
                message("❌ Knižnica 'ASISTANTO Defaults' je prázdna");
            } else {
                // Získaj východzie adresy
                var vychodziStart = defaultEntry.field("Východzia štart adresa");
                var vychodziCiel = defaultEntry.field("Východzia cieľová adresa");

                // Získaj aktuálny nový záznam
                var newEntry = entryDefault();

                // Nalinkuj ak existujú
                var linkCount = 0;
                var debugMessage = "Auto-linkovanie " + moment().format("DD.MM.YY HH:mm") + ":\n";

                if (vychodziStart && vychodziStart.length > 0) {
                    try {
                        newEntry.set("Štart", vychodziStart);
                        linkCount++;
                        debugMessage += "✅ Štart nalinkovaný\n";
                    } catch (error) {
                        debugMessage += "❌ Chyba pri linkovaní Štart: " + error + "\n";
                    }
                } else {
                    debugMessage += "⚠️ Žiadny východzi štart\n";
                }

                if (vychodziCiel && vychodziCiel.length > 0) {
                    try {
                        newEntry.set("Cieľ", vychodziCiel);
                        linkCount++;
                        debugMessage += "✅ Cieľ nalinkovaný\n";
                    } catch (error) {
                        debugMessage += "❌ Chyba pri linkovaní Cieľ: " + error + "\n";
                    }
                } else {
                    debugMessage += "⚠️ Žiadny východzi cieľ\n";
                }

                // Ulož debug info
                try {
                    newEntry.set("Debug_Log", debugMessage);
                } catch (debugError) {
                    // Ignoruj chybu debug logu
                }

                debugMessage += "📊 Celkovo nalinkovaných: " + linkCount + " polí";

                // Nastav success flag
                if (linkCount > 0) {
                    linkSuccess = true;
                } else {
                    message("⚠️ Žiadne východzie adresy nenájdené v ASISTANTO Defaults");
                }
            }
        }

    } catch (error) {
        var errorMsg = "❌ Kritická chyba auto-linkovania: " + error.toString();
        message(errorMsg);
        
        try {
            var newEntry = entryDefault();
            newEntry.set("Error_Log", errorMsg + "\nČas: " + moment().format("DD.MM.YY HH:mm:ss"));
        } catch (logError) {
            // Ignoruj chybu logovania
        }
    }
}

// Spustenie scriptu
autoLinkStartCiel();