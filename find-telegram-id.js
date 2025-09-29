// Script na nájdenie Telegram ID pre Rasťa Škubala
try {
    var config = MementoConfig.getConfig();
    var core = MementoCore;

    // Získaj knižnicu Zamestnanci
    var employeesLib = libByName(config.libraries.employees);

    if (!employeesLib) {
        console.log("❌ Knižnica Zamestnanci nenájdená");
        console.log("📚 Dostupné knižnice:");
        var allLibs = libraries();
        for (var i = 0; i < allLibs.length; i++) {
            console.log("  • " + allLibs[i].title);
        }
    } else {
        console.log("✅ Knižnica Zamestnanci nájdená: " + employeesLib.title);

        // Hľadaj Rasťa Škubala
        var employees = employeesLib.entries();
        var found = false;

        for (var i = 0; i < employees.length; i++) {
            var employee = employees[i];
            var name = core.safeGet(employee, "Meno") ||
                      core.safeGet(employee, "Názov") ||
                      core.safeGet(employee, "Nick") ||
                      core.safeGet(employee, "Name") || "";

            var surname = core.safeGet(employee, "Priezvisko") ||
                         core.safeGet(employee, "Surname") || "";

            var fullName = (name + " " + surname).toLowerCase();

            if (fullName.includes("rašt") || fullName.includes("rast") ||
                fullName.includes("škub") || fullName.includes("skub") ||
                name.toLowerCase().includes("rašt") || name.toLowerCase().includes("rast")) {

                found = true;
                console.log("👤 Nájdený zamestnanec:");
                console.log("  • Meno: " + name);
                console.log("  • Priezvisko: " + surname);
                console.log("  • ID: " + employee.field("ID"));

                // Hľadaj Telegram ID pole
                var telegramId = core.safeGet(employee, "Telegram ID") ||
                               core.safeGet(employee, "Telegram") ||
                               core.safeGet(employee, "TelegramID") ||
                               core.safeGet(employee, config.fields.employees.telegramId || "Telegram ID");

                if (telegramId) {
                    console.log("📱 Telegram ID: " + telegramId);

                    // Aktualizuj notification súbory
                    updateNotificationFiles(telegramId);

                } else {
                    console.log("❌ Telegram ID nie je vyplnené");
                    console.log("📋 Dostupné polia:");
                    var fields = employee.fields();
                    for (var f = 0; f < fields.length; f++) {
                        var fieldName = fields[f].name;
                        var fieldValue = employee.field(fieldName);
                        if (fieldName.toLowerCase().includes("telegram") ||
                            fieldName.toLowerCase().includes("chat") ||
                            fieldName.toLowerCase().includes("id")) {
                            console.log("  • " + fieldName + ": " + fieldValue);
                        }
                    }
                }
                break;
            }
        }

        if (!found) {
            console.log("❌ Rasťo Škubal nenájdený");
            console.log("👥 Dostupní zamestnanci:");
            for (var i = 0; i < Math.min(employees.length, 10); i++) {
                var emp = employees[i];
                var empName = core.safeGet(emp, "Meno") || core.safeGet(emp, "Názov") || "Bez mena";
                var empSurname = core.safeGet(emp, "Priezvisko") || "";
                console.log("  • " + empName + " " + empSurname + " (ID: " + emp.field("ID") + ")");
            }
        }
    }

} catch (error) {
    console.log("🚨 Chyba:", error.toString());
}

function updateNotificationFiles(telegramId) {
    console.log("🔄 Aktualizujem notification súbory s Telegram ID: " + telegramId);

    // Tu by sa mohli aktualizovať súbory s nájdeným Telegram ID
    // Pre účely tohto scriptu len vypíšem informáciu
    console.log("📝 Telegram ID môžeš použiť v:");
    console.log("  • n8n-task-completion-workflow.json");
    console.log("  • claude-task-notifier.js");
    console.log("  • test súboroch");

    return telegramId;
}