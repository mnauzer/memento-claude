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
        markupPercentage: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.markupPercentage) || "Obchodná prirážka (%)",
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
            var priceResult = calculateAndUpdateMaterialPrices(item, purchasePrice, documentDate);
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

function calculateAndUpdateMaterialPrices(item, purchasePrice, documentDate) {
    try {
        var materialName = utils.safeGet(item, CONFIG.materialFields.name, "Neznámy materiál");
        var updated = false;

        // 1. Zistiť nastavenie poľa Prepočet ceny
        var priceCalculation = utils.safeGet(item, CONFIG.materialFields.priceCalculation, "");
        utils.addDebug(currentEntry, CONFIG.icons.info + " " + materialName + " - Prepočet ceny: " + priceCalculation);

        var sellingPrice = purchasePrice;
        var vatRate = 0;

        // 2. Ak je "Podľa prirážky", vypočítať predajnú cenu
        if (priceCalculation === "Podľa prirážky") {
            var markupPercentage = parseFloat(utils.safeGet(item, CONFIG.materialFields.markupPercentage, 0));
            if (markupPercentage > 0) {
                sellingPrice = purchasePrice * (1 + markupPercentage / 100);
                utils.addDebug(currentEntry, CONFIG.icons.calculation + " " + materialName + " - Prirážka " + markupPercentage + "%: " + utils.formatMoney(purchasePrice) + " -> " + utils.formatMoney(sellingPrice));
            }
        }

        // 3. Zistiť sadzbu DPH
        var vatRateType = utils.safeGet(item, CONFIG.materialFields.vatRate, "Základná");
        try {
            vatRate = utils.getValidVatRate(documentDate, vatRateType.toLowerCase());
            utils.addDebug(currentEntry, CONFIG.icons.success + " " + materialName + " - Sadzba DPH (" + vatRateType + "): " + vatRate + "%");
        } catch (error) {
            utils.addDebug(currentEntry, CONFIG.icons.warning + " " + materialName + " - Chyba pri získavaní DPH, použije sa 0%");
            vatRate = 0;
        }

        // 4. Výpočet ceny s DPH (pred zaokrúhlením)
        var priceWithVat = sellingPrice * (1 + vatRate / 100);
        var purchasePriceWithVat = purchasePrice * (1 + vatRate / 100);

        // 5. Zaokrúhľovanie ceny s DPH
        var roundedPriceWithVat = applyPriceRounding(item, priceWithVat, materialName + " (s DPH)");
        var roundedPurchasePriceWithVat = applyPriceRounding(item, purchasePriceWithVat, materialName + " - nákupná (s DPH)");

        // 6. Prepočítanie ceny bez DPH z zaokrúhlenej ceny s DPH
        var roundedPrice = roundedPriceWithVat / (1 + vatRate / 100);
        var roundedPurchasePrice = roundedPurchasePriceWithVat / (1 + vatRate / 100);

        // 7. Aktualizovať polia v materiáli ak sa ceny zmenili
        var currentPrice = parseFloat(utils.safeGet(item, CONFIG.materialFields.price, 0));
        var currentPriceWithVat = parseFloat(utils.safeGet(item, CONFIG.materialFields.priceWithVat, 0));
        var currentPurchasePrice = parseFloat(utils.safeGet(item, CONFIG.materialFields.purchasePrice, 0));
        var currentPurchasePriceWithVat = parseFloat(utils.safeGet(item, CONFIG.materialFields.purchasePriceWithVat, 0));

        if (Math.abs(currentPrice - roundedPrice) > 0.01 ||
            Math.abs(currentPriceWithVat - roundedPriceWithVat) > 0.01 ||
            Math.abs(currentPurchasePrice - roundedPurchasePrice) > 0.01 ||
            Math.abs(currentPurchasePriceWithVat - roundedPurchasePriceWithVat) > 0.01) {

            // Aktualizovať ceny v zázname materiálu
            utils.safeSet(item, CONFIG.materialFields.price, roundedPrice);
            utils.safeSet(item, CONFIG.materialFields.priceWithVat, roundedPriceWithVat);
            utils.safeSet(item, CONFIG.materialFields.purchasePrice, roundedPurchasePrice);
            utils.safeSet(item, CONFIG.materialFields.purchasePriceWithVat, roundedPurchasePriceWithVat);

            // Vytvorenie info záznamu pre materiál
            createMaterialInfoRecord(item, {
                originalPurchasePrice: purchasePrice,
                originalSellingPrice: sellingPrice,
                originalPriceWithVat: priceWithVat,
                originalPurchasePriceWithVat: purchasePriceWithVat,
                finalPrice: roundedPrice,
                finalPriceWithVat: roundedPriceWithVat,
                finalPurchasePrice: roundedPurchasePrice,
                finalPurchasePriceWithVat: roundedPurchasePriceWithVat,
                vatRate: vatRate,
                vatRateType: vatRateType,
                priceCalculation: priceCalculation,
                markupPercentage: parseFloat(utils.safeGet(item, CONFIG.materialFields.markupPercentage, 0)),
                priceRounding: utils.safeGet(item, CONFIG.materialFields.priceRounding, ""),
                roundingValue: utils.safeGet(item, CONFIG.materialFields.roundingValue, ""),
                documentDate: documentDate
            });

            updated = true;

            utils.addDebug(currentEntry, CONFIG.icons.success + " " + materialName + " - Aktualizované ceny:");
            utils.addDebug(currentEntry, "  Nákupná: " + utils.formatMoney(roundedPurchasePrice) + " / s DPH: " + utils.formatMoney(roundedPurchasePriceWithVat));
            utils.addDebug(currentEntry, "  Predajná: " + utils.formatMoney(roundedPrice) + " / s DPH: " + utils.formatMoney(roundedPriceWithVat));
        }

        return {
            updated: updated,
            sellingPrice: roundedPrice,
            priceWithVat: roundedPriceWithVat
        };

    } catch (error) {
        utils.addDebug(currentEntry, CONFIG.icons.error + " Chyba pri prepočte cien materiálu: " + error.toString());
        return {
            updated: false,
            sellingPrice: purchasePrice,
            priceWithVat: purchasePrice
        };
    }
}

function applyPriceRounding(item, price, materialName) {
    try {
        var priceRounding = utils.safeGet(item, CONFIG.materialFields.priceRounding, "");
        var roundingValue = utils.safeGet(item, CONFIG.materialFields.roundingValue, "");

        if (!priceRounding || priceRounding === "Nezaokrúhľovať") {
            return price;
        }

        var roundingFactor = 1; // Desatiny
        switch (roundingValue) {
            case "Jednotky":
                roundingFactor = 1;
                break;
            case "Desiatky":
                roundingFactor = 10;
                break;
            case "Stovky":
                roundingFactor = 100;
                break;
            case "Desatiny":
            default:
                roundingFactor = 0.1;
                break;
        }

        var roundedPrice = price;
        switch (priceRounding) {
            case "Nahor":
                roundedPrice = Math.ceil(price / roundingFactor) * roundingFactor;
                break;
            case "Nadol":
                roundedPrice = Math.floor(price / roundingFactor) * roundingFactor;
                break;
            case "Najbližšie":
                roundedPrice = Math.round(price / roundingFactor) * roundingFactor;
                break;
        }

        if (Math.abs(price - roundedPrice) > 0.001) {
            utils.addDebug(currentEntry, CONFIG.icons.calculation + " " + materialName + " - Zaokrúhlenie (" + priceRounding + ", " + roundingValue + "): " + utils.formatMoney(price) + " -> " + utils.formatMoney(roundedPrice));
        }

        return roundedPrice;

    } catch (error) {
        utils.addDebug(currentEntry, CONFIG.icons.warning + " Chyba pri zaokrúhľovaní ceny, použije sa pôvodná: " + error.toString());
        return price;
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

function createMaterialInfoRecord(item, priceData) {
    try {
        var materialName = utils.safeGet(item, CONFIG.materialFields.name, "Neznámy materiál");
        var dateFormatted = utils.formatDate(priceData.documentDate, "DD.MM.YYYY HH:mm:ss");

        var infoMessage = "💰 AUTOMATICKÁ AKTUALIZÁCIA CIEN MATERIÁLU\n";
        infoMessage += "═══════════════════════════════════════════\n";

        infoMessage += "📦 Materiál: " + materialName + "\n";
        infoMessage += "📅 Dátum príjemky: " + dateFormatted + "\n";
        infoMessage += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n\n";

        infoMessage += "⚙️ NASTAVENIA PREPOČTU:\n";
        infoMessage += "───────────────────────────────────────────\n";
        infoMessage += "• Prepočet ceny: " + priceData.priceCalculation + "\n";
        if (priceData.markupPercentage > 0) {
            infoMessage += "• Obchodná prirážka: " + priceData.markupPercentage + "%\n";
        }
        infoMessage += "• Sadzba DPH: " + priceData.vatRateType + " (" + priceData.vatRate + "%)\n";
        if (priceData.priceRounding && priceData.priceRounding !== "Nezaokrúhľovať") {
            infoMessage += "• Zaokrúhľovanie: " + priceData.priceRounding + " (" + priceData.roundingValue + ")\n";
        }
        infoMessage += "\n";

        infoMessage += "💸 PREPOČET NÁKUPNÝCH CIEN:\n";
        infoMessage += "───────────────────────────────────────────\n";
        infoMessage += "• Pôvodná nákupná cena: " + utils.formatMoney(priceData.originalPurchasePrice) + "\n";
        infoMessage += "• Nákupná cena s DPH: " + utils.formatMoney(priceData.originalPurchasePriceWithVat) + "\n";
        if (priceData.priceRounding && priceData.priceRounding !== "Nezaokrúhľovať") {
            infoMessage += "• Zaokrúhlená s DPH: " + utils.formatMoney(priceData.finalPurchasePriceWithVat) + "\n";
            infoMessage += "• Finálna nákupná: " + utils.formatMoney(priceData.finalPurchasePrice) + "\n";
        }
        infoMessage += "\n";

        infoMessage += "💰 PREPOČET PREDAJNÝCH CIEN:\n";
        infoMessage += "───────────────────────────────────────────\n";
        if (priceData.priceCalculation === "Podľa prirážky" && priceData.markupPercentage > 0) {
            infoMessage += "• Základná predajná: " + utils.formatMoney(priceData.originalPurchasePrice) + "\n";
            infoMessage += "• S prirážkou " + priceData.markupPercentage + "%: " + utils.formatMoney(priceData.originalSellingPrice) + "\n";
        } else {
            infoMessage += "• Predajná cena (= nákupná): " + utils.formatMoney(priceData.originalSellingPrice) + "\n";
        }
        infoMessage += "• Predajná s DPH: " + utils.formatMoney(priceData.originalPriceWithVat) + "\n";
        if (priceData.priceRounding && priceData.priceRounding !== "Nezaokrúhľovať") {
            infoMessage += "• Zaokrúhlená s DPH: " + utils.formatMoney(priceData.finalPriceWithVat) + "\n";
            infoMessage += "• Finálna predajná: " + utils.formatMoney(priceData.finalPrice) + "\n";
        }
        infoMessage += "\n";

        infoMessage += "📊 FINÁLNE HODNOTY V MATERIÁLI:\n";
        infoMessage += "───────────────────────────────────────────\n";
        infoMessage += "• Nákupná cena: " + utils.formatMoney(priceData.finalPurchasePrice) + "\n";
        infoMessage += "• Nákupná cena s DPH: " + utils.formatMoney(priceData.finalPurchasePriceWithVat) + "\n";
        infoMessage += "• Predajná cena: " + utils.formatMoney(priceData.finalPrice) + "\n";
        infoMessage += "• Predajná cena s DPH: " + utils.formatMoney(priceData.finalPriceWithVat) + "\n";

        if (priceData.markupPercentage > 0) {
            var actualMargin = ((priceData.finalPrice - priceData.finalPurchasePrice) / priceData.finalPurchasePrice) * 100;
            infoMessage += "• Skutočná marža: " + utils.formatNumber(actualMargin, 2) + "%\n";
        }

        infoMessage += "\n✅ CENY AKTUALIZOVANÉ ÚSPEŠNE";

        // Nastavenie info záznamu do materiálu
        var materialInfoField = CONFIG.fields.info;
        utils.safeSet(item, materialInfoField, infoMessage);

        utils.addDebug(currentEntry, CONFIG.icons.success + " Info záznam vytvorený pre materiál: " + materialName);

        return true;

    } catch (error) {
        utils.addDebug(currentEntry, CONFIG.icons.error + " Chyba pri vytváraní info záznamu pre materiál: " + error.toString());
        return false;
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