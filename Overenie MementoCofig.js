// Test script v JS knižnici
var config = MementoConfig.getConfig('attendance');
var attrs = MementoConfig.getAttendanceAttributes();

message("Config version: " + MementoConfig.version + "\n" +
        "Attendance fields: " + Object.keys(config.fieldMappings.attendance).length + "\n" +
        "Attributes: " + Object.keys(attrs).join(", "));