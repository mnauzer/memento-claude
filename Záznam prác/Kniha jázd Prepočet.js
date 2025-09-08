// ==============================================
// MEMENTO DATABASE - KNIHA JÁZD (ROUTE CALCULATION & PAYROLL) - FIXED
// ==============================================
// Knižnica: Kniha jázd
// Účel: Automatický prepočet vzdialenosti, času jazdy a miezd posádky s atribútmi zastávok
// 
// OPRAVY v tejto verzii:
// - Pridaná funkcia getDefaultZdrzanie()
// - Pridaná funkcia convertDurationToHours()
// - Opravená logika nastavenia default zdržania len ak je prázdne alebo 0
// - Lepší error handling pre Duration atribúty
// 
// POLIA V KNIŽNICI "Kniha jázd":
// - Štart (Link to Entry → Miesta) - začiatok trasy
// - Zastávky (Link to Entry → Miesta) - zastávky na trase  
//   ↳ atribúty: "trvanie" (Duration), "zdržanie" (Duration), "km" (Number)
// - Cieľ (Link to Entry → Miesta) - koniec trasy
//   ↳ atribúty: "trvanie" (Duration), "km" (Number)
// - Km (Number) - vypočítaná vzdialenosť
// - Čas jazdy (Number) - vypočítaný čas jazdy bez zastávok
// - Čas na zastávkach (Number) - súčet zdržaní na zastávkach
// - Celkový čas (Number) - čas jazdy + čas na zastávkach
// - Posádka (Link to Entry → Zamestnanci) - členovia posádky
// - Šofér (Link to Entry → Zamestnanci) - šofér vozidla
// - Dátum (Date) - dátum jazdy
// - Mzdové náklady (Number) - vypočítané mzdy posádky na základe celkového času
// - Debug_Log (Text/Memo) - debug informácie
// - Error_Log (Text/Memo) - chyby a problémy
// 
// LINKED KNIŽNICE:
// - "Miesta": GPS, Názov
// - "Zamestnanci": Meno  
// - "sadzby zamestnancov": Zamestnanec (Link to Entry), Platnosť od, Sadzba
// - "ASISTANTO Defaults": Default zdržanie (Duration)
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();
// Konfigurácia scriptu
var CONFIG = {
    // Debug nastavenia
    debug: true, // VŽDY aktívny debug
    debugFieldName: "Debug_Log",
    errorFieldName: "Error_Log",
    
    // Názvy knižníc
    sadzbyLibrary: "sadzby zamestnancov",
    miestalibrary: "Miesta",
    zamestnancilibrary: "Zamestnanci",
    defaultsLibrary: "ASISTANTO Defaults",
    
    // Názvy polí - knižnica "Kniha jázd"
    fields: centralConfig.bookOfRides,
    
    // Názvy atribútov
    attributes: {
        trvanie: "trvanie",     // čas jazdy do tohto bodu
        zdrzanie: "zdržanie",   // čas strávený na zastávke
        km: "km"                // vzdialenosť do tohto bodu
    },
    
    // Názvy polí - knižnica "Miesta"
    miestalFields: {
        gps: "GPS",
        nazov: "Názov"
    },
    
    // Názvy polí - knižnica "sadzby zamestnancov"
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    },
    
    // Názvy polí - knižnica "Zamestnanci"
    zamestnancilFields: {
        meno: "Meno"
    },
    
    // Názvy polí - knižnica "ASISTANTO Defaults"
    defaults: {
        defaultZdrzanie: "Default zdržanie"  // Duration pole, 10 min
    },
    
    // OSRM API konfigurácia
    useOSRM: true,
    osrmServers: [
        "http://router.project-osrm.org/route/v1/driving/",
        "https://routing.openstreetmap.de/routed-car/route/v1/driving/",
        "http://osrm.valhalla.mapzen.com/route/v1/driving/"
    ],
    osrmTimeout: 15000,
    maxRetries: 2,
    minApiInterval: 100, // ms medzi API volaniami
    
    // Fallback nastavenia
    averageSpeedKmh: 50,        // Priemerná rýchlosť
    cityDelayMinutes: 5,        // Fallback zdržanie na zastávke v minútach
    trafficMultiplier: 1.2,     // Faktor pre dopravné zápchy
    
    // Cache nastavenia
    enableCaching: true,
    cacheTimeout: 300000        // 5 minút v ms
};

// Globálne premenné pre logging a performance
var debugLog = [];
var errorLog = [];
var routeCache = {};
var lastApiCall = 0;
var performanceMetrics = {
    osrmSuccessCount: 0,
    totalApiCalls: 0,
    totalResponseTime: 0,
    errorCount: 0
};

// ==============================================
// DEBUG A ERROR LOGGING SYSTÉM
// ==============================================

function addDebug(message) {
    // Debug log sa vytvára VŽDY
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    debugLog.push("[" + timestamp + "] " + message);
}

function addError(message, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    var prefix = location ? "[" + location + "] " : "";
    errorLog.push("[" + timestamp + "] ❌ " + prefix + message);
    performanceMetrics.errorCount++;
}

function logPerformanceMetrics() {
    if (performanceMetrics.totalApiCalls > 0) {
        var successRate = (performanceMetrics.osrmSuccessCount / performanceMetrics.totalApiCalls * 100).toFixed(1);
        var avgResponseTime = (performanceMetrics.totalResponseTime / performanceMetrics.totalApiCalls).toFixed(0);
        var errorRate = (performanceMetrics.errorCount / performanceMetrics.totalApiCalls * 100).toFixed(1);
        
        addDebug("📊 PERFORMANCE METRICS:");
        addDebug("  OSRM úspešnosť: " + successRate + "% (" + performanceMetrics.osrmSuccessCount + "/" + performanceMetrics.totalApiCalls + ")");
        addDebug("  Priemerný response time: " + avgResponseTime + "ms");
        addDebug("  Error rate: " + errorRate + "%");
    }
}

function saveLogs() {
    var currentEntry = entry();
    
    // Pridaj performance metrics na koniec debug logu
    logPerformanceMetrics();
    
    // Vždy ulož debug log
    try {
        currentEntry.set(CONFIG.debugFieldName, debugLog.join("\n"));
    } catch (e) {
        // Ignoruj chybu ukladania debug logu
    }
    
    try {
        currentEntry.set(CONFIG.errorFieldName, errorLog.join("\n"));
    } catch (e) {
        // Ignoruj chybu ukladania error logu  
    }
}

// ==============================================
// VALIDAČNÉ A POMOCNÉ FUNKCIE
// ==============================================

function roundTimeToQuarter(timeHours) {
    // Zaokrúhli čas na 15 min hore (0.25h)
    return Math.ceil(timeHours * 4) / 4;
}

function convertHoursToDuration(hours) {
    // Konvertuj hodiny na milisekundy pre Duration typ
    // Duration v Memento = milisekundy
    return Math.round(hours * 60 * 60 * 1000);
}

function convertDurationToHours(duration) {
    // Konvertuj Duration (milisekundy) na hodiny
    if (!duration || isNaN(duration)) {
        return 0;
    }
    return duration / (60 * 60 * 1000);
}

function convertHoursToTimeString(hours) {
    // Konvertuj hodiny na HH:MM formát
    var totalMinutes = Math.round(hours * 60);
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}

function validateGPSCoordinates(lat, lon) {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
        return false;
    }
    if (isNaN(lat) || isNaN(lon)) {
        return false;
    }
    if (lat < -90 || lat > 90) {
        return false;
    }
    if (lon < -180 || lon > 180) {
        return false;
    }
    return true;
}

function sanitizeApiInput(value) {
    if (typeof value === 'number') {
        return Math.round(value * 1000000) / 1000000; // 6 desatinných miest max
    }
    return value;
}

function rateLimitedDelay() {
    var now = new Date().getTime();
    var timeSinceLastCall = now - lastApiCall;
    
    if (timeSinceLastCall < CONFIG.minApiInterval) {
        var delayNeeded = CONFIG.minApiInterval - timeSinceLastCall;
        addDebug("⏳ Rate limiting delay: " + delayNeeded + "ms");
    }
    lastApiCall = now;
}

// ==============================================
// NOVÁ FUNKCIA PRE ZÍSKANIE DEFAULT ZDRŽANIA
// ==============================================

function getDefaultZdrzanie() {
    addDebug("🔍 === ZÍSKAVAM DEFAULT ZDRŽANIE ===");
    
    try {
        var defaultsLib = libByName(CONFIG.defaultsLibrary);
        if (!defaultsLib) {
            addError("Knižnica '" + CONFIG.defaultsLibrary + "' neexistuje", "getDefaultZdrzanie");
            return CONFIG.cityDelayMinutes / 60; // Fallback na konfiguráciu
        }
        
        var defaultEntry = defaultsLib.lastEntry();
        if (!defaultEntry) {
            addError("Knižnica '" + CONFIG.defaultsLibrary + "' je prázdna", "getDefaultZdrzanie");
            return CONFIG.cityDelayMinutes / 60; // Fallback na konfiguráciu
        }
        
        var defaultZdrzanieDuration = defaultEntry.field(CONFIG.defaults.defaultZdrzanie);
        if (!defaultZdrzanieDuration) {
            addError("Pole '" + CONFIG.defaults.defaultZdrzanie + "' je prázdne", "getDefaultZdrzanie");
            return CONFIG.cityDelayMinutes / 60; // Fallback na konfiguráciu
        }
        
        addDebug("  📋 Našiel default zdržanie Duration: " + defaultZdrzanieDuration + " ms");
        
        // Konvertuj Duration na hodiny
        var defaultZdrztanieHours = convertDurationToHours(defaultZdrzanieDuration);
        var defaultZdrztanieMinutes = defaultZdrztanieHours * 60;
        
        addDebug("  ✅ Default zdržanie: " + defaultZdrztanieMinutes.toFixed(0) + " min (" + defaultZdrztanieHours.toFixed(3) + " h)");
        
        return defaultZdrztanieHours;
        
    } catch (error) {
        addError("Chyba pri získavaní default zdržania: " + error.toString(), "getDefaultZdrzanie");
        var fallbackHours = CONFIG.cityDelayMinutes / 60;
        addDebug("  🔄 Používam fallback: " + CONFIG.cityDelayMinutes + " min (" + fallbackHours.toFixed(3) + " h)");
        return fallbackHours;
    }
}

function isZdrztanieEmpty(zdrztanieValue) {
    // Skontroluj či je zdržanie prázdne alebo 0
    if (zdrztanieValue === null || zdrztanieValue === undefined) {
        return true;
    }
    
    if (typeof zdrztanieValue === 'number') {
        return zdrztanieValue === 0 || isNaN(zdrztanieValue);
    }
    
    if (typeof zdrztanieValue === 'string') {
        return zdrztanieValue === "" || zdrztanieValue === "00:00" || zdrztanieValue === "0:00";
    }
    
    return false;
}

// ==============================================
// CACHE SYSTÉM PRE OPTIMALIZÁCIU
// ==============================================

function getCacheKey(fromLat, fromLon, toLat, toLon, type) {
    var lat1 = sanitizeApiInput(fromLat);
    var lon1 = sanitizeApiInput(fromLon);
    var lat2 = sanitizeApiInput(toLat);
    var lon2 = sanitizeApiInput(toLon);
    return lat1 + "," + lon1 + "→" + lat2 + "," + lon2 + ":" + type;
}

function getCachedResult(cacheKey) {
    if (!CONFIG.enableCaching) return null;
    
    var cached = routeCache[cacheKey];
    if (cached) {
        var age = new Date().getTime() - cached.timestamp;
        if (age < CONFIG.cacheTimeout) {
            addDebug("📋 Cache hit: " + cacheKey);
            return cached.data;
        } else {
            addDebug("📋 Cache expired: " + cacheKey);
            delete routeCache[cacheKey];
        }
    }
    return null;
}

function setCachedResult(cacheKey, data) {
    if (!CONFIG.enableCaching) return;
    
    routeCache[cacheKey] = {
        data: data,
        timestamp: new Date().getTime()
    };
    addDebug("📋 Cache set: " + cacheKey);
}

// ==============================================
// GPS EXTRAKCIA A SPRACOVANIE
// ==============================================

function extractGPSFromEntry(entryObj, pointType, pointName) {
    addDebug("--- Spracovávam " + pointType + ": " + pointName + " ---");
    
    if (!entryObj) {
        addError(pointType + " (" + pointName + "): Entry objekt je null", "extractGPSFromEntry");
        return null;
    }
    
    // Skús prístup k entry objektu
    var hasFieldMethod = false;
    try {
        if (typeof entryObj.field === 'function') {
            addDebug("  ✅ Priamy prístup k entry objektu");
            hasFieldMethod = true;
        }
    } catch (methodError) {
        addDebug("  ❌ Chyba pri kontrole .field() metódy: " + methodError);
    }
    
    if (!hasFieldMethod) {
        addError(pointType + " (" + pointName + "): Objekt nemá .field() metódu", "extractGPSFromEntry");
        return null;
    }
    
    var gpsFieldNames = [CONFIG.miestalFields.gps, "Gps", "gps"];
    
    for (var f = 0; f < gpsFieldNames.length; f++) {
        var fieldName = gpsFieldNames[f];
        
        try {
            var gpsLocation = entryObj.field(fieldName);
            
            if (gpsLocation) {
                addDebug("  🎯 Našiel GPS pole '" + fieldName + "': " + typeof gpsLocation);
                
                var lat = null, lon = null;
                
                // Detailná analýza GPS objektu
                if (typeof gpsLocation === 'object' && gpsLocation !== null) {
                    try {
                        // Výpis dostupných keys pre debug
                        var objKeys = [];
                        for (var key in gpsLocation) {
                            objKeys.push(key);
                        }
                        addDebug("    GPS object keys: " + objKeys.join(", "));
                        
                        // Štandardné properties
                        if (typeof gpsLocation.lat !== 'undefined') {
                            lat = gpsLocation.lat;
                            addDebug("    Našiel .lat property: " + lat);
                        }
                        if (typeof gpsLocation.lon !== 'undefined') {
                            lon = gpsLocation.lon;
                            addDebug("    Našiel .lon property: " + lon);
                        }
                        if (typeof gpsLocation.lng !== 'undefined') {
                            lon = gpsLocation.lng;
                            addDebug("    Našiel .lng property: " + lon);
                        }
                        if (typeof gpsLocation.latitude !== 'undefined') {
                            lat = gpsLocation.latitude;
                            addDebug("    Našiel .latitude property: " + lat);
                        }
                        if (typeof gpsLocation.longitude !== 'undefined') {
                            lon = gpsLocation.longitude;
                            addDebug("    Našiel .longitude property: " + lon);
                        }
                        
                        // Methods
                        if (!lat && typeof gpsLocation.lat === 'function') {
                            lat = gpsLocation.lat();
                            addDebug("    Volal .lat() method: " + lat);
                        }
                        if (!lon && typeof gpsLocation.lon === 'function') {
                            lon = gpsLocation.lon();
                            addDebug("    Volal .lon() method: " + lon);
                        }
                        
                        // Array-like prístup
                        if (!lat && !lon && gpsLocation.length >= 2) {
                            lat = gpsLocation[0];
                            lon = gpsLocation[1];
                            addDebug("    Array-like GPS: [" + lat + ", " + lon + "]");
                        }
                    } catch (accessError) {
                        addDebug("    Chyba pri prístupe k GPS properties: " + accessError);
                    }
                }
                // String formát "48.123,19.456"
                else if (typeof gpsLocation === 'string' && gpsLocation.length > 0) {
                    addDebug("    GPS string: '" + gpsLocation + "'");
                    var parts = gpsLocation.split(',');
                    if (parts.length >= 2) {
                        lat = parseFloat(parts[0].trim());
                        lon = parseFloat(parts[1].trim());
                        addDebug("    GPS string parsed: lat=" + lat + ", lon=" + lon);
                    }
                }
                // Number array
                else if (gpsLocation instanceof Array && gpsLocation.length >= 2) {
                    lat = parseFloat(gpsLocation[0]);
                    lon = parseFloat(gpsLocation[1]);
                    addDebug("    GPS array: [" + lat + ", " + lon + "]");
                }
                
                // Validácia GPS súradníc
                if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
                    if (validateGPSCoordinates(lat, lon)) {
                        addDebug("  ✅ GPS úspešne extrahované: " + lat + ", " + lon);
                        return {
                            lat: parseFloat(lat),
                            lon: parseFloat(lon),
                            name: pointName,
                            type: pointType
                        };
                    } else {
                        addDebug("  ❌ GPS súradnice mimo platného rozsahu: lat=" + lat + ", lon=" + lon);
                    }
                } else {
                    addDebug("  ❌ GPS pole '" + fieldName + "' obsahuje neplatné hodnoty: lat=" + lat + ", lon=" + lon);
                }
            } else {
                addDebug("  GPS pole '" + fieldName + "' je prázdne alebo neexistuje");
            }
        } catch (error) {
            addDebug("  ❌ Chyba pri čítaní GPS poľa '" + fieldName + "': " + error);
        }
    }
    
    addError(pointType + " (" + pointName + "): Žiadne platné GPS súradnice nenájdené", "extractGPSFromEntry");
    return null;
}

// ==============================================
// OSRM API A MATEMATICKÉ VÝPOČTY
// ==============================================

function callOSRMAPI(fromLat, fromLon, toLat, toLon, apiType, retryCount, serverIndex) {
    if (!CONFIG.useOSRM) {
        return null;
    }
    
    retryCount = retryCount || 0;
    serverIndex = serverIndex || 0;
    
    if (serverIndex >= CONFIG.osrmServers.length) {
        addDebug("    ❌ Všetky OSRM servery zlyhali pre " + apiType);
        return null;
    }
    
    // Check cache first
    var cacheKey = getCacheKey(fromLat, fromLon, toLat, toLon, apiType);
    var cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    
    // Rate limiting
    rateLimitedDelay();
    
    var baseUrl = CONFIG.osrmServers[serverIndex];
    var startTime = new Date().getTime();
    
    try {
        var coordinates = fromLon + "," + fromLat + ";" + toLon + "," + toLat;
        var url = baseUrl + coordinates + "?overview=false&geometries=geojson&steps=false";
        
        addDebug("    🔗 Server " + (serverIndex + 1) + "/" + CONFIG.osrmServers.length);
        addDebug("    📍 " + fromLat.toFixed(6) + "," + fromLon.toFixed(6) + " → " + toLat.toFixed(6) + "," + toLon.toFixed(6));
        
        var httpObj = http();
        httpObj.timeout = CONFIG.osrmTimeout;
        
        var response = httpObj.get(url);
        var endTime = new Date().getTime();
        var responseTime = endTime - startTime;
        
        performanceMetrics.totalApiCalls++;
        performanceMetrics.totalResponseTime += responseTime;
        
        addDebug("    📡 HTTP " + response.code + " (" + responseTime + "ms)");
        
        if (response.code === 200) {
            try {
                var data = JSON.parse(response.body);
                addDebug("    🔍 OSRM response code: " + data.code);
                
                if (data.code === "Ok" && data.routes && data.routes.length > 0) {
                    var route = data.routes[0];
                    
                    if (route.legs && route.legs.length > 0) {
                        var leg = route.legs[0];
                        var distanceKm = leg.distance / 1000;
                        var timeHours = leg.duration / 3600;
                        
                        var result = {
                            distance: distanceKm,
                            time: timeHours,
                            source: "OSRM"
                        };
                        
                        addDebug("    ✅ OSRM výsledok: " + distanceKm.toFixed(2) + " km, " + (timeHours * 60).toFixed(0) + " min");
                        addDebug("    🚀 Priemerná rýchlosť: " + (distanceKm / timeHours).toFixed(1) + " km/h");
                        
                        performanceMetrics.osrmSuccessCount++;
                        
                        // Cache result
                        setCachedResult(cacheKey, result);
                        
                        return result;
                    } else {
                        addDebug("    ❌ Žiadne legs v route");
                    }
                } else {
                    addDebug("    ❌ OSRM chyba: " + data.code);
                    if (data.message) {
                        addDebug("    📝 Správa: " + data.message);
                    }
                    
                    if ((data.code === "NoRoute" || data.code === "NoSegment") && serverIndex + 1 < CONFIG.osrmServers.length) {
                        addDebug("    🔄 Skúšam ďalší OSRM server...");
                        return callOSRMAPI(fromLat, fromLon, toLat, toLon, apiType, 0, serverIndex + 1);
                    }
                }
            } catch (jsonError) {
                addDebug("    ❌ JSON parsing chyba: " + jsonError);
                addDebug("    📄 Response preview: " + response.body.substring(0, 200));
            }
        } else if (response.code >= 500 && response.code < 600) {
            addDebug("    ❌ Server chyba (" + response.code + ")");
            
            if (retryCount < CONFIG.maxRetries) {
                addDebug("    🔄 Retry " + (retryCount + 1) + "/" + CONFIG.maxRetries);
                return callOSRMAPI(fromLat, fromLon, toLat, toLon, apiType, retryCount + 1, serverIndex);
            } else if (serverIndex + 1 < CONFIG.osrmServers.length) {
                addDebug("    🔄 Skúšam ďalší server...");
                return callOSRMAPI(fromLat, fromLon, toLat, toLon, apiType, 0, serverIndex + 1);
            }
        } else {
            addDebug("    ❌ HTTP status: " + response.code);
            
            if (serverIndex + 1 < CONFIG.osrmServers.length) {
                addDebug("    🔄 Skúšam ďalší server...");
                return callOSRMAPI(fromLat, fromLon, toLat, toLon, apiType, 0, serverIndex + 1);
            }
        }
        
    } catch (error) {
        addDebug("    ❌ HTTP/Network chyba: " + error.toString());
        
        if (retryCount < CONFIG.maxRetries) {
            addDebug("    🔄 Network retry " + (retryCount + 1) + "/" + CONFIG.maxRetries);
            return callOSRMAPI(fromLat, fromLon, toLat, toLon, apiType, retryCount + 1, serverIndex);
        } else if (serverIndex + 1 < CONFIG.osrmServers.length) {
            addDebug("    🔄 Network error, skúšam ďalší server...");
            return callOSRMAPI(fromLat, fromLon, toLat, toLon, apiType, 0, serverIndex + 1);
        }
    }
    
    addDebug("    ❌ Všetky pokusy pre " + apiType + " zlyhali");
    return null;
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Polomer Zeme v km
    
    var dLat = (lat2 - lat1) * (Math.PI / 180);
    var dLon = (lon2 - lon1) * (Math.PI / 180);
    var lat1Rad = lat1 * (Math.PI / 180);
    var lat2Rad = lat2 * (Math.PI / 180);
    
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
}

function estimateDrivingTime(distanceKm, numberOfStops) {
    // Základný čas na základe vzdialenosti a priemernej rýchlosti
    var baseTimeHours = distanceKm / CONFIG.averageSpeedKmh;
    
    // Pridaj delay na zastávky
    var stopDelayHours = (numberOfStops * CONFIG.cityDelayMinutes) / 60;
    
    // Aplikuj traffic multiplier
    var totalTimeHours = (baseTimeHours + stopDelayHours) * CONFIG.trafficMultiplier;
    
    addDebug("    📊 Odhad času: " + distanceKm.toFixed(1) + "km ÷ " + CONFIG.averageSpeedKmh + "km/h = " + baseTimeHours.toFixed(2) + "h");
    addDebug("    ⏸️ Delay zastávok: " + numberOfStops + " × " + CONFIG.cityDelayMinutes + "min = " + stopDelayHours.toFixed(2) + "h");
    addDebug("    🚦 Traffic faktor: " + CONFIG.trafficMultiplier + "x");
    addDebug("    ⏱️ Celkový odhad: " + totalTimeHours.toFixed(2) + "h");
    
    return totalTimeHours;
}

function calculateSegmentDistanceAndTime(fromCoord, toCoord, segmentIndex, totalSegments) {
    addDebug("  📏 Segment " + (segmentIndex + 1) + "/" + totalSegments + ": " + fromCoord.name + " → " + toCoord.name);
    
    // Pokús 1: OSRM API pre distance a time
    var osrmResult = callOSRMAPI(
        fromCoord.lat, fromCoord.lon, 
        toCoord.lat, toCoord.lon,
        "route"
    );
    
    if (osrmResult) {
        addDebug("    ✅ OSRM: " + osrmResult.distance.toFixed(2) + " km, " + (osrmResult.time * 60).toFixed(0) + " min");
        return {
            distance: osrmResult.distance,
            time: osrmResult.time,
            source: "OSRM"
        };
    }
    
    // Pokús 2: Fallback na matematik
    addDebug("    📊 OSRM nedostupné, používam matematické odhady");
    var haversineDistance = calculateHaversineDistance(
        fromCoord.lat, fromCoord.lon,
        toCoord.lat, toCoord.lon
    );
    
    var estimatedTime = estimateDrivingTime(haversineDistance, 0); // 0 stops pre segment
    
    addDebug("    📐 Fallback: " + haversineDistance.toFixed(2) + " km, " + (estimatedTime * 60).toFixed(0) + " min");
    return {
        distance: haversineDistance,
        time: estimatedTime,
        source: "Fallback"
    };
}

// ==============================================
// NASTAVENIE ATRIBÚTOV ZASTÁVOK A CIEĽA - OPRAVENÁ VERZIA
// ==============================================

function setStopAttributes(currentEntry, segmentData) {
    addDebug("🏷️ === NASTAVENIE ATRIBÚTOV ZASTÁVOK A CIEĽA ===");
    
    var atributSuccess = 0;
    var atributChyby = 0;
    
    // Získaj default zdržanie raz na začiatku
    var defaultZdrztanieHours = getDefaultZdrzanie();
    addDebug("🕐 Default zdržanie: " + (defaultZdrztanieHours * 60).toFixed(0) + " min (" + defaultZdrztanieHours.toFixed(3) + " h)");
    
    // Spracuj každý segment a nastav atribúty
    for (var i = 0; i < segmentData.length; i++) {
        var segment = segmentData[i];
        var pointType = segment.pointType;
        var pointIndex = segment.pointIndex;
        var distance = segment.distance;
        var time = segment.time;
        
        addDebug("🔧 Nastavujem atribúty pre " + pointType + " " + (pointIndex + 1) + ":");
        addDebug("  📏 Vzdialenosť: " + distance.toFixed(1) + " km (zaokrúhlené)");
        addDebug("  ⏱️ Čas: " + (time * 60).toFixed(0) + " min");
        addDebug("  🆔 Point index: " + pointIndex + ", Point type: " + pointType);
        
        try {
            // Nastav atribúty podľa typu bodu
            if (pointType === "Zastávka") {
                addDebug("  🎯 Spracúvam zastávku - vstupujem do IF bloku");
                
                addDebug("  📋 Nastavujem atribúty zastávky " + (pointIndex + 1) + ":");
                addDebug("    - km: " + (Math.round(distance * 10) / 10).toFixed(1));
                addDebug("    - trvanie: " + convertHoursToTimeString(time) + " (" + (time * 60).toFixed(0) + " min)");
                addDebug("    - zdržanie: kontrolujem existujúce hodnoty...");
                
                // ✅ SPRÁVNE API: entry().field("pole")[index].setAttr("atribút", hodnota)
                var kmSuccess = false, trvanieSuccess = false, zdrztanieSuccess = false;
                
                try {
                    var zastavkyPole = entry().field(CONFIG.fields.zastavky);
                    if (zastavkyPole && zastavkyPole.length > pointIndex) {
                        var zastavkaEntry = zastavkyPole[pointIndex];
                        
                        // Zaokrúhli km na 1 desatinné miesto
                        var roundedDistance = Math.round(distance * 10) / 10;
                        zastavkaEntry.setAttr(CONFIG.attributes.km, roundedDistance);
                        kmSuccess = true;
                        addDebug("    ✅ km atribút nastavený: " + roundedDistance + " km");
                    } else {
                        addDebug("    ❌ Zastávka " + pointIndex + " neexistuje v poli");
                    }
                } catch (kmError) {
                    addDebug("    ❌ km atribút zlyhalo: " + kmError.toString());
                }
                
                try {
                    var zastavkyPole2 = entry().field(CONFIG.fields.zastavky);
                    if (zastavkyPole2 && zastavkyPole2.length > pointIndex) {
                        var zastavkaEntry2 = zastavkyPole2[pointIndex];
                        
                        // Konvertuj čas na Duration formát (milisekundy)
                        var trvanieDuration = convertHoursToDuration(time);
                        var trvanieTimeString = convertHoursToTimeString(time);
                        
                        zastavkaEntry2.setAttr(CONFIG.attributes.trvanie, trvanieDuration);
                        trvanieSuccess = true;
                        addDebug("    ✅ trvanie atribút nastavený: " + trvanieTimeString + " (" + trvanieDuration + " ms)");
                    }
                } catch (trvanieError) {
                    addDebug("    ❌ trvanie atribút zlyhalo: " + trvanieError.toString());
                    
                    // Skús alternatívny formát - HH:MM string
                    try {
                        var zastavkyPole2Alt = entry().field(CONFIG.fields.zastavky);
                        if (zastavkyPole2Alt && zastavkyPole2Alt.length > pointIndex) {
                            var zastavkaEntry2Alt = zastavkyPole2Alt[pointIndex];
                            var trvanieString = convertHoursToTimeString(time);
                            
                            zastavkaEntry2Alt.setAttr(CONFIG.attributes.trvanie, trvanieString);
                            trvanieSuccess = true;
                            addDebug("    ✅ trvanie atribút nastavený (string): " + trvanieString);
                        }
                    } catch (trvanieStringError) {
                        addDebug("    ❌ trvanie string formát tiež zlyhalo: " + trvanieStringError.toString());
                    }
                }
                
                // ✅ OPRAVENÉ SPRACOVANIE ZDRŽANIA - iba ak nie je už vyplnené
                try {
                    var zastavkyPole3 = entry().field(CONFIG.fields.zastavky);
                    if (zastavkyPole3 && zastavkyPole3.length > pointIndex) {
                        var zastavkaEntry3 = zastavkyPole3[pointIndex];
                        
                        // Skontroluj či už existuje zdržanie atribút
                        var existujuceZdrzanie = null;
                        try {
                            existujuceZdrzanie = zastavkaEntry3.attr(CONFIG.attributes.zdrzanie);
                            addDebug("    📋 Aktuálne zdržanie: " + existujuceZdrzanie);
                        } catch (checkError) {
                            addDebug("    📋 Zdržanie atribút neexistuje alebo je prázdny");
                        }
                        
                        if (!isZdrztanieEmpty(existujuceZdrzanie)) {
                            // Zdržanie už je nastavené - nenastav znovu
                            var existujuceHours = convertDurationToHours(existujuceZdrzanie);
                            var existujuceTimeString = convertHoursToTimeString(existujuceHours);
                            addDebug("    ℹ️ zdržanie už existuje: " + existujuceTimeString + " - ponechávam");
                            zdrztanieSuccess = true; // Považuj za úspešné
                        } else {
                            // Zdržanie nie je nastavené - nastav predvolenú hodnotu
                            var zdrzanieDuration = convertHoursToDuration(defaultZdrztanieHours);
                            var zdrztanieTimeString = convertHoursToTimeString(defaultZdrztanieHours);
                            
                            zastavkaEntry3.setAttr(CONFIG.attributes.zdrzanie, zdrzanieDuration);
                            zdrztanieSuccess = true;
                            addDebug("    ✅ zdržanie atribút nastavený (default): " + zdrztanieTimeString + " (" + zdrzanieDuration + " ms)");
                        }
                    }
                } catch (zdrztanieError) {
                    addDebug("    ❌ zdržanie atribút zlyhalo: " + zdrztanieError.toString());
                    
                    // Skús alternatívny formát - HH:MM string
                    try {
                        var zastavkyPole3Alt = entry().field(CONFIG.fields.zastavky);
                        if (zastavkyPole3Alt && zastavkyPole3Alt.length > pointIndex) {
                            var zastavkaEntry3Alt = zastavkyPole3Alt[pointIndex];
                            
                            // Skontroluj existujúce zdržanie aj pre string variant
                            var existujuceZdrztanieAlt = null;
                            try {
                                existujuceZdrztanieAlt = zastavkaEntry3Alt.attr(CONFIG.attributes.zdrzanie);
                            } catch (checkErrorAlt) {
                                // Ignoruj chybu
                            }
                            
                            if (!isZdrztanieEmpty(existujuceZdrztanieAlt)) {
                                addDebug("    ℹ️ zdržanie už existuje (string): " + existujuceZdrztanieAlt + " - ponechávam");
                                zdrztanieSuccess = true;
                            } else {
                                var zdrztanieString = convertHoursToTimeString(defaultZdrztanieHours);
                                zastavkaEntry3Alt.setAttr(CONFIG.attributes.zdrzanie, zdrztanieString);
                                zdrztanieSuccess = true;
                                addDebug("    ✅ zdržanie atribút nastavený (string default): " + zdrztanieString);
                            }
                        }
                    } catch (zdrztanieStringError) {
                        addDebug("    ❌ zdržanie string formát tiež zlyhalo: " + zdrztanieStringError.toString());
                    }
                }
                
                // Overenie úspešnosti
                if (kmSuccess && trvanieSuccess && zdrztanieSuccess) {
                    addDebug("    🎉 Všetky atribúty zastávky úspešne nastavené");
                    atributSuccess++;
                    
                    // Overenie nastavenia
                    try {
                        var zastavkyPoleCheck = entry().field(CONFIG.fields.zastavky);
                        if (zastavkyPoleCheck && zastavkyPoleCheck.length > pointIndex) {
                            var zastavkaCheck = zastavkyPoleCheck[pointIndex];
                            var kontrolaKm = zastavkaCheck.attr(CONFIG.attributes.km);
                            var kontrolaTrvanie = zastavkaCheck.attr(CONFIG.attributes.trvanie);
                            var kontrolaZdrzanie = zastavkaCheck.attr(CONFIG.attributes.zdrzanie);
                            addDebug("    ✅ Overenie - km: " + kontrolaKm + ", trvanie: " + kontrolaTrvanie + ", zdržanie: " + kontrolaZdrzanie);
                        }
                    } catch (checkError) {
                        addDebug("    ⚠️ Nepodarilo sa overiť atribúty: " + checkError.toString());
                    }
                } else {
                    addError("Nepodarilo sa nastaviť všetky atribúty zastávky " + (pointIndex + 1), "setStopAttributes_zastavka_" + pointIndex);
                    atributChyby++;
                }
                
            } else if (pointType === "Cieľ") {
                addDebug("  🎯 Spracúvam cieľ - vstupujem do ELSE IF bloku");
                
                // Pre cieľ nastavuj: km, trvanie
                addDebug("  📋 Nastavujem atribúty cieľa:");
                addDebug("    - km: " + (Math.round(distance * 10) / 10).toFixed(1));
                addDebug("    - trvanie: " + convertHoursToTimeString(time) + " (" + (time * 60).toFixed(0) + " min)");
                
                var cielKmSuccess = false, cielTrvanieSuccess = false;
                
                try {
                    var cielPole = entry().field(CONFIG.fields.ciel);
                    if (cielPole && cielPole.length > 0) {
                        var cielEntry = cielPole[0];
                        
                        // Zaokrúhli km na 1 desatinné miesto
                        var roundedDistanceCiel = Math.round(distance * 10) / 10;
                        cielEntry.setAttr(CONFIG.attributes.km, roundedDistanceCiel);
                        cielKmSuccess = true;
                        addDebug("    ✅ cieľ km atribút nastavený: " + roundedDistanceCiel + " km");
                    } else {
                        addDebug("    ❌ Cieľ neexistuje v poli");
                    }
                } catch (cielKmError) {
                    addDebug("    ❌ cieľ km zlyhalo: " + cielKmError.toString());
                }
                
                try {
                    var cielPole2 = entry().field(CONFIG.fields.ciel);
                    if (cielPole2 && cielPole2.length > 0) {
                        var cielEntry2 = cielPole2[0];
                        
                        // Konvertuj čas na Duration formát (milisekundy)
                        var cielTrvanieDuration = convertHoursToDuration(time);
                        var cielTrvanieTimeString = convertHoursToTimeString(time);
                        
                        cielEntry2.setAttr(CONFIG.attributes.trvanie, cielTrvanieDuration);
                        cielTrvanieSuccess = true;
                        addDebug("    ✅ cieľ trvanie atribút nastavený: " + cielTrvanieTimeString + " (" + cielTrvanieDuration + " ms)");
                    }
                } catch (cielTrvanieError) {
                    addDebug("    ❌ cieľ trvanie zlyhalo: " + cielTrvanieError.toString());
                    
                    // Skús alternatívny formát - HH:MM string
                    try {
                        var cielPole2Alt = entry().field(CONFIG.fields.ciel);
                        if (cielPole2Alt && cielPole2Alt.length > 0) {
                            var cielEntry2Alt = cielPole2Alt[0];
                            var cielTrvanieString = convertHoursToTimeString(time);
                            
                            cielEntry2Alt.setAttr(CONFIG.attributes.trvanie, cielTrvanieString);
                            cielTrvanieSuccess = true;
                            addDebug("    ✅ cieľ trvanie atribút nastavený (string): " + cielTrvanieString);
                        }
                    } catch (cielTrvanieStringError) {
                        addDebug("    ❌ cieľ trvanie string formát tiež zlyhalo: " + cielTrvanieStringError.toString());
                    }
                }
                
                if (cielKmSuccess && cielTrvanieSuccess) {
                    addDebug("    🎉 Všetky atribúty cieľa úspešne nastavené");
                    atributSuccess++;
                    
                    // Overenie nastavenia
                    try {
                        var cielPoleCheck = entry().field(CONFIG.fields.ciel);
                        if (cielPoleCheck && cielPoleCheck.length > 0) {
                            var cielCheck = cielPoleCheck[0];
                            var kontrolaKmCiel = cielCheck.attr(CONFIG.attributes.km);
                            var kontrolaTrvanieCiel = cielCheck.attr(CONFIG.attributes.trvanie);
                            addDebug("    ✅ Overenie cieľ - km: " + kontrolaKmCiel + ", trvanie: " + kontrolaTrvanieCiel);
                        }
                    } catch (checkCielError) {
                        addDebug("    ⚠️ Nepodarilo sa overiť atribúty cieľa: " + checkCielError.toString());
                    }
                } else {
                    addError("Nepodarilo sa nastaviť všetky atribúty cieľa", "setStopAttributes_ciel");
                    atributChyby++;
                }
            } else {
                addDebug("  ❓ Neznámy pointType: '" + pointType + "' - preskakujem");
            }
            
        } catch (generalError) {
            addError("Chyba pri nastavovaní atribútov pre " + pointType + " " + (pointIndex + 1) + ": " + generalError.toString(), "setStopAttributes_general_" + i);
            atributChyby++;
        }
    }
    
    addDebug("📊 VÝSLEDKY NASTAVENIA ATRIBÚTOV:");
    addDebug("  ✅ Úspešné: " + atributSuccess);
    addDebug("  ❌ Chyby: " + atributChyby);
    
    return {
        success: atributSuccess > 0,
        totalSuccess: atributSuccess,
        totalErrors: atributChyby
    };
}

// ==============================================
// VÝPOČET CELKOVÉHO ČASU Z ATRIBÚTOV - ROZŠÍRENÁ VERZIA
// ==============================================

function calculateTotalTimeFromAttributes(currentEntry, segmentData) {
    addDebug("⏰ === VÝPOČET CELKOVÉHO ČASU Z ATRIBÚTOV ===");
    
    var celkovyCasJazdy = 0; // Súčet všetkých "trvanie" hodnôt z atribútov
    var celkovyZdrzanie = 0; // Súčet všetkých "zdržanie" hodnôt z atribútov
    
    // Spočítaj časy z atribútov zastávok
    addDebug("📋 Počítam časy z atribútov zastávok...");
    try {
        var zastavkyPole = currentEntry.field(CONFIG.fields.zastavky);
        if (zastavkyPole && zastavkyPole.length > 0) {
            for (var i = 0; i < zastavkyPole.length; i++) {
                var zastavka = zastavkyPole[i];
                
                try {
                    // Trvanie atribút
                    var trvanieAttr = zastavka.attr(CONFIG.attributes.trvanie);
                    if (trvanieAttr) {
                        var trvanieHours = convertDurationToHours(trvanieAttr);
                        celkovyCasJazdy += trvanieHours;
                        addDebug("  🔗 Zastávka " + (i + 1) + " trvanie: " + (trvanieHours * 60).toFixed(0) + " min");
                    }
                    
                    // Zdržanie atribút
                    var zdrztanieAttr = zastavka.attr(CONFIG.attributes.zdrzanie);
                    if (zdrztanieAttr && !isZdrztanieEmpty(zdrztanieAttr)) {
                        var zdrztanieHours = convertDurationToHours(zdrztanieAttr);
                        celkovyZdrzanie += zdrztanieHours;
                        addDebug("  ⏸️ Zastávka " + (i + 1) + " zdržanie: " + (zdrztanieHours * 60).toFixed(0) + " min");
                    }
                    
                } catch (attrError) {
                    addDebug("  ⚠️ Chyba pri čítaní atribútov zastávky " + (i + 1) + ": " + attrError.toString());
                }
            }
        }
    } catch (zastavkyError) {
        addError("Chyba pri spracovaní zastávok: " + zastavkyError.toString(), "calculateTotalTimeFromAttributes_zastavky");
    }
    
    // Spočítaj čas z atribútov cieľa
    addDebug("📋 Počítam čas z atribútov cieľa...");
    try {
        var cielPole = currentEntry.field(CONFIG.fields.ciel);
        if (cielPole && cielPole.length > 0) {
            var ciel = cielPole[0];
            
            try {
                var cielTrvanieAttr = ciel.attr(CONFIG.attributes.trvanie);
                if (cielTrvanieAttr) {
                    var cielTrvanieHours = convertDurationToHours(cielTrvanieAttr);
                    celkovyCasJazdy += cielTrvanieHours;
                    addDebug("  🔗 Cieľ trvanie: " + (cielTrvanieHours * 60).toFixed(0) + " min");
                }
            } catch (cielAttrError) {
                addDebug("  ⚠️ Chyba pri čítaní atribútov cieľa: " + cielAttrError.toString());
            }
        }
    } catch (cielError) {
        addError("Chyba pri spracovaní cieľa: " + cielError.toString(), "calculateTotalTimeFromAttributes_ciel");
    }
    
    var celkovyCas = celkovyCasJazdy + celkovyZdrzanie;
    
    addDebug("📊 SÚHRN ČASOV Z ATRIBÚTOV:");
    addDebug("  🚗 Čas jazdy (z trvanie atribútov): " + (celkovyCasJazdy * 60).toFixed(0) + " min (" + celkovyCasJazdy.toFixed(2) + " h)");
    addDebug("  ⏸️ Čas na zastávkach (z zdržanie atribútov): " + (celkovyZdrzanie * 60).toFixed(0) + " min (" + celkovyZdrzanie.toFixed(2) + " h)");
    addDebug("  ⏱️ Celkový čas: " + (celkovyCas * 60).toFixed(0) + " min (" + celkovyCas.toFixed(2) + " h)");
    
    // Ulož časy do polí
    var casJazdySuccess = false;
    var casNaZastavkachSuccess = false;
    var celkovyCasSuccess = false;
    
    try {
        var roundedCasJazdy = roundTimeToQuarter(celkovyCasJazdy);
        currentEntry.set(CONFIG.fields.casJazdy, roundedCasJazdy);
        addDebug("  💾 Čas jazdy uložený: " + roundedCasJazdy.toFixed(2) + " h");
        casJazdySuccess = true;
    } catch (casJazdyError) {
        addError("Nepodarilo sa uložiť čas jazdy: " + casJazdyError.toString(), "calculateTotalTime_casJazdy");
    }
    
    try {
        var roundedCasNaZastavkach = roundTimeToQuarter(celkovyZdrzanie);
        currentEntry.set(CONFIG.fields.casNaZastavkach, roundedCasNaZastavkach);
        addDebug("  💾 Čas na zastávkach uložený: " + roundedCasNaZastavkach.toFixed(2) + " h");
        casNaZastavkachSuccess = true;
    } catch (casNaZastavkachError) {
        addError("Nepodarilo sa uložiť čas na zastávkach: " + casNaZastavkachError.toString(), "calculateTotalTime_casNaZastavkach");
    }
    
    try {
        var roundedCelkovyCas = roundTimeToQuarter(celkovyCas);
        currentEntry.set(CONFIG.fields.celkovyCas, roundedCelkovyCas);
        addDebug("  💾 Celkový čas uložený: " + roundedCelkovyCas.toFixed(2) + " h");
        celkovyCasSuccess = true;
    } catch (celkovyCasError) {
        addError("Nepodarilo sa uložiť celkový čas: " + celkovyCasError.toString(), "calculateTotalTime_celkovyCas");
    }
    
    // Validácia: Skontroluj konzistenciu
    addDebug("🔍 VALIDÁCIA ČASOV:");
    addDebug("  Súčet trvanie atribútov: " + celkovyCasJazdy.toFixed(2) + " h");
    addDebug("  Uložený 'Čas jazdy': " + (casJazdySuccess ? roundedCasJazdy.toFixed(2) : "CHYBA") + " h");
    addDebug("  Súčet zdržanie atribútov: " + celkovyZdrzanie.toFixed(2) + " h");
    addDebug("  Uložený 'Čas na zastávkach': " + (casNaZastavkachSuccess ? roundedCasNaZastavkach.toFixed(2) : "CHYBA") + " h");
    
    if (casJazdySuccess && celkovyCasSuccess && casNaZastavkachSuccess) {
        return {
            success: true,
            casJazdy: roundedCasJazdy,
            casNaZastavkach: roundedCasNaZastavkach,
            celkovyCas: roundedCelkovyCas
        };
    } else {
        return false;
    }
}

// ==============================================
// VÝPOČET TRASY S ATRIBÚTMI - ROZŠÍRENÁ VERZIA
// ==============================================

function calculateRouteDistanceAndTime() {
    addDebug("📏 === KROK 1: VÝPOČET TRASY S ATRIBÚTMI ===");
    
    var currentEntry = entry();
    var step1Success = false; // Validácia základných polí
    var step2Success = false; // GPS extrakcia
    var step3Success = false; // Výpočet trasy
    var step4Success = false; // Nastavenie atribútov
    var step5Success = false; // Výpočet celkového času
    
    // KROK 1.1: Validácia základných polí
    addDebug("📋 KROK 1.1: Získavam polia trasy...");
    
    var start = currentEntry.field(CONFIG.fields.start);
    var zastavky = currentEntry.field(CONFIG.fields.zastavky);
    var ciel = currentEntry.field(CONFIG.fields.ciel);
    
    addDebug("  🎯 Štart: " + (start && start.length > 0 ? start.length + " záznamov" : "CHÝBA"));
    addDebug("  🛑 Zastávky: " + (zastavky && zastavky.length > 0 ? zastavky.length + " záznamov" : "žiadne"));
    addDebug("  🏁 Cieľ: " + (ciel && ciel.length > 0 ? ciel.length + " záznamov" : "CHÝBA"));
    
    // Validácia minimálnych požiadaviek
    if (!start || start.length === 0) {
        addError("Pole Štart nie je vyplnené", "krok1_1");
    } else if (!ciel || ciel.length === 0) {
        addError("Pole Cieľ nie je vyplnené", "krok1_1");
    } else {
        addDebug("✅ Základné polia trasy sú v poriadku");
        step1Success = true;
    }
    
    if (step1Success) {
        // KROK 1.2: Zostavenie kompletnej trasy
        addDebug("🗺️ KROK 1.2: Zostavujem komplettnú trasu...");
        
        var routeEntries = [];
        var routeTypes = [];
        var routeIndices = []; // Index v rámci typu (pre atribúty)
        
        // Pridaj Štart
        for (var s = 0; s < start.length; s++) {
            routeEntries.push(start[s]);
            routeTypes.push("Štart");
            routeIndices.push(s);
        }
        
        // Pridaj Zastávky
        if (zastavky && zastavky.length > 0) {
            for (var z = 0; z < zastavky.length; z++) {
                routeEntries.push(zastavky[z]);
                routeTypes.push("Zastávka");
                routeIndices.push(z);
            }
        }
        
        // Pridaj Cieľ
        for (var c = 0; c < ciel.length; c++) {
            routeEntries.push(ciel[c]);
            routeTypes.push("Cieľ");
            routeIndices.push(c);
        }
        
        addDebug("  📍 Celkovo bodov trasy: " + routeEntries.length);
        
        if (routeEntries.length < 2) {
            addError("Nedostatok bodov pre trasu: " + routeEntries.length + "/2", "krok1_2");
        } else {
            step2Success = true;
        }
    }
    
    if (step1Success && step2Success) {
        // KROK 1.3: GPS extrakcia
        addDebug("🛰️ KROK 1.3: Extrakcia GPS súradníc...");
        
        var coordinates = [];
        var gpsChyby = 0;
        
        for (var i = 0; i < routeEntries.length; i++) {
            var entryObj = routeEntries[i];
            var pointType = routeTypes[i];
            
            // Získaj názov miesta
            var pointName = pointType;
            try {
                var nazov = entryObj.field(CONFIG.miestalFields.nazov);
                if (nazov && nazov.length > 0) {
                    pointName = nazov;
                }
            } catch (error) {
                addDebug("Chyba pri získavaní názvu pre " + pointType + ": " + error);
            }
            
            // Extrahuj GPS súradnice
            var gpsCoords = extractGPSFromEntry(entryObj, pointType, pointName);
            
            if (gpsCoords) {
                // Pridaj dodatočné informácie pre atribúty
                gpsCoords.routeType = pointType;
                gpsCoords.routeIndex = routeIndices[i];
                coordinates.push(gpsCoords);
            } else {
                gpsChyby++;
            }
        }
        
        addDebug("📊 GPS extrakcia: " + coordinates.length + " úspešných, " + gpsChyby + " chýb");
        
        if (coordinates.length < 2) {
            addError("Nedostatok platných GPS súradníc: " + coordinates.length + "/2", "krok1_3");
        } else {
            step3Success = true;
        }
    }
    
    if (step1Success && step2Success && step3Success) {
        // KROK 1.4: Spracovanie segmentov trasy s atribútmi
        addDebug("⚡ KROK 1.4: Spracúvam segmenty trasy s atribútmi...");
        
        var totalDistance = 0;
        var totalTime = 0;
        var osrmSuccessCount = 0;
        var totalSegments = coordinates.length - 1;
        var segmentChyby = 0;
        var segmentData = []; // Pre atribúty a celkový čas
        
        try {
            for (var seg = 0; seg < coordinates.length - 1; seg++) {
                var from = coordinates[seg];
                var to = coordinates[seg + 1];
                
                try {
                    var segmentResult = calculateSegmentDistanceAndTime(from, to, seg, totalSegments);
                    
                    if (segmentResult) {
                        var distance = segmentResult.distance;
                        var time = segmentResult.time;
                        var dataSource = segmentResult.source;
                        
                        if (dataSource === "OSRM") {
                            osrmSuccessCount++;
                        }
                        
                        totalDistance += distance;
                        totalTime += time;
                        
                        // Uložiť segment data pre atribúty (target point má atribúty)
                        segmentData.push({
                            pointType: to.routeType,
                            pointIndex: to.routeIndex,
                            distance: distance,
                            time: time,
                            source: dataSource
                        });
                        
                        addDebug("    ✅ Segment " + (seg + 1) + ": " + distance.toFixed(1) + " km, " + 
                                (time * 60).toFixed(0) + " min (" + dataSource + ") → " + to.routeType);
                    } else {
                        addError("Segment " + (seg + 1) + " sa nepodarilo spracovať", "krok1_4_segment_" + seg);
                        segmentChyby++;
                    }
                    
                } catch (segmentError) {
                    addError("Chyba pri spracovaní segmentu " + (seg + 1) + ": " + segmentError.toString(), "krok1_4_segment_" + seg);
                    segmentChyby++;
                }
            }
            
            // Ulož celkovú vzdialenosť
            if (totalSegments > segmentChyby) {
                var roundedDistance = Math.round(totalDistance * 10) / 10;
                
                try {
                    currentEntry.set(CONFIG.fields.km, roundedDistance);
                    addDebug("  💾 Celková vzdialenosť uložená: " + roundedDistance + " km");
                    step3Success = true;
                } catch (distanceError) {
                    addError("Nepodarilo sa uložiť vzdialenosť: " + distanceError.toString(), "krok1_4_save_distance");
                }
                
                addDebug("✅ SEGMENTY TRASY DOKONČENÉ:");
                addDebug("  📏 Celková vzdialenosť: " + totalDistance.toFixed(1) + " km");
                addDebug("  ⏱️ Celkový čas segmentov: " + totalTime.toFixed(2) + " h (" + Math.round(totalTime * 60) + " min)");
                addDebug("  🗺️ OSRM úspechy: " + osrmSuccessCount + "/" + totalSegments + " segmentov");
                addDebug("  📋 Segment data pre atribúty: " + segmentData.length + " záznamov");
                
            } else {
                addError("Príliš veľa chýb pri spracovaní segmentov: " + segmentChyby + "/" + totalSegments, "krok1_4");
            }
            
        } catch (segmentProcessingError) {
            addError("Kritická chyba pri spracovaní segmentov: " + segmentProcessingError.toString(), "krok1_4");
        }
    }
    
    if (step1Success && step2Success && step3Success && segmentData.length > 0) {
        // KROK 1.5: Nastavenie atribútov zastávok a cieľa
        addDebug("🏷️ KROK 1.5: Nastavujem atribúty...");
        
        var atributResult = setStopAttributes(currentEntry, segmentData);
        if (atributResult && atributResult.success) {
            addDebug("✅ Atribúty úspešne nastavené");
            step4Success = true;
        } else {
            addDebug("⚠️ Problémy pri nastavovaní atribútov");
            // Pokračuj aj tak - atribúty nie sú kritické
            step4Success = true;
        }
    }
    
    if (step1Success && step2Success && step3Success && step4Success && segmentData.length > 0) {
        // KROK 1.6: Výpočet celkového času z atribútov
        addDebug("⏰ KROK 1.6: Vypočítavam celkový čas z atribútov...");
        
        var timeResult = calculateTotalTimeFromAttributes(currentEntry, segmentData);
        if (timeResult && timeResult.success) {
            addDebug("✅ Celkový čas úspešne vypočítaný z atribútov");
            step5Success = true;
            
            return {
                success: true,
                distance: totalDistance,
                casJazdy: timeResult.casJazdy,
                casNaZastavkach: timeResult.casNaZastavkach,
                celkovyCas: timeResult.celkovyCas,
                osrmCount: osrmSuccessCount,
                totalSegments: totalSegments,
                errorCount: segmentChyby,
                atributResult: atributResult
            };
        } else {
            addError("Nepodarilo sa vypočítať celkový čas z atribútov", "krok1_6");
        }
    }
    
    addDebug("❌ Výpočet trasy neúspešný");
    return false;
}

// ==============================================
// KONTROLA A LINKOVANIE ŠOFÉRA DO POSÁDKY
// ==============================================

function kontrolujSoferaVPosadke() {
    addDebug("👨‍✈️ === KONTROLA ŠOFÉRA V POSÁDKE ===");
    
    var currentEntry = entry();
    var soferPridany = false;
    
    // Získaj šoféra a posádku
    var sofer = currentEntry.field(CONFIG.fields.sofer);
    var posadka = currentEntry.field(CONFIG.fields.posadka);
    
    addDebug("🔍 Kontrolujem šoféra a posádku...");
    addDebug("  👨‍✈️ Šofér: " + (sofer && sofer.length > 0 ? sofer.length + " záznamov" : "CHÝBA"));
    addDebug("  👥 Posádka: " + (posadka && posadka.length > 0 ? posadka.length + " členov" : "PRÁZDNA"));
    
    // Ak nie je šofér vyplnený, preskač
    if (!sofer || sofer.length === 0) {
        addDebug("⚠️ Šofér nie je vyplnený - preskakujem kontrolu");
        return false;
    }
    
    // Vezmi prvého šoféra (ak je viac)
    var soferZaznam = sofer[0];
    
    // Získaj meno šoféra pre debug
    var menoSofera = "Neznámy";
    try {
        var tempMeno = soferZaznam.field(CONFIG.zamestnancilFields.meno);
        if (tempMeno) {
            menoSofera = tempMeno;
        }
    } catch (menoError) {
        addDebug("  ⚠️ Nepodarilo sa získať meno šoféra");
    }
    
    addDebug("👨‍✈️ Šofér: " + menoSofera);
    
    // Ak nie je posádka, vytvor ju so šoférom
    if (!posadka || posadka.length === 0) {
        addDebug("📝 Posádka je prázdna - pridávam šoféra");
        
        try {
            currentEntry.set(CONFIG.fields.posadka, sofer);
            addDebug("✅ Šofér pridaný do prázdnej posádky");
            soferPridany = true;
        } catch (setPosadkaError) {
            addError("Nepodarilo sa nastaviť šoféra do prázdnej posádky: " + setPosadkaError.toString(), "kontrolujSofera_setPosadka");
        }
    } else {
        // Skontroluj či šofér už je v posádke
        addDebug("🔍 Kontrolujem či šofér už je v posádke...");
        
        var soferUzVPosadke = false;
        
        for (var i = 0; i < posadka.length; i++) {
            var clenPosadky = posadka[i];
            
            if (!clenPosadky) {
                addDebug("    ⚠️ Člen posádky " + (i + 1) + " je null");
                continue;
            }
            
            // Získaj meno člena posádky pre porovnanie
            var menoClenaPosadky = "Neznámy";
            try {
                var tempMenoClen = clenPosadky.field(CONFIG.zamestnancilFields.meno);
                if (tempMenoClen) {
                    menoClenaPosadky = tempMenoClen;
                }
            } catch (menoClenError) {
                addDebug("    ⚠️ Nepodarilo sa získať meno člena " + (i + 1));
            }
            
            addDebug("    👤 Člen " + (i + 1) + ": " + menoClenaPosadky);
            
            // Porovnaj objekty - skús rôzne spôsoby
            try {
                // Metóda 1: Porovnanie objektov
                if (clenPosadky === soferZaznam) {
                    addDebug("    ✅ Šofér nájdený v posádke (object comparison)");
                    soferUzVPosadke = true;
                    break;
                }
                
                // Metóda 2: Porovnanie mien (ak object comparison nefunguje)
                if (menoSofera !== "Neznámy" && menoClenaPosadky !== "Neznámy" && 
                    menoSofera === menoClenaPosadky) {
                    addDebug("    ✅ Šofér nájdený v posádke (name comparison)");
                    soferUzVPosadke = true;
                    break;
                }
                
                // Metóda 3: Porovnanie cez field values (ak majú ID)
                try {
                    var soferField = soferZaznam.field("ID") || soferZaznam.field("id");
                    var clenField = clenPosadky.field("ID") || clenPosadky.field("id");
                    
                    if (soferField && clenField && soferField === clenField) {
                        addDebug("    ✅ Šofér nájdený v posádke (ID comparison)");
                        soferUzVPosadke = true;
                        break;
                    }
                } catch (idError) {
                    // ID polja nemusia existovať
                }
                
            } catch (porovnanieError) {
                addDebug("    ⚠️ Chyba pri porovnaní: " + porovnanieError.toString());
            }
        }
        
        if (soferUzVPosadke) {
            addDebug("✅ Šofér už je v posádke - nepridávam");
        } else {
            addDebug("❌ Šofér nie je v posádke - pridávam ho");
            
            try {
                // Vytvor novú posádku s existujúcimi členmi + šofér
                var novaPosadka = [];
                
                // Pridaj existujúcich členov
                for (var j = 0; j < posadka.length; j++) {
                    novaPosadka.push(posadka[j]);
                }
                
                // Pridaj šoféra
                novaPosadka.push(soferZaznam);
                
                addDebug("📝 Nastavujem rozšírenú posádku: " + (posadka.length) + " + 1 = " + novaPosadka.length + " členov");
                
                currentEntry.set(CONFIG.fields.posadka, novaPosadka);
                addDebug("✅ Šofér úspešne pridaný do posádky");
                soferPridany = true;
                
            } catch (linkError) {
                addError("Nepodarilo sa pridať šoféra do posádky: " + linkError.toString(), "kontrolujSofera_link");
                
                // Skús alternatívny prístup cez link() metódu
                try {
                    addDebug("🔄 Skúšam alternatívnu link() metódu...");
                    currentEntry.link(CONFIG.fields.posadka, soferZaznam);
                    addDebug("✅ Šofér pridaný cez link() metódu");
                    soferPridany = true;
                } catch (linkAltError) {
                    addError("Link() metóda tiež zlyhala: " + linkAltError.toString(), "kontrolujSofera_linkAlt");
                }
            }
        }
    }
    
    if (soferPridany) {
        addDebug("🎉 Šofér úspešne pridaný do posádky!");
        
        // Over aktuálny stav posádky
        try {
            var aktualnaPosadka = currentEntry.field(CONFIG.fields.posadka);
            addDebug("📊 Aktuálna posádka: " + (aktualnaPosadka ? aktualnaPosadka.length + " členov" : "null"));
        } catch (checkError) {
            addDebug("⚠️ Nepodarilo sa overiť aktuálnu posádku");
        }
    }
    
    return soferPridany;
}

// ==============================================
// VÝPOČET MIEZD POSÁDKY S CELKOVÝM ČASOM - ROZŠÍRENÁ VERZIA
// ==============================================

function calculateMzdy() {
    addDebug("💰 === KROK 2: VÝPOČET MIEZD POSÁDKY (CELKOVÝ ČAS) ===");
    
    var currentEntry = entry();
    var step1Success = false; // Validácia základných údajov
    var step2Success = false; // Spracovanie posádky
    var step3Success = false; // Finalizácia miezd
    
    var celkoveMzdy = 0;
    var pocetSpracovanych = 0;
    var pocetChyb = 0;
    var hodinovkyZamestnancov = []; // Lokálne uloženie hodinoviek namiesto atribútov
    
    // KROK 2.1: Validácia základných údajov
    addDebug("📋 KROK 2.1: Získavam základné údaje pre mzdy...");
    
    var datumJazdy = currentEntry.field(CONFIG.fields.datum);
    var celkovyCasHodiny = currentEntry.field(CONFIG.fields.celkovyCas); // ZMENENÉ: používa celkový čas
    var posadka = currentEntry.field(CONFIG.fields.posadka);
    
    addDebug("  📅 Dátum jazdy: " + (datumJazdy ? moment(datumJazdy).format("DD.MM.YYYY") : "CHÝBA"));
    addDebug("  ⏱️ Celkový čas: " + (celkovyCasHodiny ? celkovyCasHodiny.toFixed(2) + " h" : "CHÝBA"));
    addDebug("  👥 Posádka: " + (posadka && posadka.length > 0 ? posadka.length + " členov" : "CHÝBA"));
    
    // Fallback na čas jazdy ak celkový čas nie je dostupný
    if (!celkovyCasHodiny || celkovyCasHodiny <= 0) {
        addDebug("⚠️ Celkový čas nedostupný, skúšam čas jazdy ako fallback...");
        var casJazdyHodiny = currentEntry.field(CONFIG.fields.casJazdy);
        if (casJazdyHodiny && casJazdyHodiny > 0) {
            celkovyCasHodiny = casJazdyHodiny;
            addDebug("  🔄 Použijem čas jazdy: " + celkovyCasHodiny.toFixed(2) + " h");
        }
    }
    
    // Validácia základných požiadaviek
    if (!datumJazdy) {
        addError("Dátum jazdy nie je vyplnený", "krok2_1");
    } else if (!celkovyCasHodiny || celkovyCasHodiny <= 0) {
        addError("Celkový čas ani čas jazdy nie je vypočítaný alebo je neplatný", "krok2_1");
    } else if (!posadka || posadka.length === 0) {
        addError("Posádka nie je dostupná alebo je prázdna", "krok2_1");
    } else {
        addDebug("✅ Základné údaje pre mzdy sú v poriadku");
        step1Success = true;
    }
    
    if (step1Success) {
        // KROK 2.2: Spracovanie každého člena posádky
        addDebug("👥 KROK 2.2: Spracúvam členov posádky s celkovým časom...");
        addDebug("🔗 Hodinovky sa ukladajú lokálne v scripte namiesto atribútov");
        addDebug("📊 Debug logging: VŽDY AKTÍVNY");
        
        for (var i = 0; i < posadka.length; i++) {
            var zamestnanec = posadka[i];
            addDebug("\n--- Zamestnanec " + (i + 1) + "/" + posadka.length + " ---");
            
            if (!zamestnanec) {
                addError("Zamestnanec na pozícii " + i + " je null", "krok2_2_zamestnanec_" + i);
                hodinovkyZamestnancov[i] = 0; // Nastav 0 pre null zamestnancov
                pocetChyb++;
            } else {
                try {
                    // Získaj meno zamestnanca
                    var menoZamestnanca = "Neznámy";
                    try {
                        var tempMeno = zamestnanec.field(CONFIG.zamestnancilFields.meno);
                        if (tempMeno) {
                            menoZamestnanca = tempMeno;
                        }
                    } catch (menoError) {
                        addDebug("  ⚠️ Nepodarilo sa získať meno");
                    }
                    
                    addDebug("  👤 " + menoZamestnanca);
                    
                    // Inicializuj hodinovku pre tohto zamestnanca
                    hodinovkyZamestnancov[i] = 0;
                    
                    // Nájdi sadzby zamestnanca pomocou linksFrom
                    addDebug("  🔍 Hľadám sadzby cez linksFrom...");
                    var sadzbyZamestnanca = null;
                    var linksFromSuccess = false;
                    
                    try {
                        sadzbyZamestnanca = zamestnanec.linksFrom(CONFIG.sadzbyLibrary, CONFIG.sadzbyFields.zamestnanec);
                        if (sadzbyZamestnanca && sadzbyZamestnanca.length > 0) {
                            addDebug("  ✅ Našiel " + sadzbyZamestnanca.length + " sadzieb");
                            linksFromSuccess = true;
                        } else {
                            addError("Zamestnanec " + menoZamestnanca + " nemá sadzby", "krok2_2_linksFrom_zamestnanec_" + i);
                            pocetChyb++;
                        }
                    } catch (linksError) {
                        addError("LinksFrom zlyhalo pre " + menoZamestnanca + ": " + linksError.toString(), "krok2_2_linksFrom_zamestnanec_" + i);
                        pocetChyb++;
                    }
                    
                    if (linksFromSuccess) {
                        // Nájdi najnovšiu platnú sadzbu k dátumu jazdy
                        var aktualnaHodinovka = null;
                        var najnovsiDatum = null;
                        
                        addDebug("  📋 Analyzujem sadzby k dátumu " + moment(datumJazdy).format("DD.MM.YYYY") + ":");
                        
                        for (var j = 0; j < sadzbyZamestnanca.length; j++) {
                            var sadzbaEntry = sadzbyZamestnanca[j];
                            
                            if (!sadzbaEntry) {
                                addDebug("    ⚠️ Sadzba " + j + " je null");
                            } else {
                                try {
                                    var platnostOd = sadzbaEntry.field(CONFIG.sadzbyFields.platnostOd);
                                    var hodinovka = sadzbaEntry.field(CONFIG.sadzbyFields.sadzba);
                                    
                                    addDebug("    📋 Sadzba " + j + ": " + hodinovka + " €/h od " + 
                                            (platnostOd ? moment(platnostOd).format("DD.MM.YYYY") : "?"));
                                    
                                    if (platnostOd && hodinovka && platnostOd <= datumJazdy) {
                                        if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                                            najnovsiDatum = platnostOd;
                                            aktualnaHodinovka = hodinovka;
                                            addDebug("    ✅ Najnovšia platná sadzba: " + hodinovka + " €/h");
                                        }
                                    } else {
                                        addDebug("    ❌ Sadzba neplatná k dátumu");
                                    }
                                } catch (sadzbaFieldError) {
                                    addDebug("    ⚠️ Chyba pri čítaní sadzby " + j + ": " + sadzbaFieldError.toString());
                                }
                            }
                        }
                        
                        if (!aktualnaHodinovka || aktualnaHodinovka <= 0) {
                            addError("Nenašla sa platná sadzba pre " + menoZamestnanca + " k dátumu", "krok2_2_sadzba_zamestnanec_" + i);
                            pocetChyb++;
                        } else {
                            addDebug("  💶 Finálna hodinovka: " + aktualnaHodinovka + " €/h");
                            
                            // Ulož hodinovku do lokálneho poľa
                            hodinovkyZamestnancov[i] = aktualnaHodinovka;
                            addDebug("  💾 Hodinovka uložená lokálne: " + aktualnaHodinovka + " €/h");
                            
                            // Vypočítaj mzdu pre tohto zamestnanca - ZMENENÉ: používa celkový čas
                            var mzdaZamestnanca = aktualnaHodinovka * celkovyCasHodiny;
                            addDebug("  💰 Mzda: " + aktualnaHodinovka + " €/h × " + celkovyCasHodiny.toFixed(2) + " h = " + mzdaZamestnanca.toFixed(2) + " €");
                            
                            // Priebežne pripočítaj k celkovým mzdám
                            celkoveMzdy += mzdaZamestnanca;
                            pocetSpracovanych++;
                        }
                    }
                    
                } catch (zamestnanecError) {
                    addError("Chyba pri spracovaní zamestnanca " + (i + 1) + ": " + zamestnanecError.toString(), "krok2_2_general_zamestnanec_" + i);
                    pocetChyb++;
                }
            }
        }
        
        addDebug("\n📊 KROK 2.2 VÝSLEDKY:");
        addDebug("  ✅ Spracovaných: " + pocetSpracovanych + "/" + posadka.length);
        addDebug("  ❌ Chýb: " + pocetChyb);
        addDebug("  💰 Celkové mzdy: " + celkoveMzdy.toFixed(2) + " €");
        addDebug("  📋 Hodinovky lokálne: [" + hodinovkyZamestnancov.join(", ") + "] €/h");
        addDebug("  ⏱️ Základný čas: " + celkovyCasHodiny.toFixed(2) + " h (celkový čas jazdy + zastávky)");
        
        // Nastav atribút hodinovka s priemernou hodnotou
        if (pocetSpracovanych > 0) {
            var sumaHodinoviek = 0;
            var pocetPlatnychHodinoviek = 0;
            
            for (var h = 0; h < hodinovkyZamestnancov.length; h++) {
                if (hodinovkyZamestnancov[h] > 0) {
                    sumaHodinoviek += hodinovkyZamestnancov[h];
                    pocetPlatnychHodinoviek++;
                }
            }
            
            if (pocetPlatnychHodinoviek > 0) {
                var priemernaHodinovka = sumaHodinoviek / pocetPlatnychHodinoviek;
                addDebug("  🧮 Priemerná hodinovka: " + priemernaHodinovka.toFixed(2) + " €/h");
                
                // Skús nastavenie atribútov s error handling - ✅ SPRÁVNE API podľa dokumentácie
                var atributSuccess = false;
                
                try {
                    // ✅ SPRÁVNE: entry().field("pole")[index].setAttr("atribút", hodnota)
                    var posadkaPole = entry().field(CONFIG.fields.posadka);
                    if (posadkaPole && posadkaPole.length > 0) {
                        // Nastav priemerná hodinovka pre prvého člena ako reprezentatívnu hodnotu
                        posadkaPole[0].setAttr("hodinovka", priemernaHodinovka);
                        addDebug("  ✅ Atribút hodinovka nastavený (priemerná na prvom členovi)");
                        atributSuccess = true;
                    }
                } catch (attr1Error) {
                    addDebug("  ❌ Atribút hodinovka zlyhalo: " + attr1Error.toString());
                }
                
                // Skús nastavenie individuálnych atribútov pre každého člena posádky
                if (!atributSuccess) {
                    try {
                        addDebug("  🔄 Skúšam individuálne atribúty pre každého člena...");
                        var individualSuccess = 0;
                        var posadkaPole2 = entry().field(CONFIG.fields.posadka);
                        
                        for (var p = 0; p < posadkaPole2.length; p++) {
                            if (hodinovkyZamestnancov[p] > 0) {
                                try {
                                    posadkaPole2[p].setAttr("hodinovka", hodinovkyZamestnancov[p]);
                                    addDebug("    💾 Člen " + (p + 1) + " hodinovka: " + hodinovkyZamestnancov[p] + " €/h");
                                    individualSuccess++;
                                } catch (individualError) {
                                    addDebug("    ❌ Člen " + (p + 1) + " atribút zlyhalo: " + individualError.toString());
                                }
                            }
                        }
                        
                        if (individualSuccess > 0) {
                            addDebug("  ✅ Individuálne atribúty nastavené pre " + individualSuccess + " členov");
                            atributSuccess = true;
                        }
                    } catch (attr2Error) {
                        addDebug("  ❌ Individuálne atribúty zlyhali: " + attr2Error.toString());
                    }
                }
                
                // Overenie nastavenia atribútov
                if (atributSuccess) {
                    try {
                        var posadkaPoleCheck = entry().field(CONFIG.fields.posadka);
                        for (var check = 0; check < Math.min(posadkaPoleCheck.length, 3); check++) {
                            var kontrolaHodinovka = posadkaPoleCheck[check].attr("hodinovka");
                            if (kontrolaHodinovka) {
                                addDebug("  ✅ Overenie člen " + (check + 1) + ": " + kontrolaHodinovka + " €/h");
                            }
                        }
                    } catch (checkError) {
                        addDebug("  ⚠️ Chyba pri overení atribútov: " + checkError.toString());
                    }
                } else {
                    addDebug("  💡 Poznámka: Hodinovky sú uložené lokálne v scripte");
                }
            }
        }
        
        if (pocetSpracovanych > 0) {
            step2Success = true;
        } else {
            addError("Žiadni zamestnanci neboli úspešne spracovaní", "krok2_2");
        }
    }
    
    if (step1Success && step2Success) {
        // KROK 2.3: Finalizácia a uloženie miezd
        addDebug("💾 KROK 2.3: Finalizácia miezd...");
        
        try {
            var finalMzdy = Math.round(celkoveMzdy * 100) / 100;
            currentEntry.set(CONFIG.fields.mzdy, finalMzdy);
            addDebug("  💾 Mzdové náklady uložené: " + finalMzdy + " €");
            step3Success = true;
        } catch (saveError) {
            addError("Nepodarilo sa uložiť mzdové náklady: " + saveError.toString(), "krok2_3");
        }
    }
    
    if (step1Success && step2Success && step3Success) {
        addDebug("✅ MZDOVÉ NÁKLADY ÚSPEŠNE DOKONČENÉ (CELKOVÝ ČAS)");
        return {
            success: true,
            totalMzdy: celkoveMzdy,
            pocetSpracovanych: pocetSpracovanych,
            pocetChyb: pocetChyb,
            pocetCelkom: posadka.length,
            celkovyCas: celkovyCasHodiny
        };
    } else {
        addDebug("❌ Výpočet mzdových nákladov neúspešný");
        return false;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA - SUCCESS FLAG WORKFLOW
// ==============================================

function hlavnaFunkcia() {
    addDebug("🚀 === ŠTART KNIHA JÁZD WORKFLOW (FIXED) ===");
    
    var currentEntry = entry();
    var globalSuccess = false;
    
    addDebug("Debug režim: VŽDY AKTÍVNY");
    addDebug("✅ OPRAVY v tejto verzii:");
    addDebug("  - Pridaná funkcia getDefaultZdrzanie()");
    addDebug("  - Pridaná funkcia convertDurationToHours()");
    addDebug("  - Opravená funkcia isZdrztanieEmpty()");
    addDebug("  - Používa sa calculateTotalTimeFromAttributes() namiesto estimate");
    addDebug("  - Default zdržanie sa nastavuje len ak je prázdne alebo 0");
    addDebug("Nové polia: Čas na zastávkach='" + CONFIG.fields.casNaZastavkach + "', Celkový čas='" + CONFIG.fields.celkovyCas + "'");
    addDebug("Nové atribúty: trvanie='" + CONFIG.attributes.trvanie + "', zdržanie='" + CONFIG.attributes.zdrzanie + "', km='" + CONFIG.attributes.km + "'");
    addDebug("Mzdové náklady sa počítajú z celkového času namiesto času jazdy");
    
    // Vymaž predchádzajúce logy hneď na začiatku
    currentEntry.set(CONFIG.debugFieldName, "");
    currentEntry.set(CONFIG.errorFieldName, "");
    addDebug("🧹 Vymazané predchádzajúce logy");
    
    // Reset performance metrics
    performanceMetrics = {
        osrmSuccessCount: 0,
        totalApiCalls: 0,
        totalResponseTime: 0,
        errorCount: 0
    };
    
    // Test HTTP funkcionality
    try {
        var testHttp = http();
        if (testHttp) {
            addDebug("✅ HTTP funkcia dostupná v Memento");
        } else {
            addDebug("❌ HTTP funkcia nedostupná");
        }
    } catch (httpError) {
        addDebug("❌ HTTP funkcia chyba: " + httpError);
    }
    
    var trasaResult = false;
    var soferResult = false;
    var mzdyResult = false;
    
    // KROK 1: Výpočet vzdialenosti, času trasy a atribútov
    addDebug("\n📏 === FÁZA 1: VÝPOČET TRASY S ATRIBÚTMI ===");
    try {
        trasaResult = calculateRouteDistanceAndTime();
        if (trasaResult && trasaResult.success) {
            addDebug("✅ Fáza 1 úspešná - trasa s atribútmi vypočítaná");
            globalSuccess = true;
        } else {
            addDebug("❌ Fáza 1 neúspešná - trasu sa nepodarilo vypočítať");
        }
    } catch (trasaError) {
        addError("Kritická chyba pri výpočte trasy: " + trasaError.toString(), "main_trasa");
    }
    
    // KROK 1.5: Kontrola a linkovanie šoféra do posádky
    addDebug("\n👨‍✈️ === FÁZA 1.5: KONTROLA ŠOFÉRA ===");
    try {
        soferResult = kontrolujSoferaVPosadke();
        if (soferResult) {
            addDebug("✅ Fáza 1.5 - šofér pridaný do posádky");
        } else {
            addDebug("ℹ️ Fáza 1.5 - šofér už bol v posádke alebo nie je vyplnený");
        }
    } catch (soferError) {
        addError("Kritická chyba pri kontrole šoféra: " + soferError.toString(), "main_sofer");
    }
    
    // KROK 2: Výpočet mzdových nákladov posádky s celkovým časom
    addDebug("\n💰 === FÁZA 2: VÝPOČET MZDOVÝCH NÁKLADOV (CELKOVÝ ČAS) ===");
    if (trasaResult && trasaResult.success) {
        try {
            mzdyResult = calculateMzdy();
            if (mzdyResult && mzdyResult.success) {
                addDebug("✅ Fáza 2 úspešná - mzdové náklady vypočítané z celkového času");
            } else {
                addDebug("❌ Fáza 2 neúspešná - mzdové náklady sa nepodarilo vypočítať");
            }
        } catch (mzdyError) {
            addError("Kritická chyba pri výpočte mzdových nákladov: " + mzdyError.toString(), "main_mzdy");
        }
    } else {
        addDebug("⚠️ Preskakujem výpočet mzdových nákladov - celkový čas nie je dostupný");
    }
    
    // Finalizácia a správa používateľovi
    addDebug("\n🏁 === KONIEC KNIHA JÁZD WORKFLOW (FIXED) ===");
    
    saveLogs();
    
    // Zostavy finálnu správu
    var finalMessage = "";
    
    if (globalSuccess) {
        finalMessage = "✅ Kniha jázd dokončená! (OPRAVENÁ VERZIA)\n\n";
        
        // Správa o trase
        if (trasaResult && trasaResult.success) {
            var casJazdyMinutes = Math.round(trasaResult.casJazdy * 60);
            var casNaZastavkachMinutes = Math.round(trasaResult.casNaZastavkach * 60);
            var celkovyCasMinutes = Math.round(trasaResult.celkovyCas * 60);
            
            var casJazdyDisplay = casJazdyMinutes >= 60 ? 
                Math.floor(casJazdyMinutes / 60) + "h " + (casJazdyMinutes % 60) + "min" : 
                casJazdyMinutes + "min";
            var casNaZastavkachDisplay = casNaZastavkachMinutes >= 60 ? 
                Math.floor(casNaZastavkachMinutes / 60) + "h " + (casNaZastavkachMinutes % 60) + "min" : 
                casNaZastavkachMinutes + "min";
            var celkovyCasDisplay = celkovyCasMinutes >= 60 ? 
                Math.floor(celkovyCasMinutes / 60) + "h " + (celkovyCasMinutes % 60) + "min" : 
                celkovyCasMinutes + "min";
                
            finalMessage += "📏 Vzdialenosť: " + trasaResult.distance.toFixed(1) + " km\n";
            finalMessage += "🚗 Čas jazdy: " + casJazdyDisplay + "\n";
            finalMessage += "⏸️ Čas na zastávkach: " + casNaZastavkachDisplay + "\n";
            finalMessage += "⏱️ Celkový čas: " + celkovyCasDisplay + "\n";
            finalMessage += "🗺️ OSRM úspechy: " + trasaResult.osrmCount + "/" + trasaResult.totalSegments + " segmentov\n";
            
            if (trasaResult.atributResult) {
                finalMessage += "🏷️ Atribúty: " + trasaResult.atributResult.totalSuccess + " nastavených\n";
                if (trasaResult.atributResult.totalErrors > 0) {
                    finalMessage += "⚠️ Atribút chyby: " + trasaResult.atributResult.totalErrors + " (pozrite Debug_Log)\n";
                }
            }
        }
        
        // Správa o šofér kontrole
        if (soferResult) {
            finalMessage += "\n👨‍✈️ Šofér pridaný do posádky\n";
        }
        
        // Správa o mzdových nákladoch
        if (mzdyResult && mzdyResult.success) {
            finalMessage += "\n💰 Mzdové náklady: " + mzdyResult.totalMzdy.toFixed(2) + " €\n";
            finalMessage += "👥 Spracovaných: " + mzdyResult.pocetSpracovanych + "/" + mzdyResult.pocetCelkom + " členov\n";
            finalMessage += "⏰ Základ: " + mzdyResult.celkovyCas.toFixed(2) + " h (celkový čas)\n";
            
            if (mzdyResult.pocetChyb > 0) {
                finalMessage += "⚠️ Chyby: " + mzdyResult.pocetChyb + " členov (pozrite Error_Log)\n";
            }
        }
        
        // Performance metrics
        if (performanceMetrics.totalApiCalls > 0) {
            var successRate = Math.round(performanceMetrics.osrmSuccessCount / performanceMetrics.totalApiCalls * 100);
            finalMessage += "\n📊 API performance: " + successRate + "% úspešnosť";
        }
        
        message(finalMessage);
    } else {
        var chybovaSprava = "❌ Kniha jázd sa nepodarila dokončiť!\n";
        if (errorLog.length > 0) {
            chybovaSprava += "Pozrite Error_Log pre detaily.";
        }
        message(chybovaSprava);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

addDebug("=== INICIALIZÁCIA KNIHA JÁZD SCRIPTU (FIXED) ===");
addDebug("Script verzia: v2.2.0 - Fixed default zdržanie + improved Duration handling");
addDebug("Timestamp: " + moment().format("DD.MM.YY HH:mm:ss"));

try {
    hlavnaFunkcia();
} catch (kritickachyba) {
    addError("KRITICKÁ CHYBA: " + kritickachyba.toString(), "main");
    saveLogs();
    message("❌ KRITICKÁ CHYBA! Pozrite Error_Log.");
}