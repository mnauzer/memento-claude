// ==============================================
// MEMENTO DATABASE - VÝDAJKY MATERIÁLU PREPOČET
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Výdajky materiálu | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Prepočet položiek materiálu (množstvo * cena = cena celkom)
//    - Súčet cien položiek do poľa Suma
//    - Výpočet DPH a Sumy s DPH podľa platnej sadzby
//    - Dopĺňanie cien z knižnice Materiál
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoCore (základné funkcie)
//    - MementoBusiness (business logika a DPH funkcie)
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Výdajky materiálu Prepočet",
    version: "1.0.0",

    // Knižnice
    libraries: {
        materialExpenses: (centralConfig.libraries && centralConfig.libraries.materialExpenses) || "Výdajky materiálu",
        material: (centralConfig.libraries && centralConfig.libraries.inventory) || "Materiál",
        vatRates: (centralConfig.libraries && centralConfig.libraries.vatRatesLib) || "sadzby DPH"
    },

    // Polia Výdajky materiálu
    fields: {
        date: (centralConfig.fields && centralConfig.fields.materialExpenses && centralConfig.fields.materialExpenses.date) || "Dátum",
        items: (centralConfig.fields && centralConfig.fields.materialExpenses && centralConfig.fields.materialExpenses.items) || "Položky",
        sum: (centralConfig.fields && centralConfig.fields.materialExpenses && centralConfig.fields.materialExpenses.sum) || "Suma",
        vat: (centralConfig.fields && centralConfig.fields.materialExpenses && centralConfig.fields.materialExpenses.vat) || "DPH",
        sumWithVat: (centralConfig.fields && centralConfig.fields.materialExpenses && centralConfig.fields.materialExpenses.sumWithVat) || "Suma s DPH",
        transportPrice: (centralConfig.fields && centralConfig.fields.materialExpenses && centralConfig.fields.materialExpenses.transportPrice) || "Cena za prepravu",

        // Spoločné polia
        debugLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.debugLog) || "Debug_Log",
        errorLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.errorLog) || "Error_Log",
        info: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.info) || "info"
    },

    // Polia Materiál
    materialFields: {
        price: (centralConfig.fields && centralConfig.fields.material && centralConfig.fields.material.price) || "Cena"
    },

    // Atribúty položiek
    itemAttributes: {
        quantity: (centralConfig.attributes && centralConfig.attributes.materialExpensesItems && centralConfig.attributes.materialExpensesItems.quantity) || "množstvo",
        price: (centralConfig.attributes && centralConfig.attributes.materialExpensesItems && centralConfig.attributes.materialExpensesItems.price) || "cena",
        totalPrice: (centralConfig.attributes && centralConfig.attributes.materialExpensesItems && centralConfig.attributes.materialExpensesItems.totalPrice) || "cena celkom"
    },

    // Ikony
    icons: (centralConfig.icons) || {
        start: "🚀",
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        money: "💰",
        calculation: "🧮",
        material: "📦"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.start + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

        // Získanie dátumu pre určenie platnej sadzby DPH
        var datum = utils.safeGet(currentEntry, CONFIG.fields.date, moment().toDate());
        utils.addDebug(currentEntry, CONFIG.icons.info + " Dátum pre sadzbu: " + utils.formatDate(datum));

        // Získanie položiek materiálu
        var items = utils.safeGet(currentEntry, CONFIG.fields.items, []);
        if (!items || items.length === 0) {
            utils.addDebug(currentEntry, CONFIG.icons.warning + " Žiadne položky materiálu na prepočet");
            clearCalculatedFields();
            return true;
        }

        utils.addDebug(currentEntry, CONFIG.icons.info + " Počet položiek: " + items.length);

        // Prepočet položiek materiálu
        var calculationResult = calculateMaterialItems(items);
        if (!calculationResult.success) {
            utils.addError(currentEntry, calculationResult.error, "main");
            message(CONFIG.icons.error + " " + calculationResult.error);
            return false;
        }

        var totalSum = calculationResult.totalSum;
        utils.addDebug(currentEntry, CONFIG.icons.success + " Celková suma materiálu: " + utils.formatMoney(totalSum));

        // Pridanie ceny za prepravu
        var transportPrice = utils.safeGet(currentEntry, CONFIG.fields.transportPrice, 0) || 0;
        if (transportPrice > 0) {
            totalSum += transportPrice;
            utils.addDebug(currentEntry, CONFIG.icons.info + " Pripočítaná preprava: " + utils.formatMoney(transportPrice));
        }

        // Nastavenie celkovej sumy bez DPH
        utils.safeSet(currentEntry, CONFIG.fields.sum, totalSum);
        utils.addDebug(currentEntry, CONFIG.icons.money + " Celková suma bez DPH: " + utils.formatMoney(totalSum));

        // Získanie platnej sadzby DPH (použijeme základnú sadzbu)
        var vatRate = 0;
        if (typeof MementoBusiness !== 'undefined' && MementoBusiness.getValidVatRate) {
            try {
                vatRate = MementoBusiness.getValidVatRate(datum, "základná");
                utils.addDebug(currentEntry, CONFIG.icons.success + " Platná sadzba DPH: " + vatRate + "%");
            } catch (error) {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Chyba pri získavaní DPH sadzby, použije sa 0%: " + error.toString());
                vatRate = 0;
            }
        } else {
            utils.addDebug(currentEntry, CONFIG.icons.warning + " MementoBusiness modul nie je dostupný, použije sa DPH 0%");
        }

        // Výpočet DPH a sumy s DPH
        var vatAmount = totalSum * (vatRate / 100);
        var sumWithVat = totalSum + vatAmount;

        // Nastavenie hodnôt
        utils.safeSet(currentEntry, CONFIG.fields.vat, vatAmount);
        utils.safeSet(currentEntry, CONFIG.fields.sumWithVat, sumWithVat);

        // Vytvorenie info záznamu
        createInfoRecord(totalSum, vatAmount, sumWithVat, vatRate, calculationResult.processedItems);

        utils.addDebug(currentEntry, CONFIG.icons.success + " === PREPOČET MATERIÁLU DOKONČENÝ ===");

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message(CONFIG.icons.error + " Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// VÝPOČTOVÉ FUNKCIE
// ==============================================

function calculateMaterialItems(items) {
    try {
        var totalSum = 0;
        var processedItems = 0;

        utils.addDebug(currentEntry, CONFIG.icons.calculation + " Spúšťam prepočet materiálnych položiek...");

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (!item) {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Položka[" + i + "] je prázdna - preskakujem");
                continue;
            }

            // Získanie množstva
            var quantity = parseFloat(utils.safeGetAttribute(item, CONFIG.itemAttributes.quantity) || 0);
            if (quantity <= 0) {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Položka[" + i + "] nemá platné množstvo - preskakujem");
                continue;
            }

            // Získanie ceny
            var price = parseFloat(utils.safeGetAttribute(item, CONFIG.itemAttributes.price) || 0);

            // Ak nie je cena zadaná, pokús sa ju získať z knižnice Materiál
            if (price <= 0) {
                price = getMaterialPrice(item);
                if (price > 0) {
                    // Nastav cenu späť do atribútu
                    utils.safeSetAttribute(item, CONFIG.itemAttributes.price, price);
                    utils.addDebug(currentEntry, CONFIG.icons.info + " Doplnená cena z knižnice: " + utils.formatMoney(price));
                }
            }

            if (price <= 0) {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Položka[" + i + "] nemá platnú cenu - preskakujem");
                continue;
            }

            // Výpočet celkovej ceny položky
            var itemTotal = quantity * price;

            // Nastavenie celkovej ceny späť do atribútu
            utils.safeSetAttribute(item, CONFIG.itemAttributes.totalPrice, itemTotal);

            totalSum += itemTotal;
            processedItems++;

            utils.addDebug(currentEntry, CONFIG.icons.material + " Položka[" + i + "]: " + quantity + " x " + utils.formatMoney(price) + " = " + utils.formatMoney(itemTotal));
        }

        utils.addDebug(currentEntry, CONFIG.icons.success + " Spracovaných položiek: " + processedItems + "/" + items.length);

        return {
            success: true,
            totalSum: totalSum,
            processedItems: processedItems
        };

    } catch (error) {
        return {
            success: false,
            error: "Chyba pri prepočte položiek: " + error.toString()
        };
    }
}

function getMaterialPrice(item) {
    try {
        // Získaj knižnicu Materiál
        var materialLib = lib(CONFIG.libraries.material);
        if (!materialLib) {
            utils.addDebug(currentEntry, CONFIG.icons.warning + " Knižnica " + CONFIG.libraries.material + " neexistuje");
            return 0;
        }

        // Nájdi cenu v prepojenom zázname
        var materialPrice = utils.safeGet(item, CONFIG.materialFields.price, 0);

        if (materialPrice > 0) {
            utils.addDebug(currentEntry, CONFIG.icons.success + " Nájdená cena materiálu: " + utils.formatMoney(materialPrice));
            return parseFloat(materialPrice);
        }

        utils.addDebug(currentEntry, CONFIG.icons.warning + " Cena materiálu nie je nastavená");
        return 0;

    } catch (error) {
        utils.addDebug(currentEntry, CONFIG.icons.error + " Chyba pri získavaní ceny materiálu: " + error.toString());
        return 0;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function clearCalculatedFields() {
    try {
        utils.safeSet(currentEntry, CONFIG.fields.sum, 0);
        utils.safeSet(currentEntry, CONFIG.fields.vat, 0);
        utils.safeSet(currentEntry, CONFIG.fields.sumWithVat, 0);
        utils.addDebug(currentEntry, CONFIG.icons.info + " Vypočítané polia vyčistené");
    } catch (error) {
        utils.addDebug(currentEntry, CONFIG.icons.error + " Chyba pri čistení polí: " + error.toString());
    }
}

function createInfoRecord(totalSum, vatAmount, sumWithVat, vatRate, processedItems) {
    try {
        var infoText = CONFIG.icons.material + " VÝDAJKY MATERIÁLU - PREPOČET\\n\\n";

        infoText += "📊 SÚHRN:\\n";
        infoText += "• Spracované položky: " + processedItems + "\\n";
        infoText += "• Suma bez DPH: " + utils.formatMoney(totalSum) + "\\n";
        infoText += "• DPH (" + vatRate + "%): " + utils.formatMoney(vatAmount) + "\\n";
        infoText += "• Suma s DPH: " + utils.formatMoney(sumWithVat) + "\\n\\n";

        infoText += "⏰ Prepočet: " + utils.formatDateTime(moment()) + "\\n";
        infoText += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version;

        utils.safeSet(currentEntry, CONFIG.fields.info, infoText);
        utils.addDebug(currentEntry, CONFIG.icons.success + " Info záznam vytvorený");

    } catch (error) {
        utils.addDebug(currentEntry, CONFIG.icons.error + " Chyba pri vytváraní info záznamu: " + error.toString());
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();