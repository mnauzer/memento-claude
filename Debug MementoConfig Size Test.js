// ==============================================
// DEBUG TEST PRE VEĽKOSŤ MEMENTOCONFIG
// ==============================================

var utils = MementoUtils;

function debugConfigSize() {
    try {
        var info = "=== MEMENTOCONFIG SIZE TEST ===\n\n";

        // Test načítania config
        var config = utils.getConfig();
        var centralConfig = utils.config;

        info += "config exists: " + (config ? "YES" : "NO") + "\n";
        info += "centralConfig exists: " + (centralConfig ? "YES" : "NO") + "\n\n";

        if (config) {
            info += "config keys count: " + Object.keys(config).length + "\n";
            info += "config keys: " + Object.keys(config).slice(0, 10).join(", ");
            if (Object.keys(config).length > 10) info += "...";
            info += "\n\n";
        }

        if (centralConfig) {
            info += "centralConfig keys count: " + Object.keys(centralConfig).length + "\n";
            info += "centralConfig keys: " + Object.keys(centralConfig).slice(0, 10).join(", ");
            if (Object.keys(centralConfig).length > 10) info += "...";
            info += "\n\n";
        }

        // Test špecifických sekcií
        info += "--- SPECIFIC SECTIONS ---\n";
        info += "config.fields: " + (config.fields ? "YES" : "NO") + "\n";
        info += "config.constants: " + (config.constants ? "YES" : "NO") + "\n";
        info += "config.icons: " + (config.icons ? "YES" : "NO") + "\n\n";

        info += "centralConfig.fields: " + (centralConfig.fields ? "YES" : "NO") + "\n";
        info += "centralConfig.constants: " + (centralConfig.constants ? "YES" : "NO") + "\n";
        info += "centralConfig.icons: " + (centralConfig.icons ? "YES" : "NO") + "\n\n";

        // Test konkrétnych hodnôt
        if (config.icons) {
            info += "config.icons.work: " + (config.icons.work ? config.icons.work : "MISSING") + "\n";
        }
        if (centralConfig.icons) {
            info += "centralConfig.icons.work: " + (centralConfig.icons.work ? centralConfig.icons.work : "MISSING") + "\n";
        }

        dialog()
            .title("CONFIG SIZE DEBUG")
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

debugConfigSize();