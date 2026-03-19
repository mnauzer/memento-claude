// ==============================================
// TEST - Najjednoduchší test dialógu
// ==============================================
// Typ: Action
// Verzia: 1.0.0
// ==============================================

// KROK 1: Ukáž message
message("Test message - vidíš toto?");

// KROK 2: Ukáž dialog
dialog("Test Dialog", "Ak vidíš tento dialog, dialog() funguje!", "OK");

// KROK 3: Skús libByName
var result = "libByName type: " + typeof libByName;

if (typeof libByName === 'function') {
    result += "\nlibByName is a function ✅";

    try {
        var testLib = libByName("ASISTANTO Logs");
        if (testLib) {
            result += "\nASISTANTO Logs found ✅";
            result += "\nLibrary title: " + testLib.title;
        } else {
            result += "\nASISTANTO Logs NOT found ❌";
        }
    } catch (e) {
        result += "\nERROR: " + e.toString();
    }
} else {
    result += "\nlibByName NOT a function ❌";
}

dialog("Test Results", result, "OK");
