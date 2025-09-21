// ==============================================
// MEMENTO GPS - GPS integrácia
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
// ==============================================
// 🔧 CHANGELOG v1.0:
// ==============================================

var MementoGPS = (function() {
    'use strict';
    
    var version = "1.0.0";
    
    // Lazy loading pre závislosti
    var _config = null;
    var _core = null;
    var _ai = null;
    var _utils = null;

    function getUtils() {
        if (!_utils && typeof MementoUtils !== 'undefined') {
            _utils = MementoUtils;
        }
        return _utils;
    }

    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {  // Oprav na MementoConfig
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
    
    function getAI() {
        if (!_ai && typeof MementoAI !== 'undefined') {
            _ai = MementoAI;
        }
        return _ai;
    }
    var CONFIG = {
        // OSRM API nastavenia
        osrm: {
            maxRetries: 3,
            baseUrl: "https://router.project-osrm.org/route/v1/driving/",
            requestTimeout: 5000
        },
    }
    // ==============================================
    // GPS API - ZÁKLADNÉ FUNKCIE
    // ==============================================
    /**
     * Volanie OSRM API pre výpočet trasy
     */
    function calculateOSRMRoute(start, end) {
        var config = getConfig();
        var core = getCore();
        var currentEntry = entry();
        var result = {
            success: false,
            km: 0,
            trvanie: 0
        };
        
        try {
            if (!http) {
                core.addDebug(currentEntry, "    ❌ HTTP funkcia nie je dostupná");
                return result;
            }
            
            var url = CONFIG.osrm.baseUrl + start.lon + "," + start.lat + ";" + 
                    end.lon + "," + end.lat + "?overview=false";
            
            core.addDebug(currentEntry, "    🌐 OSRM API volanie...");
            
            var retries = 0;
            var response = null;
            
            while (retries < CONFIG.osrm.maxRetries && !response) {
                try {
                    var httpClient = http();
                    httpClient.headers({
                        "Accept": "application/json"
                    });
                    
                    response = httpClient.get(url);
                    
                    if (response.code === 200) {
                        var data = JSON.parse(response.body);
                        
                        if (data.routes && data.routes.length > 0) {
                            var route = data.routes[0];
                            result.km = Math.round(route.distance / 100) / 10; // Metre na km
                            result.trvanie = Math.round(route.duration / 36) / 100; // Sekundy na hodiny
                            result.success = true;
                        }
                    } else {
                        core.addDebug(currentEntry, "    ⚠️ OSRM odpoveď: " + response.code);
                        retries++;
                    }
                    
                } catch (httpError) {
                    core.addDebug(currentEntry, "    ⚠️ HTTP chyba (pokus " + (retries + 1) + "): " + httpError);
                    retries++;
                }
            }
            
        } catch (error) {
            core.addDebug(currentEntry, "    ❌ OSRM API chyba: " + error.toString());
        }
        
        return result;
    }
    
    /**
     * Vypočíta segment trasy pomocou OSRM alebo fallback
     */
    function calculateSegment(start, end, segmentName) {
        var config = getConfig();
        var core = getCore();
        var currentEntry = entry();
        var result = {
            success: false,
            km: 0,
            trvanie: 0,
            metoda: "none"
        };
        
        try {
            core.addDebug(currentEntry, "\n  🛣️ " + segmentName);
            
            if (!start || !end) {
                core.addDebug(currentEntry, "    ❌ Chýbajú súradnice");
                return result;
            }
            
            // Pokus o OSRM API
            result = calculateOSRMRoute(start, end);
            
            if (result.success) {
                core.addDebug(currentEntry, "    ✅ OSRM: " + result.km + " km, " + result.trvanie + " h");
                result.metoda = "OSRM";
            } else {
                // Fallback na vzdušnú vzdialenosť
                var airDistance = calculateAirDistance(start, end);
                var roadFactor = 1.4; // Empirický koeficient pre cestnú vzdialenosť
                var avgSpeed = 50; // Priemerná rýchlosť v km/h
                
                result.km = Math.round(airDistance * roadFactor * 10) / 10;
                result.trvanie = Math.round((result.km / avgSpeed) * 100) / 100;
                result.success = true;
                result.metoda = "Vzdušná čiara";
                
                core.addDebug(currentEntry, "    📐 Vzdušná vzdialenosť: " + result.km + " km, " + result.trvanie + " h");
            }
            
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri výpočte segmentu: " + error.toString(), "calculateSegment");
        }
        
        return result;
    }

   

    /**
     * Extrahuje GPS súradnice z poľa miesta
     */
    function extractGPSFromPlace(place) {
        var config = getConfig();
        var core = getCore();
        var currentEntry = entry();
        if (!place || place.length === 0) {
            return null;
        }
        
        var place = place[0];
        var nazov = utils.safeGet(place, config.fields.place.name, "Neznáme");
        
        core.addDebug(currentEntry, "  📍 Spracovávam miesto: " + nazov);
        
        // Získaj GPS pole - JSGeolocation objekt
        var gpsLocation = null;
        
        try {
            gpsLocation = place.field(config.fields.place.gps);
        } catch (e) {
            core.addDebug(currentEntry, "  ⚠️ Chyba pri získavaní GPS poľa: " + e);
            return null;
        }
        
        if (!gpsLocation) {
            core.addDebug(currentEntry, "  ⚠️ Miesto '" + nazov + "' nemá GPS súradnice");
            return null;
        }
        
        var lat = null;
        var lon = null;
        
        try {
            // JSGeolocation objekt má properties lat a lng
            lat = gpsLocation.lat;
            lon = gpsLocation.lng;
            
            // Debug informácie
            if (gpsLocation.address) {
                core.addDebug(currentEntry, "    Adresa: " + gpsLocation.address);
            }
            core.addDebug(currentEntry, "    Súradnice: " + lat + ", " + lon);
            
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri čítaní GPS objektu: " + error.toString(), "extractGPSFromPlace", error);
            return null;
        }
        
        // Validácia GPS súradníc
        if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
            // Základná validácia rozsahu
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                core.addDebug(currentEntry, "  ✅ GPS úspešne extrahované: " + lat + ", " + lon);
                return { lat: lat, lon: lon };
            } else {
                core.addDebug(currentEntry, "  ❌ GPS súradnice mimo platného rozsahu: " + lat + ", " + lon);
            }
        } else {
            core.addDebug(currentEntry, "  ❌ Neplatné GPS súradnice");
        }
        
        return null;
    }
    /**
     * Volá OSRM API pre výpočet trasy
     */
    function callOSRMRoute(points) {
        try {
            if (!points || points.length < 2) {
                return null;
            }
            
            // Vytvor URL s koordinátmi
            var coordinates = "";
            for (var i = 0; i < points.length; i++) {
                if (i > 0) coordinates += ";";
                coordinates += points[i].lon + "," + points[i].lat;
            }
            
            var url = CONFIG.osrm.baseUrl + coordinates + "?overview=false&steps=false";
            
            core.addDebug(currentEntry, "  🌐 OSRM API volanie pre " + points.length + " bodov");
            
            var response = core.httpRequest("GET", url, null, {}, {
                timeout: CONFIG.osrm.requestTimeout
            });
            
            if (response && response.code === 200) {
                var data = JSON.parse(response.body);
                if (data.routes && data.routes.length > 0) {
                    var route = data.routes[0];
                    return {
                        distance: route.distance / 1000, // prevod na km
                        duration: route.duration / 3600, // prevod na hodiny
                        success: true
                    };
                }
            }
            
            core.addDebug(currentEntry, "  ⚠️ OSRM API nevrátilo trasu");
            return null;
            
        } catch (error) {
            core.addError(currentEntry, "OSRM API chyba: " + error.toString(), "callOSRMRoute", error);
            return null;
        }
    }

    // ==============================================
    // POMOCNÉ FUNKCIE
    // ==============================================
    function toRadians(deg) {
    return deg * (Math.PI / 180);
    }

     /**
     * Vypočíta vzdušnú vzdialenosť medzi dvoma bodmi (Haversine formula)
     */
    function calculateAirDistance(point1, point2) {
      
        var R = 6371; // Polomer Zeme v km
        var dLat = toRadians(point2.lat - point1.lat);
        var dLon = toRadians(point2.lon - point1.lon);
        var lat1 = toRadians(point1.lat);
        var lat2 = toRadians(point2.lat);

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c; // Vzdialenosť v km
        
        return d;
    }

    // ==============================================
    // PUBLIC API
    // ==============================================
     
    return {
        version: version,
        
        // Základné GPS funkcie
        calculateOSRMRoute: calculateOSRMRoute,
        calculateSegment: calculateSegment,
        calculateAirDistance: calculateAirDistance,
        extractGPSFromPlace: extractGPSFromPlace,
        toRadians: toRadians,
        callOSRMRoute: callOSRMRoute,


        
        // POMOCNÉ FUNKCIE

    };
})();