/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry
 * Verzia:      1.8.0
 * Dátum:       2026-03-24
 *
 * DIAGNOSTICKÁ VERZIA — len test či trigger beží.
 */

message("BeforeDelete FIRED!");

try {
    var logsLib = libByName("ASISTANTO Logs");
    if (logsLib) {
        var logEntry = logsLib.createEntry();
        logEntry.set("script", "Podp.Trigger.BeforeDelete");
        logEntry.set("text", "TRIGGER FIRED! entry=" + (typeof entry));
        logEntry.set("memento library", "podpisy");
    }
} catch(e) {
    message("Log err: " + e);
}
