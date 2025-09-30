// ==============================================
// MEMENTO DATABASE - PRÍJEMKY MATERIÁLU PREPOČET
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Príjemky materiálu | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Prepočet položiek materiálu (množstvo * cena = cena celkom)
//    - Kontrola a prepočet cien podľa nastavení materiálu
//    - Výpočet prirážok, zaokrúhľovania a DPH
//    - Súčet cien položiek do poľa Suma
//    - Výpočet DPH a Sumy s DPH podľa platnej sadzby
//    - Aktualizácia nákupných cien v materiáli
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
    scriptName: "Príjemky materiálu Prepočet",
    version: "1.0.0",

    // Knižnice
    libraries: {
        materialIncomes: (centralConfig.libraries && centralConfig.libraries.materialIncomes) || "Príjemky materiálu",
        inventory: (centralConfig.libraries && centralConfig.libraries.inventory) || "Materiál",
        vatRates: (centralConfig.libraries && centralConfig.libraries.vatRatesLib) || "sadzby DPH"
    },

    // Polia Príjemky materiálu (podobné ako Výdajky, ale s Dodávateľ namiesto Klient/Zákazka)
    fields: {
        date: (centralConfig.fields && centralConfig.fields.materialIncomes && centralConfig.fields.materialIncomes.date) || "Dátum",
        items: (centralConfig.fields && centralConfig.fields.materialIncomes && centralConfig.fields.materialIncomes.items) || "Položky",
        supplier: (centralConfig.fields && centralConfig.fields.materialIncomes && centralConfig.fields.materialIncomes.supplier) || "Dodávateľ",
        partner: (centralConfig.fields && centralConfig.fields.materialIncomes && centralConfig.fields.materialIncomes.partner) || "Partner",
        sum: (centralConfig.fields && centralConfig.fields.materialIncomes && centralConfig.fields.materialIncomes.sum) || "Suma",
        vat: (centralConfig.fields && centralConfig.fields.materialIncomes && centralConfig.fields.materialIncomes.vat) || "DPH",
        sumWithVat: (centralConfig.fields && centralConfig.fields.materialIncomes && centralConfig.fields.materialIncomes.sumWithVat) || "Suma s DPH",
        transportPrice: (centralConfig.fields && centralConfig.fields.materialIncomes && centralConfig.fields.materialIncomes.transportPrice) || "Cena za prepravu",

        // Spoločné polia
        debugLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.debugLog) || "Debug_Log",
        errorLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.errorLog) || "Error_Log",
        info: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.info) || "info"
    },

    // Polia Materiál (nové polia pre riadenie cien)
    materialFields: {
        name: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.name) || "Názov",
        priceCalculation: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceCalculation) || "Prepočet ceny",
        markupPercentage: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.markupPercentage) || "Obchodná prirážka",
        priceRounding: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceRounding) || "Zaokrúhľovanie cien",
        roundingValue: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.roundingValue) || "Hodnota zaokrúhenia",
        vatRate: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.vatRate) || "sadzba DPH",
        price: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.price) || "Cena",
        priceWithVat: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceWithVat) || "Cena s DPH",
        purchasePrice: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePrice) || "Nákupná cena",
        purchasePriceWithVat: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePriceWithVat) || "Nákupná cena s DPH"
    },

    // Atribúty položiek
    itemAttributes: {
        quantity: (centralConfig.attributes && centralConfig.attributes.materialIncomesItems && centralConfig.attributes.materialIncomesItems.quantity) || "množstvo",
        price: (centralConfig.attributes && centralConfig.attributes.materialIncomesItems && centralConfig.attributes.materialIncomesItems.price) || "cena",
        totalPrice: (centralConfig.attributes && centralConfig.attributes.materialIncomesItems && centralConfig.attributes.materialIncomesItems.totalPrice) || "cena celkom"
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
        utils.clearLogs(currentEntry, [CONFIG.fields.debugLog, CONFIG.fields.errorLog]);
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

        // Prepočet položiek materiálu s kontrolou a prepočtom cien
        var calculationResult = calculateMaterialItems(items, datum);
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
        try {
            vatRate = utils.getValidVatRate(datum, "základná");
            utils.addDebug(currentEntry, CONFIG.icons.success + " Platná sadzba DPH: " + vatRate + "%");
        } catch (error) {
            utils.addDebug(currentEntry, CONFIG.icons.warning + " Chyba pri získavaní DPH sadzby, použije sa 0%: " + error.toString());
            vatRate = 0;
        }

        // Výpočet DPH a sumy s DPH
        var vatAmount = totalSum * (vatRate / 100);
        var sumWithVat = totalSum + vatAmount;

        // Nastavenie hodnôt
        utils.safeSet(currentEntry, CONFIG.fields.vat, vatAmount);
        utils.safeSet(currentEntry, CONFIG.fields.sumWithVat, sumWithVat);

        // Vytvorenie info záznamu
        createInfoRecord(totalSum, vatAmount, sumWithVat, vatRate, calculationResult.processedItems, calculationResult.updatedMaterials);

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

function calculateMaterialItems(items, documentDate) {
    try {
        var totalSum = 0;
        var processedItems = 0;
        var updatedMaterials = 0;

        utils.addDebug(currentEntry, CONFIG.icons.calculation + " Spúšťam prepočet materiálnych položiek...");

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (!item) {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Položka[" + i + "] je prázdna - preskakujem");
                continue;
            }

            // Získanie množstva
            var quantity = parseFloat(item.attr(CONFIG.itemAttributes.quantity) || 0);
            if (quantity <= 0) {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Položka[" + i + "] nemá platné množstvo - preskakujem");
                continue;
            }

            // Získanie nákupnej ceny (musí byť zadaná ručne)
            var purchasePrice = parseFloat(item.attr(CONFIG.itemAttributes.price) || 0);
            if (purchasePrice <= 0) {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Položka[" + i + "] nemá zadanú nákupnú cenu - preskakujem");
                continue;
            }

            // Kontrola a prepočet cien pre daný materiál
            var priceResult = utils.calculateAndUpdateMaterialPrices(item, purchasePrice, documentDate);
            if (priceResult.updated) {
                updatedMaterials++;
            }

            // Výpočet celkovej ceny položky (na základe nákupnej ceny)
            var itemTotal = quantity * purchasePrice;

            // Nastavenie celkovej ceny späť do atribútu
            item.setAttr(CONFIG.itemAttributes.totalPrice, itemTotal);

            totalSum += itemTotal;
            processedItems++;

            // Získaj názov materiálu pre debug
            var materialName = utils.safeGet(item, CONFIG.materialFields.name, "Neznámy materiál");

            utils.addDebug(currentEntry, CONFIG.icons.material + " " + materialName + ": " + quantity + " x " + utils.formatMoney(purchasePrice) + " = " + utils.formatMoney(itemTotal));
        }

        utils.addDebug(currentEntry, CONFIG.icons.success + " Spracovaných položiek: " + processedItems + "/" + items.length);
        utils.addDebug(currentEntry, CONFIG.icons.info + " Aktualizovaných materiálov: " + updatedMaterials);

        return {
            success: true,
            totalSum: totalSum,
            processedItems: processedItems,
            updatedMaterials: updatedMaterials
        };

    } catch (error) {
        return {
            success: false,
            error: "Chyba pri prepočte položiek: " + error.toString()
        };
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


function createInfoRecord(totalSum, vatAmount, sumWithVat, vatRate, processedItems, updatedMaterials) {
    try {
        var date = utils.safeGet(currentEntry, CONFIG.fields.date, moment().toDate());
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
        var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();

        var infoMessage = "📦 PRÍJEMKY MATERIÁLU - AUTOMATICKÝ PREPOČET\n";
        infoMessage += "═══════════════════════════════════════════\n";

        infoMessage += "📅 Dátum: " + dateFormatted + " (" + dayName + ")\n\n";

        // Info o dodávateľovi/partnerovi
        var supplier = utils.safeGet(currentEntry, CONFIG.fields.supplier, null);
        var partner = utils.safeGet(currentEntry, CONFIG.fields.partner, null);

        if (supplier && supplier.length > 0) {
            var supplierName = utils.safeGet(supplier[0], "Názov", "Neznámy dodávateľ");
            infoMessage += "🏭 Dodávateľ: " + supplierName + "\n";
        }
        if (partner && partner.length > 0) {
            var partnerName = utils.safeGet(partner[0], "Názov", "Neznámy partner");
            infoMessage += "🤝 Partner: " + partnerName + "\n";
        }
        if ((supplier && supplier.length > 0) || (partner && partner.length > 0)) {
            infoMessage += "\n";
        }

        infoMessage += "📊 POLOŽKY MATERIÁLU:\n";
        infoMessage += "───────────────────────────────────────────\n";
        infoMessage += "• Spracované položky: " + processedItems + "\n";
        infoMessage += "• Aktualizované materiály: " + updatedMaterials + "\n";

        // Získaj položky pre detail
        var items = utils.safeGet(currentEntry, CONFIG.fields.items, []);
        for (var i = 0; i < Math.min(items.length, 5); i++) { // Zobraz max 5 položiek
            var item = items[i];
            if (item) {
                var materialName = utils.safeGet(item, CONFIG.materialFields.name, "Neznámy materiál");
                var quantity = parseFloat(item.attr(CONFIG.itemAttributes.quantity) || 0);
                var price = parseFloat(item.attr(CONFIG.itemAttributes.price) || 0);
                var itemTotal = parseFloat(item.attr(CONFIG.itemAttributes.totalPrice) || 0);

                if (quantity > 0 && price > 0) {
                    infoMessage += "📦 " + (i+1) + ": " + materialName + "\n";
                    infoMessage += "   " + quantity + " x " + utils.formatMoney(price) + " = " + utils.formatMoney(itemTotal) + "\n";
                }
            }
        }

        if (items.length > 5) {
            infoMessage += "   ... a " + (items.length - 5) + " ďalších položiek\n";
        }

        infoMessage += "\n💰 SÚHRN:\n";
        infoMessage += "───────────────────────────────────────────\n";
        infoMessage += "• Suma bez DPH: " + utils.formatMoney(totalSum) + "\n";
        infoMessage += "• DPH (" + vatRate + "%): " + utils.formatMoney(vatAmount) + "\n";
        infoMessage += "• Suma s DPH: " + utils.formatMoney(sumWithVat) + "\n\n";

        var transportPrice = utils.safeGet(currentEntry, CONFIG.fields.transportPrice, 0);
        if (transportPrice > 0) {
            infoMessage += "🚚 Preprava: " + utils.formatMoney(transportPrice) + "\n\n";
        }

        infoMessage += "🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "• Čas spracovania: " + moment().format("HH:mm:ss") + "\n";
        infoMessage += "• MementoUtils: v" + (utils.version || "N/A") + "\n";

        if (typeof MementoConfig !== 'undefined') {
            infoMessage += "• MementoConfig: v" + MementoConfig.version + "\n";
        }

        infoMessage += "\n✅ PREPOČET DOKONČENÝ ÚSPEŠNE";

        currentEntry.set(CONFIG.fields.info, infoMessage);

        utils.addDebug(currentEntry, CONFIG.icons.success + " Info záznam vytvorený");

        return true;

    } catch (error) {
        utils.addDebug(currentEntry, CONFIG.icons.error + " Chyba pri vytváraní info záznamu: " + error.toString());
        return false;
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();