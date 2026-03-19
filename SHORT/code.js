  var currentEntry = entry();

  // Vypíš debug info pred volaním modulu
  log("=== ŠTART PREPOČTU ===");
  log("Modul Dochadzka dostupný: " + (typeof Dochadzka !== 'undefined'));
  log("MementoUtils dostupný: " + (typeof MementoUtils !== 'undefined'));

  var result = Dochadzka.calculateAttendance(currentEntry, {});

  // Po volaní modulu skontroluj Debug_Log
  if (!result.success) {
      message("❌ Chyba: " + result.error);

      // Skús vypísať Debug_Log ak existuje
      var debugLog = currentEntry.field("Debug_Log");
      if (debugLog) {
          log("=== DEBUG LOG ===");
          log(debugLog);
      }

      var errorLog = currentEntry.field("Error_Log");
      if (errorLog) {
          log("=== ERROR LOG ===");
          log(errorLog);
      }

      cancel();
  } else {
      message("✅ Prepočet dokončený");
  }
