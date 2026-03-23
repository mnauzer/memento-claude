var _ms = typeof MementoSign !== 'undefined' ? "YES v" + (MementoSign.version || "?") : "NO";
dialog().title("PING").text("Script funguje!\nMementoSign: " + _ms + "\nentry: " + (typeof entry)).positiveButton("OK", function() { return true; }).show();
