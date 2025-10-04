// ==============================================
// MEMENTO DATABASE - VÝPOČET VZDIALENOSTI
// ==============================================
// Knižnica: Miesta
// Polia: GPS, Vzdialenosť (Number), view (Choice), Debug_Log (Text/Memo), Error_Log (Text/Memo)
// Linked Library: ASISTANTO Defaults → Východzia adresa (Link to Entry → knižnica Miesta)
// 
// VÝPOČET: GPS aktuálneho miesta → GPS Východzej adresy
// VÝSLEDOK: Vzdialenosť v km (celé číslo, zaokrúhlené hore)
// METÓDA: Haversine formula (orthodromická vzdialenosť)
// 
// PRESNÉ NÁZVY POLÍ:
// - GPS, Vzdialenosť, view
// - V knižnici ASISTANTO Defaults: Východzia adresa
// - V knižnici Miesta: GPS, Názov
// ==============================================

// Načítaj view režim pre konfiguráciu debug
var viewMode = entry().field("view") || "Editácia";

var CONFIG = {
    debug: (viewMode === "Debug"),
    debugFieldName: "Debug_Log",
    errorFieldName: "Error_Log",
    // Nastavenia výpočtu
    earthRadiusKm: 6371,        // Polomer Zeme v km pre Haversine formulu
    defaultsLibraryName: "ASISTANTO Defaults",
    addressFieldName: "Východzia štart adresa",
    distanceFieldName: "Vzdialenosť",
    gpsFieldName: "GPS"
};

var debugMessages = [];
var errorMessages = [];

function debugLog(message) {
    if (CONFIG.debug) {
        var timestamp = new Date().toLocaleTimeString();
        debugMessages.push("[" + timestamp + "] " + message);
    }
}

function errorLog(message, functionName) {
    var timestamp = new Date().toLocaleTimeString();
    var context = functionName ? "[" + functionName + "] " : "";
    errorMessages.push("[" + timestamp + "] ❌ " + context + message);
}

function writeDebugToField() {
    if (CONFIG.debug && debugMessages.length > 0) {
        try {
            entry().set(CONFIG.debugFieldName, debugMessages.join("\n"));
        } catch (error) {
            errorLog("Chyba pri zápise Debug_Log: " + error.toString(), "writeDebugToField");
        }
    }
    
    if (errorMessages.length > 0) {
        try {
            entry().set(CONFIG.errorFieldName, errorMessages.join("\n"));
        } catch (error) {
            message("Error_Log zápis chyba: " + error);
        }
    }
}

// ==============================================
// HELPER FUNKCIE
// ==============================================

function getEntryName(entryObj) {
    var resultName = "Neznámy záznam";
    
    if (entryObj && typeof entryObj.field === 'function') {
        var nameFields = ["Názov", "Nazov", "Name", "name"];
        
        for (var i = 0; i < nameFields.length; i++) {
            try {
                var nameValue = entryObj.field(nameFields[i]);
                if (nameValue && nameValue.length > 0) {
                    resultName = nameValue;
                    break;
                }
            } catch (error) {
                // Pokračuj s ďalším poľom
            }
        }
        
        // Ak nenájde názov, skús ID
        if (resultName === "Neznámy záznam") {
            try {
                var id = null;
                try {
                    id = entryObj.field("ID");
                } catch (e1) {
                    try {
                        id = entryObj.field("id");
                    } catch (e2) {
                        // ID pole neexistuje
                    }
                }
                
                if (id) {
                    resultName = "Záznam #" + id;
                } else {
                    resultName = "Bez názvu";
                }
            } catch (error) {
                resultName = "Bez názvu";
            }
        }
    }
    
    return resultName;
}

// ==============================================
// VÝPOČET VZDIALENOSTI
// ==============================================

function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
    debugLog("=== HAVERSINE VÝPOČET ===");
    debugLog("  🧮 Vstupné súradnice:");
    debugLog("    Od: " + lat1 + "°, " + lng1 + "°");
    debugLog("    Do: " + lat2 + "°, " + lng2 + "°");
    debugLog("  🌍 Polomer Zeme: " + CONFIG.earthRadiusKm + " km");
    
    var R = CONFIG.earthRadiusKm;
    var PI = Math.PI;
    
    // Konverzia stupňov na radiány
    var lat1Rad = lat1 * (PI / 180);
    var lng1Rad = lng1 * (PI / 180);
    var lat2Rad = lat2 * (PI / 180);
    var lng2Rad = lng2 * (PI / 180);
    
    debugLog("  🔄 Radiány:");
    debugLog("    Od: " + lat1Rad.toFixed(6) + ", " + lng1Rad.toFixed(6));
    debugLog("    Do: " + lat2Rad.toFixed(6) + ", " + lng2Rad.toFixed(6));
    
    // Haversine formula
    var dLat = lat2Rad - lat1Rad;
    var dLng = lng2Rad - lng1Rad;
    
    debugLog("  📐 Delty:");
    debugLog("    dLat: " + dLat.toFixed(6));
    debugLog("    dLng: " + dLng.toFixed(6));
    
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
    
    debugLog("  ⚡ Haversine 'a': " + a.toFixed(8));
    
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var distance = R * c;
    
    debugLog("  🎯 Haversine 'c': " + c.toFixed(8));
    debugLog("  📏 Presná vzdialenosť: " + distance.toFixed(3) + " km");
    
    return distance;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function calculateDistance() {
    var currentEntry = entry();
    
    debugLog("=== VÝPOČET VZDIALENOSTI ===");
    debugLog("🚀 View režim: " + viewMode);
    debugLog("🔧 Debug: " + (CONFIG.debug ? "ZAPNUTÝ" : "VYPNUTÝ"));
    try {
        var currentId = currentEntry.field("ID") || currentEntry.field("id") || "neznáme";
        debugLog("📍 Aktuálny záznam ID: " + currentId);
    } catch (error) {
        debugLog("📍 Aktuálny záznam ID: neznáme (pole ID nedostupné)");
    }
    
    // Krok 1: Získaj GPS súradnice aktuálneho záznamu
    debugLog("=== KROK 1: AKTUÁLNE GPS ===");
    var currentGPS = currentEntry.field(CONFIG.gpsFieldName);
    debugLog("🎯 Aktuálne GPS pole obsahuje: " + JSON.stringify(currentGPS));
    
    if (currentGPS) {
        // Parsovanie GPS súradníc aktuálneho záznamu
        debugLog("--- Parsovanie GPS súradníc pre: Aktuálne miesto ---");
        debugLog("  🎯 GPS dáta typ: " + typeof currentGPS);
        debugLog("  📍 GPS dáta hodnota: " + JSON.stringify(currentGPS));
        
        var currentLat = null;
        var currentLng = null;
        var currentLocationParsed = false;
        
        if (typeof currentGPS === 'string' && currentGPS.length > 0) {
            debugLog("  📝 String formát GPS");
            var currentParts = currentGPS.split(',');
            debugLog("  🔍 Rozdelené na časti: " + JSON.stringify(currentParts));
            
            if (currentParts.length === 2) {
                currentLat = parseFloat(currentParts[0].trim());
                currentLng = parseFloat(currentParts[1].trim());
                debugLog("  🧮 Parsované hodnoty - Lat: " + currentLat + ", Lng: " + currentLng);
                
                if (!isNaN(currentLat) && !isNaN(currentLng)) {
                    if (currentLat >= -90 && currentLat <= 90 && currentLng >= -180 && currentLng <= 180) {
                        debugLog("  ✅ GPS súradnice úspešne validované: " + currentLat + "°, " + currentLng + "°");
                        currentLocationParsed = true;
                    } else {
                        errorLog("GPS súradnice mimo platného rozsahu - Lat: " + currentLat + " (rozsah: -90 až 90), Lng: " + currentLng + " (rozsah: -180 až 180)", "calculateDistance");
                    }
                } else {
                    errorLog("Neplatné číselné hodnoty GPS súradníc - Lat: " + currentLat + ", Lng: " + currentLng, "calculateDistance");
                }
            } else {
                errorLog("GPS string nemá správny formát (očakávané 2 časti oddelené čiarkou): " + currentGPS, "calculateDistance");
            }
        } else if (typeof currentGPS === 'object' && currentGPS !== null) {
            debugLog("  🗂️ Objektový formát GPS");
            
            // Skús rôzne property názvy
            if (typeof currentGPS.lat !== 'undefined') {
                currentLat = parseFloat(currentGPS.lat);
                debugLog("  ✅ Našiel currentGPS.lat: " + currentLat);
            }
            if (typeof currentGPS.lon !== 'undefined') {
                currentLng = parseFloat(currentGPS.lon);
                debugLog("  ✅ Našiel currentGPS.lon: " + currentLng);
            }
            if (typeof currentGPS.lng !== 'undefined') {
                currentLng = parseFloat(currentGPS.lng);
                debugLog("  ✅ Našiel currentGPS.lng: " + currentLng);
            }
            if (typeof currentGPS.latitude !== 'undefined') {
                currentLat = parseFloat(currentGPS.latitude);
                debugLog("  ✅ Našiel currentGPS.latitude: " + currentLat);
            }
            if (typeof currentGPS.longitude !== 'undefined') {
                currentLng = parseFloat(currentGPS.longitude);
                debugLog("  ✅ Našiel currentGPS.longitude: " + currentLng);
            }
            
            // Array-like prístup
            if (currentLat === null && currentLng === null && currentGPS.length >= 2) {
                currentLat = parseFloat(currentGPS[0]);
                currentLng = parseFloat(currentGPS[1]);
                debugLog("  📊 Array prístup - [0]: " + currentLat + ", [1]: " + currentLng);
            }
            
            if (currentLat !== null && currentLng !== null && !isNaN(currentLat) && !isNaN(currentLng)) {
                if (currentLat >= -90 && currentLat <= 90 && currentLng >= -180 && currentLng <= 180) {
                    debugLog("  ✅ GPS súradnice úspešne validované: " + currentLat + "°, " + currentLng + "°");
                    currentLocationParsed = true;
                } else {
                    errorLog("GPS súradnice mimo platného rozsahu - Lat: " + currentLat + " (rozsah: -90 až 90), Lng: " + currentLng + " (rozsah: -180 až 180)", "calculateDistance");
                }
            } else {
                errorLog("Neplatné číselné hodnoty GPS súradníc - Lat: " + currentLat + ", Lng: " + currentLng, "calculateDistance");
            }
        } else {
            errorLog("Nerozpoznaný formát GPS súradníc: " + typeof currentGPS, "calculateDistance");
        }
        
        if (currentLocationParsed) {
            // Krok 2: Získaj knižnicu ASISTANTO Defaults
            debugLog("=== KROK 2: ASISTANTO DEFAULTS ===");
            var defaultsLib = libByName(CONFIG.defaultsLibraryName);
            
            if (defaultsLib) {
                debugLog("✅ Knižnica '" + CONFIG.defaultsLibraryName + "' nájdená");
                
                // Krok 3: Získaj posledný záznam z ASISTANTO Defaults
                debugLog("=== KROK 3: POSLEDNÝ ZÁZNAM ===");
                var lastDefaultEntry = defaultsLib.lastEntry();
                
                if (lastDefaultEntry) {
                    try {
                        var lastDefaultId = lastDefaultEntry.field("ID") || lastDefaultEntry.field("id") || "neznáme";
                        debugLog("✅ Posledný záznam ID: " + lastDefaultId);
                    } catch (error) {
                        debugLog("✅ Posledný záznam ID: neznáme (pole ID nedostupné)");
                    }
                    
                    // Krok 4: Získaj link na východziu adresu
                    debugLog("=== KROK 4: VÝCHODZIA ADRESA ===");
                    var defaultAddressLink = lastDefaultEntry.field(CONFIG.addressFieldName);
                    debugLog("🔗 Pole '" + CONFIG.addressFieldName + "' obsahuje: " + JSON.stringify(defaultAddressLink));
                    
                    if (defaultAddressLink && defaultAddressLink.length && defaultAddressLink.length > 0) {
                        debugLog("✅ Nájdených " + defaultAddressLink.length + " link(ov) na východziu adresu");
                        
                        // Krok 5: Získaj GPS súradnice východzej adresy
                        debugLog("=== KROK 5: GPS VÝCHODZEJ ADRESY ===");
                        var defaultLocationEntry = defaultAddressLink[0]; // Použij prvý link
                        var entryName = getEntryName(defaultLocationEntry);
                        debugLog("🎯 Používam prvý link - záznam: " + entryName);
                        
                        var defaultGPS = defaultLocationEntry.field(CONFIG.gpsFieldName);
                        debugLog("📍 GPS východzej adresy: " + JSON.stringify(defaultGPS));
                        
                        if (defaultGPS) {
                            // Parsovanie GPS súradníc východzej adresy
                            debugLog("--- Parsovanie GPS súradníc pre: " + entryName + " ---");
                            debugLog("  🎯 GPS dáta typ: " + typeof defaultGPS);
                            debugLog("  📍 GPS dáta hodnota: " + JSON.stringify(defaultGPS));
                            
                            var defaultLat = null;
                            var defaultLng = null;
                            var defaultLocationParsed = false;
                            
                            if (typeof defaultGPS === 'string' && defaultGPS.length > 0) {
                                debugLog("  📝 String formát GPS");
                                var defaultParts = defaultGPS.split(',');
                                debugLog("  🔍 Rozdelené na časti: " + JSON.stringify(defaultParts));
                                
                                if (defaultParts.length === 2) {
                                    defaultLat = parseFloat(defaultParts[0].trim());
                                    defaultLng = parseFloat(defaultParts[1].trim());
                                    debugLog("  🧮 Parsované hodnoty - Lat: " + defaultLat + ", Lng: " + defaultLng);
                                    
                                    if (!isNaN(defaultLat) && !isNaN(defaultLng)) {
                                        if (defaultLat >= -90 && defaultLat <= 90 && defaultLng >= -180 && defaultLng <= 180) {
                                            debugLog("  ✅ GPS súradnice úspešne validované: " + defaultLat + "°, " + defaultLng + "°");
                                            defaultLocationParsed = true;
                                        } else {
                                            errorLog("GPS súradnice mimo platného rozsahu - Lat: " + defaultLat + " (rozsah: -90 až 90), Lng: " + defaultLng + " (rozsah: -180 až 180)", "calculateDistance");
                                        }
                                    } else {
                                        errorLog("Neplatné číselné hodnoty GPS súradníc - Lat: " + defaultLat + ", Lng: " + defaultLng, "calculateDistance");
                                    }
                                } else {
                                    errorLog("GPS string nemá správny formát (očakávané 2 časti oddelené čiarkou): " + defaultGPS, "calculateDistance");
                                }
                            } else if (typeof defaultGPS === 'object' && defaultGPS !== null) {
                                debugLog("  🗂️ Objektový formát GPS");
                                
                                // Skús rôzne property názvy
                                if (typeof defaultGPS.lat !== 'undefined') {
                                    defaultLat = parseFloat(defaultGPS.lat);
                                    debugLog("  ✅ Našiel defaultGPS.lat: " + defaultLat);
                                }
                                if (typeof defaultGPS.lon !== 'undefined') {
                                    defaultLng = parseFloat(defaultGPS.lon);
                                    debugLog("  ✅ Našiel defaultGPS.lon: " + defaultLng);
                                }
                                if (typeof defaultGPS.lng !== 'undefined') {
                                    defaultLng = parseFloat(defaultGPS.lng);
                                    debugLog("  ✅ Našiel defaultGPS.lng: " + defaultLng);
                                }
                                if (typeof defaultGPS.latitude !== 'undefined') {
                                    defaultLat = parseFloat(defaultGPS.latitude);
                                    debugLog("  ✅ Našiel defaultGPS.latitude: " + defaultLat);
                                }
                                if (typeof defaultGPS.longitude !== 'undefined') {
                                    defaultLng = parseFloat(defaultGPS.longitude);
                                    debugLog("  ✅ Našiel defaultGPS.longitude: " + defaultLng);
                                }
                                
                                // Array-like prístup
                                if (defaultLat === null && defaultLng === null && defaultGPS.length >= 2) {
                                    defaultLat = parseFloat(defaultGPS[0]);
                                    defaultLng = parseFloat(defaultGPS[1]);
                                    debugLog("  📊 Array prístup - [0]: " + defaultLat + ", [1]: " + defaultLng);
                                }
                                
                                if (defaultLat !== null && defaultLng !== null && !isNaN(defaultLat) && !isNaN(defaultLng)) {
                                    if (defaultLat >= -90 && defaultLat <= 90 && defaultLng >= -180 && defaultLng <= 180) {
                                        debugLog("  ✅ GPS súradnice úspešne validované: " + defaultLat + "°, " + defaultLng + "°");
                                        defaultLocationParsed = true;
                                    } else {
                                        errorLog("GPS súradnice mimo platného rozsahu - Lat: " + defaultLat + " (rozsah: -90 až 90), Lng: " + defaultLng + " (rozsah: -180 až 180)", "calculateDistance");
                                    }
                                } else {
                                    errorLog("Neplatné číselné hodnoty GPS súradníc - Lat: " + defaultLat + ", Lng: " + defaultLng, "calculateDistance");
                                }
                            } else {
                                errorLog("Nerozpoznaný formát GPS súradníc: " + typeof defaultGPS, "calculateDistance");
                            }
                            
                            if (defaultLocationParsed) {
                                // Krok 6: Vypočítaj vzdialenosť
                                debugLog("=== KROK 6: VÝPOČET VZDIALENOSTI ===");
                                debugLog("📏 Výpočet vzdialenosti medzi:");
                                debugLog("  🏠 " + entryName + " (" + defaultLat + "°, " + defaultLng + "°)");
                                debugLog("  📍 Aktuálne miesto (" + currentLat + "°, " + currentLng + "°)");
                                
                                var preciseDistance = calculateHaversineDistance(
                                    defaultLat, defaultLng,
                                    currentLat, currentLng
                                );
                                
                                // Zaokrúhli na jednotky hore
                                var roundedDistance = Math.ceil(preciseDistance);
                                debugLog("  🎯 Presná vzdialenosť: " + preciseDistance.toFixed(3) + " km");
                                debugLog("  📊 Zaokrúhlená vzdialenosť (Math.ceil): " + roundedDistance + " km");
                                
                                // Krok 7: Ulož výsledok
                                debugLog("=== KROK 7: ULOŽENIE VÝSLEDKU ===");
                                try {
                                    currentEntry.set(CONFIG.distanceFieldName, roundedDistance);
                                    debugLog("✅ Vzdialenosť uložená do poľa '" + CONFIG.distanceFieldName + "': " + roundedDistance + " km");
                                    
                                    debugLog("=== DOKONČENÉ ===");
                                    debugLog("🎉 Výpočet vzdialenosti úspešne dokončený");
                                    
                                    writeDebugToField();
                                    
                                    // Zostavy úspešnú správu
                                    var messageText = "✅ ÚSPECH!\n\n";
                                    messageText += "📏 Vzdialenosť: " + roundedDistance + " km\n";
                                    messageText += "🎯 Presne: " + preciseDistance.toFixed(2) + " km (zaokrúhlené hore)\n\n";
                                    messageText += "🗺️ Trasa:\n";
                                    messageText += "🏠 Od: " + entryName + "\n";
                                    messageText += "📍 Do: Aktuálne miesto\n\n";
                                    messageText += "🧮 Metóda: Haversine formula (orthodromická vzdialenosť)\n";
                                    messageText += "🌍 Polomer Zeme: " + CONFIG.earthRadiusKm + " km";
                                    
                                    if (!CONFIG.debug) {
                                        messageText += "\n\n💡 Pre debug info nastavte view = 'Debug'";
                                    }
                                    
                                    message(messageText);
                                    
                                } catch (error) {
                                    errorLog("Chyba pri uložení do poľa '" + CONFIG.distanceFieldName + "': " + error.toString(), "calculateDistance");
                                    writeDebugToField();
                                    message("❌ CHYBA: Nepodarilo sa uložiť výsledok!\n\nSkontrolujte pole '" + CONFIG.distanceFieldName + "' v knižnici");
                                }
                            } else {
                                writeDebugToField();
                                message("❌ CHYBA: Neplatné GPS súradnice východzej adresy!\n\nSkontrolujte formát GPS súradníc v zázname '" + entryName + "'");
                            }
                        } else {
                            errorLog("Východzia adresa nemá GPS súradnice v poli '" + CONFIG.gpsFieldName + "'", "calculateDistance");
                            writeDebugToField();
                            message("❌ CHYBA: Východzia adresa nemá GPS súradnice!\n\nV zázname '" + entryName + "' nastavte pole '" + CONFIG.gpsFieldName + "'");
                        }
                    } else {
                        errorLog("Pole '" + CONFIG.addressFieldName + "' je prázdne alebo neexistuje", "calculateDistance");
                        writeDebugToField();
                        message("❌ CHYBA: Východzia adresa nie je nastavená!\n\nV knižnici '" + CONFIG.defaultsLibraryName + "' nastavte pole '" + CONFIG.addressFieldName + "'");
                    }
                } else {
                    errorLog("Knižnica '" + CONFIG.defaultsLibraryName + "' neobsahuje žiadne záznamy", "calculateDistance");
                    writeDebugToField();
                    message("❌ CHYBA: Knižnica '" + CONFIG.defaultsLibraryName + "' je prázdna!\n\nPridajte aspoň jeden záznam s východzou adresou");
                }
            } else {
                errorLog("Knižnica '" + CONFIG.defaultsLibraryName + "' nebola nájdená", "calculateDistance");
                writeDebugToField();
                message("❌ CHYBA: Knižnica '" + CONFIG.defaultsLibraryName + "' neexistuje!\n\nSkontrolujte názov knižnice");
            }
        } else {
            writeDebugToField();
            message("❌ CHYBA: Neplatné GPS súradnice aktuálneho záznamu!\n\nSkontrolujte formát GPS súradníc");
        }
    } else {
        errorLog("Aktuálny záznam nemá GPS súradnice v poli '" + CONFIG.gpsFieldName + "'", "calculateDistance");
        writeDebugToField();
        message("❌ CHYBA: Aktuálny záznam nemá GPS súradnice!\n\nSkontrolujte pole '" + CONFIG.gpsFieldName + "'");
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

debugLog("🚀 SPÚŠŤAM VÝPOČET VZDIALENOSTI");
debugLog("View režim: " + viewMode + " (debug " + (CONFIG.debug ? "ZAPNUTÝ" : "VYPNUTÝ") + ")");

try {
    calculateDistance();
} catch (error) {
    errorLog("KRITICKÁ CHYBA v hlavnom programe: " + error.toString(), "main");
    writeDebugToField();
    message("❌ KRITICKÁ CHYBA: " + error + "\n\nPozrite Error_Log pre detaily");
}