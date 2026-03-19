// Dochádzka - Validácia (Action)
// Pridaj JS knižnice: Dochadzka

var result = Dochadzka.validateEntry(entry(), {});

if (!result.valid) {
    dialog("Validácia zlyhala", 
           result.errors.join("\n"), 
           "OK");
    cancel();
}

dialog("Validácia OK", 
       "✅ Všetky povinné polia sú vyplnené správne", 
       "OK");
