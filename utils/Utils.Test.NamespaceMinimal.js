/**
 * ============================================================================
 * MINIMAL TEST - Namespace Pattern v Memento Database
 * ============================================================================
 *
 * Účel: Zistiť či Memento Database podporuje IIFE namespace pattern
 */

var output = "📋 MINIMAL NAMESPACE TEST\n";
output += "═════════════════════════════════════════\n\n";

try {
    // Test 1: Jednoduchý namespace bez IIFE
    output += "TEST 1: Jednoduchý object namespace\n";

    var SimpleNamespace = {
        testFunction: function() {
            return "Hello from SimpleNamespace";
        },
        version: "1.0.0"
    };

    if (typeof SimpleNamespace !== 'undefined') {
        output += "  ✅ SimpleNamespace existuje\n";
        try {
            var result1 = SimpleNamespace.testFunction();
            output += "  ✅ testFunction() funguje: " + result1 + "\n";
        } catch (e) {
            output += "  ❌ testFunction() chyba: " + e.toString() + "\n";
        }
    } else {
        output += "  ❌ SimpleNamespace NEEXISTUJE\n";
    }

    // Test 2: IIFE namespace pattern (ako v CP.AutoNumber.Lib)
    output += "\nTEST 2: IIFE namespace pattern\n";

    var IIFENamespace = (function() {
        function privateFunction() {
            return "Private function result";
        }

        return {
            publicFunction: function() {
                return privateFunction();
            },
            version: "1.0.0"
        };
    })();

    if (typeof IIFENamespace !== 'undefined') {
        output += "  ✅ IIFENamespace existuje\n";
        try {
            var result2 = IIFENamespace.publicFunction();
            output += "  ✅ publicFunction() funguje: " + result2 + "\n";
        } catch (e) {
            output += "  ❌ publicFunction() chyba: " + e.toString() + "\n";
        }
    } else {
        output += "  ❌ IIFENamespace NEEXISTUJE\n";
    }

    // Test 3: IIFE s globálnou funkciou (dual API pattern)
    output += "\nTEST 3: Dual API pattern (global + namespace)\n";

    function globalTestFunction() {
        return "Global function works";
    }

    var DualNamespace = (function() {
        return {
            testMethod: globalTestFunction,
            version: "1.0.0"
        };
    })();

    // Test global
    try {
        var result3a = globalTestFunction();
        output += "  ✅ globalTestFunction() funguje: " + result3a + "\n";
    } catch (e) {
        output += "  ❌ globalTestFunction() chyba: " + e.toString() + "\n";
    }

    // Test namespace
    if (typeof DualNamespace !== 'undefined') {
        output += "  ✅ DualNamespace existuje\n";
        try {
            var result3b = DualNamespace.testMethod();
            output += "  ✅ DualNamespace.testMethod() funguje: " + result3b + "\n";
        } catch (e) {
            output += "  ❌ DualNamespace.testMethod() chyba: " + e.toString() + "\n";
        }
    } else {
        output += "  ❌ DualNamespace NEEXISTUJE\n";
    }

} catch (error) {
    output += "\n❌ KRITICKÁ CHYBA:\n";
    output += error.toString() + "\n";
    if (error.stack) {
        output += "\nStack:\n" + error.stack + "\n";
    }
}

output += "\n═════════════════════════════════════════\n";
output += "✅ TEST DOKONČENÝ\n";

var currentEntry = entry();
currentEntry.set("Debug_Log", output);
message("✅ Minimal test - výsledok v Debug_Log");
