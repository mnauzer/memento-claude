Kontext projektu
Máš pred sebou kompletný Memento framework - modulárny JavaScript systém pre Memento Database. Všetky súbory používajú MementoUtils knižnicu a jej moduly (MementoCore, MementoConfig, MementoTelegram, atď.).

Cieľ implementácie
Potrebujem implementovať bidirectional linkage systém medzi zdrojovými záznamami a notifikáciami s týmito funkciami:

Linkage pri vytvorení - Nová notifikácia sa automaticky linkne k zdrojovému záznamu

Cleanup starých notifikácií - Pri editácii záznamu sa staré notifikácie vymažú (vrátane Telegram správ)

Info polia - Backup do info a info_telegram polí pre recovery

Orphan cleanup - Helper na vymazanie osirelých notifikácií

Technické požiadavky
1. Aktualizácia MementoConfig7.js
Pridaj nové polia do common sekcie:

javascript
common: {
    // existujúce polia...
    notifications: "Notifikácie",      // LinkToEntry field
    infoTelegram: "info_telegram"      // Text field pre Telegram backup
}
2. Nové funkcie v MementoCore7.js
Implementuj tieto funkcie s plnou error handling a dokumentáciou: (niektoré už sú vytvorené len skontroluj ich funkcionalitu)

javascript
/**
 * Získa všetky linkované notifikácie pre daný záznam
 * @param {Entry} entry - Zdrojový záznam
 * @returns {Array} Pole notifikácií alebo prázdne pole
 */
function getLinkedNotifications(entry) {
    // Implementation s try/catch a lazy loading
}

/**
 * Linkuje notifikáciu k zdrojovému záznamu (bidirectional)
 * @param {Entry} sourceEntry - Zdrojový záznam
 * @param {Entry} notificationEntry - Notifikácia
 * @returns {boolean} Úspech operácie
 */
function linkNotificationToSource(sourceEntry, notificationEntry) {
    // Bidirectional linking cez notifications pole
}

/**
 * Vymaže notifikáciu vrátane Telegram správy
 * @param {Entry} notificationEntry - Notifikácia na vymazanie
 * @returns {Object} {success: boolean, telegramDeleted: boolean, error: string}
 */
function deleteNotificationAndTelegram(notificationEntry) {
    // 1. Backup do info_telegram
    // 2. Pokus o vymazanie Telegram správy
    // 3. Vymazanie notification entry
}

/**
 * Cleanup osirelých notifikácií (bez zdrojového záznamu)
 * @param {string} libraryName - Názov knižnice (optional)
 * @returns {Object} {cleaned: number, errors: Array}
 */
function cleanupOrphanedNotifications(libraryName) {
    // Nájdi notifikácie bez platného zdroja
    // Bulk cleanup operácia
}

/**
 * Vymaže staré notifikácie pre daný záznam
 * @param {Entry} sourceEntry - Zdrojový záznam
 * @returns {Object} {deleted: number, errors: Array}
 */
function deleteOldNotifications(sourceEntry) {
    // Získaj linkované notifikácie
    // Vymaž ich jedna po druhej s error handling
}
3. Aktualizácia Universal-Group-Notifications.js
V funkcii createNotification() pridaj na koniec:

javascript
// NOVÉ: Linkuj notifikáciu k zdrojovému záznamu
var linkSuccess = utils.linkNotificationToSource(currentEntry, notification);
if (!linkSuccess) {
    utils.addError(currentEntry, "Zlyhalo linkovanie notifikácie k záznamu", "createNotification");
    // Pokračuj aj tak - notifikácia je vytvorená
}

utils.addDebug(currentEntry, " • Notifikácia zalinkovaná k záznamu");
4. Aktualizácia Group-Notifications-9.js
Rovnakú zmenu ako v Universal-Group-Notifications.js.

5. Nový súbor: Notification-Cleanup-Helper.js
Vytvor standalone helper script s týmito funkciami:

javascript
// Bulk cleanup všetkých osirelých notifikácií
function cleanupAllOrphanedNotifications() {
    // Iteruj cez všetky notifikácie
    // Skontroluj existence zdrojového záznamu
    // Vymaž orphans
}

// Recovery z info_telegram polí
function recoverTelegramInfo() {
    // Nájdi záznamy s info_telegram obsahom
    // Parsuj a zobraz info o vymazaných správach
}

// Štatistiky notifikácií
function getNotificationStats() {
    // Počty notifikácií podľa stavu
    // Orphaned notifications count
    // Telegram správy vs lokálne notifikácie
}
6. Safe Workflow Template
Vytvor Safe-Workflow-Template.js s týmto pattern:

javascript
function safeNotificationWorkflow(currentEntry) {
    var success = false;
    var oldNotifications = [];
    
    try {
        // 1. Backup existujúcich notifikácií
        oldNotifications = utils.getLinkedNotifications(currentEntry);
        utils.addDebug(currentEntry, "Backup: " + oldNotifications.length + " notifikácií");
        
        // 2. Vytvor info polia (bezpečná operácia)
        var infoSuccess = createInfoFields(currentEntry);
        if (!infoSuccess) {
            throw new Error("Zlyhalo vytvorenie info polí");
        }
        
        // 3. Vymaž staré notifikácie
        var deleteResult = utils.deleteOldNotifications(currentEntry);
        utils.addDebug(currentEntry, "Vymazané: " + deleteResult.deleted + " notifikácií");
        
        // 4. Trigger vytvorenia novej notifikácie sa spustí automaticky
        success = true;
        
    } catch (error) {
        utils.addError(currentEntry, "Workflow zlyhal: " + error.toString(), "safeNotificationWorkflow", error);
        
        // ROLLBACK: Obnov backup ak je možné
        if (oldNotifications.length > 0) {
            utils.addDebug(currentEntry, "Pokúšam sa o rollback...");
            // Rollback logika podľa potreby
        }
    }
    
    return success;
}
Implementačné pravidlá
JavaScript ES5 kompatibilita
Používaj var namiesto let/const

Žiadne arrow functions

Žiadne template literals

Používaj utils. prefix pre všetky MementoUtils funkcie

Error handling pattern
javascript
function functionName(params) {
    try {
        if (!params) {
            utils.addError(entry(), "Chýbajúce parametre", "functionName");
            return false;
        }
        
        // Implementation
        
        return result;
    } catch (error) {
        utils.addError(entry(), "Popis chyby: " + error.toString(), "functionName", error);
        return defaultValue;
    }
}
Lazy loading pattern
javascript
function getConfig() {
    if (!_config && typeof MementoConfig !== 'undefined') {
        _config = MementoConfig.getConfig();
    }
    return _config;
}