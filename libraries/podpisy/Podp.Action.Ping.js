var _ms = typeof MementoSign !== 'undefined' ? "YES v" + (MementoSign.version || "?") : "NO";
dialog("PING", "Script funguje!\nMementoSign: " + _ms + "\nentry: " + (typeof entry), "OK");
