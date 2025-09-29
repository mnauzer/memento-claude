// Získanie Telegram ID pre Rasťa Škubala cez Memento API

// Simulácia Memento prostredia pre script
function findRastoTelegramId() {
    try {
        // Načítaj MementoCore a Config
        if (typeof MementoCore === 'undefined' || typeof MementoConfig === 'undefined') {
            throw new Error("Memento moduly nie sú dostupné");
        }

        var core = MementoCore;
        var config = MementoConfig.getConfig();

        // Získaj knižnicu Zamestnanci
        var employeesLibName = config.libraries.employees; // "Zamestnanci"
        var employeesLib = libByName(employeesLibName);

        if (!employeesLib) {
            throw new Error("Knižnica " + employeesLibName + " nenájdená");
        }

        core.addDebug(entry(), "📚 Prehľadávam knižnicu: " + employeesLib.title);

        // Hľadaj podľa mena a priezviska
        var searchTerms = ["Rašťo", "Rasto", "Škubal", "Skubal"];
        var foundEmployee = null;

        var allEmployees = employeesLib.entries();
        core.addDebug(entry(), "👥 Celkovo zamestnancov: " + allEmployees.length);

        for (var i = 0; i < allEmployees.length; i++) {
            var employee = allEmployees[i];

            // Získaj možné mená
            var firstName = core.safeGet(employee, "Meno", "");
            var lastName = core.safeGet(employee, "Priezvisko", "");
            var nick = core.safeGet(employee, "Nick", "");
            var name = core.safeGet(employee, "Názov", "");

            // Kombinuj všetky možné varianty
            var fullText = (firstName + " " + lastName + " " + nick + " " + name).toLowerCase();

            // Kontrola zhody
            var match = false;
            for (var j = 0; j < searchTerms.length; j++) {
                if (fullText.includes(searchTerms[j].toLowerCase())) {
                    match = true;
                    break;
                }
            }

            if (match) {
                foundEmployee = employee;
                core.addDebug(entry(), "✅ Nájdený zamestnanec:");
                core.addDebug(entry(), "  • Meno: " + firstName);
                core.addDebug(entry(), "  • Priezvisko: " + lastName);
                core.addDebug(entry(), "  • Nick: " + nick);
                core.addDebug(entry(), "  • Názov: " + name);
                core.addDebug(entry(), "  • ID: " + employee.field("ID"));
                break;
            }
        }

        if (!foundEmployee) {
            core.addError(entry(), "Rasťo Škubal nenájdený v knižnici Zamestnanci", "findRastoTelegramId");
            return null;
        }

        // Hľadaj Telegram ID
        var telegramIdField = config.fields.employees.telegramId || "Telegram ID";
        var telegramId = core.safeGet(foundEmployee, telegramIdField);

        if (!telegramId) {
            // Skús alternatívne názvy polí
            var alternatives = ["Telegram", "TelegramID", "Telegram_ID", "telegram_id", "Chat ID"];
            for (var k = 0; k < alternatives.length; k++) {
                telegramId = core.safeGet(foundEmployee, alternatives[k]);
                if (telegramId) {
                    core.addDebug(entry(), "📱 Telegram ID nájdené v poli: " + alternatives[k]);
                    break;
                }
            }
        }

        if (telegramId) {
            core.addDebug(entry(), "📱 Telegram ID: " + telegramId);

            // Ulož do info poľa aktuálneho záznamu
            var info = "🔍 TELEGRAM ID NÁJDENÉ\n";
            info += "Zamestnanec: " + core.safeGet(foundEmployee, "Meno") + " " + core.safeGet(foundEmployee, "Priezvisko") + "\n";
            info += "Telegram ID: " + telegramId + "\n";
            info += "Pole: " + telegramIdField + "\n";
            info += "Čas: " + moment().format("DD.MM.YYYY HH:mm:ss");

            if (typeof entry !== 'undefined' && entry()) {
                entry().set("info", info);
            }

            return telegramId;

        } else {
            core.addError(entry(), "Telegram ID nie je vyplnené pre zamestnanca", "findRastoTelegramId");

            // Vypíš dostupné polia pre debugging
            core.addDebug(entry(), "📋 Dostupné polia:");
            var fields = foundEmployee.fields();
            for (var f = 0; f < Math.min(fields.length, 20); f++) {
                var field = fields[f];
                core.addDebug(entry(), "  • " + field.name + ": " + foundEmployee.field(field.name));
            }

            return null;
        }

    } catch (error) {
        if (typeof MementoCore !== 'undefined') {
            MementoCore.addError(entry(), "Chyba pri hľadaní Telegram ID: " + error.toString(), "findRastoTelegramId", error);
        } else {
            console.log("Chyba:", error.toString());
        }
        return null;
    }
}

// Spusti hľadanie
var rastoTelegramId = findRastoTelegramId();

if (rastoTelegramId) {
    console.log("✅ Úspech! Telegram ID: " + rastoTelegramId);
} else {
    console.log("❌ Telegram ID sa nepodarilo nájsť");
}