// ==============================================
// DEBUG TEST PRE CONFIG vs CENTRALCONFIG
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;

function debugConfigTest() {
    try {
        var info = "=== CONFIG DEBUG TEST ===\n\n";

        info += "config typ: " + typeof config + "\n";
        info += "centralConfig typ: " + typeof centralConfig + "\n";
        info += "config === centralConfig: " + (config === centralConfig) + "\n\n";

        info += "config.constants exists: " + (config.constants ? "YES" : "NO") + "\n";
        info += "centralConfig.constants exists: " + (centralConfig.constants ? "YES" : "NO") + "\n\n";

        if (config.constants) {
            info += "config.constants.obligationTypes: " + (config.constants.obligationTypes ? "YES" : "NO") + "\n";
        }

        if (centralConfig.constants) {
            info += "centralConfig.constants.obligationTypes: " + (centralConfig.constants.obligationTypes ? "YES" : "NO") + "\n";
        } else {
            info += "centralConfig.constants je undefined!\n";
        }

        // Pozri na kľúče
        info += "\nconfig keys: " + Object.keys(config).join(", ") + "\n";
        info += "centralConfig keys: " + Object.keys(centralConfig).join(", ") + "\n";

        dialog()
            .title("CONFIG DEBUG")
            .text(info)
            .positiveButton("OK", function() {})
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA")
            .text("Error: " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

debugConfigTest();