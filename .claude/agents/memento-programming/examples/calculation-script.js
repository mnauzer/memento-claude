// ==============================================
// DOCHÁDZKA PREPOČET - CALCULATION SCRIPT EXAMPLE
// Verzia: 1.0.0 | Dátum: 2026-03-19 | Autor: Agent Example
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================

// 1. MODULE INITIALIZATION
var utils = MementoUtils;
var currentEntry = entry();

// 2. SCRIPT CONFIGURATION
var CONFIG = utils.createScriptConfig({
    scriptName: "Dochádzka Prepočet (Example)",
    version: "1.0.0",
    library: "Dochádzka"
});

// 3. DEPENDENCY VALIDATION
var depCheck = utils.checkAllDependencies();
if (!depCheck.success) {
    dialog("❌ Chýbajúce moduly",
           "Potrebné moduly: " + depCheck.missing.join(", "),
           "OK");
    cancel();
}

// 4. MAIN FUNCTION
function main() {
    try {
        utils.clearLogs(currentEntry, true);
        utils.addDebug(currentEntry, "=== ŠTART PREPOČTU ===", "start");

        var config = MementoConfig.getConfig();

        // === INPUT VALIDATION ===
        var dateField = config.fields.attendance.date;
        var arrivalField = config.fields.attendance.arrival;
        var departureField = config.fields.attendance.departure;

        var date = utils.safeGet(currentEntry, dateField, null);
        var arrival = utils.safeGet(currentEntry, arrivalField, null);
        var departure = utils.safeGet(currentEntry, departureField, null);

        if (!date || !arrival || !departure) {
            utils.addError(currentEntry, "Chýbajú povinné polia", "validateInput");
            dialog("❌ Chyba validácie",
                   "Polia 'Dátum', 'Príchod' a 'Odchod' sú povinné",
                   "OK");
            return false;
        }

        // === CALCULATIONS ===
        var isWeekend = utils.date.isWeekend(date);
        var hours = utils.time.calculateHoursDifference(arrival, departure);
        
        var employeeField = config.fields.attendance.employee;
        var employee = utils.safeGetLinks(currentEntry, employeeField);
        var hourlyRate = 12;
        
        if (employee && employee.length > 0) {
            var emp = employee[0];
            var rateField = config.fields.employees.hourlyRate;
            hourlyRate = utils.safeGet(emp, rateField, 12);
        }
        
        var wage = utils.calculations.calculateDailyWage(hours, hourlyRate);

        // === SET RESULTS ===
        var hoursField = config.fields.attendance.workedHours;
        var wageField = config.fields.attendance.wage;
        
        utils.safeSet(currentEntry, hoursField, hours);
        utils.safeSet(currentEntry, wageField, wage);

        utils.addInfo(currentEntry, "Prepočet dokončený", {
            hours: hours,
            wage: wage,
            isWeekend: isWeekend
        }, {
            scriptName: CONFIG.scriptName,
            scriptVersion: CONFIG.version
        });

        message("✅ Prepočet dokončený");
        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba", "main", error);
        dialog("❌ Chyba", error.toString(), "OK");
        return false;
    }
}

main();
