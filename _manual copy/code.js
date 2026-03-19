  var currentEntry = entry();
  var result = Dochadzka.calculateAttendance(currentEntry, {});

  if (!result.success) {
      message("❌ Chyba: " + result.error);
      cancel();
  } else {
      message("✅ Prepočet dokončený");
  }
