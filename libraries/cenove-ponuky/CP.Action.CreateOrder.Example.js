/**
 * PRÍKLAD POUŽITIA: CP.Action.CreateOrder.Wrapper
 *
 * Tento súbor demonštruje, ako volať createOrder funkciu z iných scriptov
 */

// ==============================================
// PRÍKLAD 1: Základné použitie v Manual Action
// ==============================================

var utils = MementoUtils;
var currentEntry = entry();

utils.clearLogs(currentEntry);
utils.addDebug(currentEntry, "📋 Vytvorenie zákazky z cenovej ponuky");
utils.addDebug(currentEntry, "");

// Zavolaj wrapper funkciu
var result = CPCreateOrderWrapper.createOrder(currentEntry);

// Spracuj výsledok
if (result.success) {
    utils.addDebug(currentEntry, "✅ ÚSPECH");
    utils.addDebug(currentEntry, "  Režim: " + result.mode);
    utils.addDebug(currentEntry, "  Zákazka: " + utils.safeGet(result.order, "Číslo"));
    utils.addDebug(currentEntry, "  Počet dielov: " + result.parts);

    message(result.message);
} else {
    utils.addDebug(currentEntry, "❌ CHYBA");
    utils.addDebug(currentEntry, "  " + result.message);

    message(result.message);
}

// ==============================================
// PRÍKLAD 2: Použitie v onChange trigger
// ==============================================

/*
var utils = MementoUtils;
var currentEntry = entry();

// Kontrola či sa má vytvoriť zákazka (napr. podľa nejakého podmienky)
var shouldCreateOrder = utils.safeGet(currentEntry, "Vytvoriť zákazku") === "Áno";

if (shouldCreateOrder) {
    var result = CPCreateOrderWrapper.createOrder(currentEntry);

    if (result.success) {
        // Zákazka bola úspešne vytvorená
        currentEntry.set("Zákazka vytvorená", "Áno");
        currentEntry.set("Číslo zákazky", utils.safeGet(result.order, "Číslo"));
    } else {
        // Nepodarilo sa vytvoriť zákazku
        currentEntry.set("Zákazka vytvorená", "Nie");
        currentEntry.set("Chyba", result.message);
    }
}
*/

// ==============================================
// PRÍKLAD 3: Hromadné vytvorenie zákaziek
// ==============================================

/*
var utils = MementoUtils;
var lib = lib();

// Získaj všetky cenové ponuky, ktoré ešte nemajú zákazku
var quotes = lib.entries("Stav", "Schválená");

var successCount = 0;
var failCount = 0;

for (var i = 0; i < quotes.length; i++) {
    var quote = quotes[i];

    // Skontroluj či už existuje zákazka
    var existingOrders = utils.safeGetLinksFrom(quote, "Zákazky", "Cenová ponuka");

    if (existingOrders.length === 0) {
        // Vytvor zákazku
        var result = CPCreateOrderWrapper.createOrder(quote);

        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
    }
}

message("✅ Vytvorených zákaziek: " + successCount + "\n❌ Chybných: " + failCount);
*/

// ==============================================
// PRÍKLAD 4: Použitie s error handlingom
// ==============================================

/*
var utils = MementoUtils;
var currentEntry = entry();

try {
    utils.clearLogs(currentEntry);

    // Pred vytvorením zákazky - validácia
    var quoteNumber = utils.safeGet(currentEntry, "Číslo");
    var quoteParts = utils.safeGetLinks(currentEntry, "Diely") || [];

    if (!quoteNumber) {
        throw new Error("Cenová ponuka nemá číslo");
    }

    if (quoteParts.length === 0) {
        throw new Error("Cenová ponuka nemá žiadne diely");
    }

    // Vytvor zákazku
    var result = CPCreateOrderWrapper.createOrder(currentEntry);

    if (!result.success) {
        throw new Error(result.message);
    }

    // Po vytvorení zákazky - dodatočné akcie
    utils.addDebug(currentEntry, "📧 Poslanie notifikácie...");
    // ... kód pre poslanie emailu/notifikácie

    utils.addDebug(currentEntry, "✅ Proces dokončený");
    message("✅ Zákazka vytvorená a notifikácia odoslaná");

} catch (error) {
    utils.addError(currentEntry, "❌ CHYBA: " + error.toString(), "createOrderExample", error);
    message("❌ Chyba: " + error.toString());
}
*/
