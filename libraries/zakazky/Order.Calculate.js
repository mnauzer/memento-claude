// ==============================================
// ZÁKAZKY - Hlavný prepočet
// Verzia: 1.0.0 | Dátum: 2025-10-11 | Autor: ASISTANTO
// Knižnica: Zákazky (ID: CfRHN7QTG)
// Trigger: onChange
// ==============================================
// 📋 FUNKCIA:
//    - Aktualizuje názov z Miesta realizácie
//    - Validuje prepojenia dielov so zákazkou (Číslo zákazky)
//    - Spočíta hodnoty "Celkom" zo všetkých dielov zákazky
//    - Automatická správa subdodávok (presun medzi Diely/Subdodávky podľa nastavenia)
//    - Vypočíta predpokladaný počet km (vzdialenosť × 2 × počet jázd)
//    - Vypočíta celkovú hmotnosť materiálu zo všetkých dielov (v tonách)
//    - Vypočíta cenu dopravy podľa nastavenia (Neúčtovať, Paušál, Km, % zo zákazky, Pevná cena)
//    - Vypočíta cenu presunu hmôt podľa nastavenia (Neúčtovať, Paušál, Podľa hmotnosti, % zo zákazky, Pevná cena)
//    - Vypočíta cenu subdodávok podľa nastavenia
//    - Získa aktuálnu sadzbu DPH
//    - Vypočíta celkovú sumu s DPH
// ==============================================
// 🔧 CHANGELOG v1.0.0 (2025-10-11):
//    - Prvá verzia pre knižnicu Zákazky
//    - Adaptované z CP.Calculate.js v1.4.3
//    - Použité polia z centralConfig.fields.order
//    - Zmena: "Číslo CP" → "Číslo zákazky" v validácii dielov
//    - Zmena: "Diel cenovej ponuky" → "Diel zákazky" v typoch dielov
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Zákazky - Prepočet",
    version: "1.0.0",

    // Referencie na centrálny config
    fields: centralConfig.fields.order,
    icons: centralConfig.icons
};

var fields = CONFIG.fields;

utils.addDebug(currentEntry, "🚀 START: Prepočet zákazky");

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Aktualizuje názov zákazky z Miesta realizácie
 * Získa hodnotu poľa "Názov" z linkToEntry záznamu "Miesto realizácie"
 */
function updateNameFromPlace() {
    try {
        utils.addDebug(currentEntry, "  📍 Aktualizácia názvu z Miesta realizácie");

        var placeEntries = utils.safeGetLinks(currentEntry, fields.place);

        if (!placeEntries || placeEntries.length === 0) {
            utils.addDebug(currentEntry, "    ⚠️ Nie je vybrané miesto realizácie");
            return;
        }

        var placeEntry = placeEntries[0];
        var placeName = utils.safeGet(placeEntry, centralConfig.fields.place.name);

        if (!placeName) {
            utils.addDebug(currentEntry, "    ⚠️ Miesto realizácie nemá názov");
            return;
        }

        utils.addDebug(currentEntry, "    ✅ Názov miesta: " + placeName);

        // Zapíš do poľa Názov
        currentEntry.set(fields.name, placeName);

    } catch (error) {
        var errorMsg = "Chyba pri aktualizácii názvu: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "updateNameFromPlace", error);
        throw error;
    }
}

/**
 * Validuje prepojenie dielov so zákazkou
 * Kontroluje zhodu "Číslo" zákazky s "Číslo zákazky" dielu a odstráni duplicity
 * @returns {Array} - Validované pole dielov
 */
function validatePartsLinks() {
    try {
        utils.addDebug(currentEntry, "  🔍 Kontrola prepojenia dielov so zákazkou");

        var orderNumber = utils.safeGet(currentEntry, fields.number) || "";
        utils.addDebug(currentEntry, "    Číslo zákazky: " + orderNumber);

        var partsEntries = utils.safeGetLinks(currentEntry, fields.parts) || [];

        if (partsEntries.length === 0) {
            utils.addDebug(currentEntry, "    ℹ️ Žiadne diely na kontrolu");
            return [];
        }

        var validParts = [];
        var seenPartIds = {}; // Pre kontrolu duplicít
        var removedCount = 0;
        var duplicateCount = 0;

        for (var i = 0; i < partsEntries.length; i++) {
            var part = partsEntries[i];
            var partOrderNumber = utils.safeGet(part, centralConfig.fields.orderPart.orderNumber) || "";
            var partType = utils.safeGet(part, centralConfig.fields.orderPart.partType) || ("Diel #" + (i + 1));
            var partId = utils.safeGet(part, centralConfig.fields.common.id);

            // Kontrola duplicít
            if (seenPartIds[partId]) {
                utils.addDebug(currentEntry, "    ⊗ Duplicita: " + partType + " - odstránená");
                duplicateCount++;
                continue;
            }

            // Kontrola zhody čísla zákazky
            if (partOrderNumber !== orderNumber) {
                utils.addDebug(currentEntry, "    ✗ Neplatné prepojenie: " + partType);
                utils.addDebug(currentEntry, "      Očakávané číslo zákazky: '" + orderNumber + "'");
                utils.addDebug(currentEntry, "      Číslo zákazky v dieli: '" + partOrderNumber + "'");
                utils.addDebug(currentEntry, "      → Diel unlinknutý zo zákazky");
                removedCount++;
                continue;
            }

            // Diel je validný
            validParts.push(part);
            seenPartIds[partId] = true;
        }

        // Uložiť vyčistené pole dielov
        if (removedCount > 0 || duplicateCount > 0) {
            currentEntry.set(fields.parts, validParts);
            var msg = "    ✅ Prepojenia validované:";
            if (removedCount > 0) msg += " " + removedCount + " neplatných odstránených,";
            if (duplicateCount > 0) msg += " " + duplicateCount + " duplicít odstránených,";
            msg += " zostáva " + validParts.length + " dielov";
            utils.addDebug(currentEntry, msg);
        } else {
            utils.addDebug(currentEntry, "    ✅ Všetky prepojenia sú validné (" + validParts.length + " dielov)");
        }

        return validParts;

    } catch (error) {
        var errorMsg = "Chyba pri validácii prepojení dielov: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "validatePartsLinks", error);
        throw error;
    }
}

/**
 * Spočíta hodnoty "Celkom" zo všetkých dielov zákazky
 * @returns {Number} - Suma všetkých dielov
 */
function calculatePartsTotal() {
    try {
        utils.addDebug(currentEntry, "  📋 Spočítanie súčtov z dielov");

        var partsEntries = utils.safeGetLinks(currentEntry, fields.parts);

        if (!partsEntries || partsEntries.length === 0) {
            utils.addDebug(currentEntry, "    ⚠️ Žiadne diely zákazky");
            return 0;
        }

        utils.addDebug(currentEntry, "    Počet dielov: " + partsEntries.length);

        var totalSum = 0;
        var partTotalField = centralConfig.fields.orderPart.totalSum; // "Celkom"

        for (var i = 0; i < partsEntries.length; i++) {
            var part = partsEntries[i];
            var partTotal = utils.safeGet(part, partTotalField) || 0;

            var partType = utils.safeGet(part, centralConfig.fields.orderPart.partType) || ("Diel #" + (i + 1));
            utils.addDebug(currentEntry, "      • " + partType + ": " + partTotal.toFixed(2) + " €");

            totalSum += partTotal;
        }

        utils.addDebug(currentEntry, "    ✅ Celkový súčet dielov: " + totalSum.toFixed(2) + " €");
        return totalSum;

    } catch (error) {
        var errorMsg = "Chyba pri spočítaní dielov: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "calculatePartsTotal", error);
        throw error;
    }
}

/**
 * Nájde platnú cenu práce k danému dátumu
 * @param {Entry} workEntry - Záznam práce (Cenník prác)
 * @param {Date} date - Dátum pre ktorý hľadáme cenu
 * @returns {Number|null} - Platná cena alebo null
 */
function findWorkPrice(workEntry, date) {
    try {
        var options = {
            priceLibrary: "workPrices",
            linkField: "work",
            priceField: "price",
            fallbackPriceField: "price",
            currentEntry: currentEntry
        };
        return utils.findValidPrice(workEntry, date, options);
    } catch (error) {
        var errorMsg = "Chyba pri hľadaní ceny práce: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "findWorkPrice", error);
        throw error;
    }
}

/**
 * Vypočíta predpokladaný počet km
 * Vzorec: Vzdialenosť × 2 × Predpokladaný počet jázd
 * @returns {Number} - Predpokladaný počet km
 */
function calculateExpectedKm() {
    try {
        utils.addDebug(currentEntry, "  🛣️ Výpočet predpokladaného počtu km");

        // Zisti vzdialenosť z miesta realizácie
        var placeEntries = utils.safeGetLinks(currentEntry, fields.place);

        if (!placeEntries || placeEntries.length === 0) {
            utils.addDebug(currentEntry, "    ⚠️ Nie je vybrané miesto realizácie");
            return 0;
        }

        var placeEntry = placeEntries[0];
        var placeName = utils.safeGet(placeEntry, centralConfig.fields.place.name) || "Miesto";
        var distance = utils.safeGet(placeEntry, centralConfig.fields.place.distance) || 0;

        utils.addDebug(currentEntry, "    Miesto: " + placeName);
        utils.addDebug(currentEntry, "    Vzdialenosť: " + distance + " km");

        if (distance <= 0) {
            utils.addDebug(currentEntry, "    ⚠️ Vzdialenosť je 0 km");
            return 0;
        }

        // Zisti predpokladaný počet jázd
        var ridesCount = utils.safeGet(currentEntry, fields.expectedRidesCount) || 1;
        utils.addDebug(currentEntry, "    Počet jázd: " + ridesCount);

        // Výpočet: vzdialenosť × 2 (tam a späť) × počet jázd
        var totalKm = distance * 2 * ridesCount;

        utils.addDebug(currentEntry, "    📊 Výpočet: " + distance + " km × 2 × " + ridesCount + " = " + totalKm + " km");
        utils.addDebug(currentEntry, "    ✅ Predpokladaný počet km: " + totalKm + " km");

        return totalKm;

    } catch (error) {
        var errorMsg = "Chyba pri výpočte predpokladaného počtu km: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "calculateExpectedKm", error);
        throw error;
    }
}

/**
 * Vypočíta cenu dopravy podľa nastaveného typu účtovania
 * @param {Number} totalFromParts - Celková suma z dielov
 * @param {Date} currentDate - Dátum zákazky
 * @param {Number} expectedKm - Predpokladaný počet km (už vypočítaný)
 * @returns {Number} - Cena dopravy
 */
function calculateTransportPrice(totalFromParts, currentDate, expectedKm) {
    try {
        utils.addDebug(currentEntry, "  🚗 Výpočet dopravy");

        var rideCalc = utils.safeGet(currentEntry, fields.rideCalculation) || "Neúčtovať";
        utils.addDebug(currentEntry, "    Typ účtovania: " + rideCalc);

        var transportPrice = 0;

        // ========== NEÚČTOVAŤ ==========
        if (rideCalc === "Neúčtovať" || !rideCalc) {
            utils.addDebug(currentEntry, "    Metóda: Neúčtovať");
            utils.addDebug(currentEntry, "      ℹ️ Doprava sa neúčtuje");
            utils.addDebug(currentEntry, "      ✅ Cena dopravy: 0.00 €");
            return 0;
        }

        // ========== PAUŠÁL ==========
        else if (rideCalc === "Paušál") {
            utils.addDebug(currentEntry, "    Metóda: Paušál dopravy");

            var flatRateEntries = utils.safeGetLinks(currentEntry, fields.rideFlatRate);

            if (!flatRateEntries || flatRateEntries.length === 0) {
                utils.addDebug(currentEntry, "      ⚠️ Nie je vybraná položka Paušál dopravy (pole: " + fields.rideFlatRate + ")");
                return 0;
            }

            var flatRateEntry = flatRateEntries[0];
            var flatRateName = utils.safeGet(flatRateEntry, centralConfig.fields.priceList.name) || "Paušál";
            utils.addDebug(currentEntry, "      Položka: " + flatRateName);

            // Zisti cenu paušálu
            var flatRatePrice = findWorkPrice(flatRateEntry, currentDate);

            if (!flatRatePrice || flatRatePrice <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Neplatná cena paušálu (cena: " + flatRatePrice + ")");
                return 0;
            }

            var ridesCount = utils.safeGet(currentEntry, fields.expectedRidesCount) || 1;

            transportPrice = flatRatePrice * ridesCount;

            utils.addDebug(currentEntry, "      📊 Výpočet: " + flatRatePrice.toFixed(2) + " € × " + ridesCount + " jázd");
            utils.addDebug(currentEntry, "      ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
        }

        // ========== KILOMETER ==========
        else if (rideCalc === "Km") {
            utils.addDebug(currentEntry, "    Metóda: Kilometrovník");

            // Zisti cenu za km
            var kmPriceEntries = utils.safeGetLinks(currentEntry, fields.kmPrice);

            if (!kmPriceEntries || kmPriceEntries.length === 0) {
                utils.addDebug(currentEntry, "      ⚠️ Nie je vybraná položka Cena za km (pole: " + fields.kmPrice + ")");
                return 0;
            }

            var kmPriceEntry = kmPriceEntries[0];
            var kmPriceName = utils.safeGet(kmPriceEntry, centralConfig.fields.priceList.name) || "Cena za km";
            utils.addDebug(currentEntry, "      Položka: " + kmPriceName);

            var kmPriceValue = findWorkPrice(kmPriceEntry, currentDate);

            if (!kmPriceValue || kmPriceValue <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Neplatná cena za km (cena: " + kmPriceValue + ", dátum: " + moment(currentDate).format("DD.MM.YYYY") + ")");
                return 0;
            }
            utils.addDebug(currentEntry, "      Cena za km: " + kmPriceValue.toFixed(2) + " €/km");

            // Použij predpokladaný počet km (už vypočítaný v KROK 2b a odovzdaný ako parameter)
            var totalKm = expectedKm || 0;

            if (totalKm <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Predpokladaný počet km je 0");
                utils.addDebug(currentEntry, "      ℹ️ Uistite sa, že je vybrané Miesto realizácie s Vzdialenosťou a Predpokladaný počet jázd");
                return 0;
            }
            utils.addDebug(currentEntry, "      Predpokladaný počet km: " + totalKm + " km");

            transportPrice = kmPriceValue * totalKm;

            utils.addDebug(currentEntry, "      📊 Výpočet: " + kmPriceValue.toFixed(2) + " €/km × " + totalKm + " km");
            utils.addDebug(currentEntry, "      ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
        }

        // ========== PERCENTO ZO ZÁKAZKY ==========
        else if (rideCalc === "% zo zákazky") {
            utils.addDebug(currentEntry, "    Metóda: % zo zákazky");

            var ridePercentage = utils.safeGet(currentEntry, fields.ridePercentage) || 0;

            if (ridePercentage <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Percento dopravy je 0% (pole: " + fields.ridePercentage + ")");
                return 0;
            }
            utils.addDebug(currentEntry, "      Percento: " + ridePercentage + "%");

            transportPrice = totalFromParts * (ridePercentage / 100);

            utils.addDebug(currentEntry, "      📊 Výpočet: " + totalFromParts.toFixed(2) + " € × " + ridePercentage + "%");
            utils.addDebug(currentEntry, "      ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
        }

        // ========== PEVNÁ CENA ==========
        else if (rideCalc === "Pevná cena") {
            utils.addDebug(currentEntry, "    Metóda: Pevná cena");

            transportPrice = utils.safeGet(currentEntry, fields.fixedTransportPrice) || 0;

            if (transportPrice <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Pole 'Doprava pevná cena' nie je vyplnené (pole: " + fields.fixedTransportPrice + ")");
                utils.addDebug(currentEntry, "      ℹ️ Zadaj pevnú cenu do poľa 'Doprava pevná cena'");
                return 0;
            }

            utils.addDebug(currentEntry, "      📊 Pevná cena: " + transportPrice.toFixed(2) + " €");
            utils.addDebug(currentEntry, "      ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
        }

        return transportPrice;

    } catch (error) {
        var errorMsg = "Chyba pri výpočte dopravy: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "calculateTransportPrice", error);
        throw error;
    }
}

/**
 * Vypočíta celkovú hmotnosť materiálu zo všetkých dielov
 * @returns {number} - celková hmotnosť v tonách
 */
function calculateMaterialWeight() {
    try {
        utils.addDebug(currentEntry, "  ⚖️ Výpočet hmotnosti materiálu");

        var parts = utils.safeGetLinks(currentEntry, fields.parts) || [];

        if (parts.length === 0) {
            utils.addDebug(currentEntry, "    ℹ️ Žiadne diely v zákazke");
            return 0;
        }

        utils.addDebug(currentEntry, "    Počet dielov: " + parts.length);

        var totalWeight = 0;
        var processedCount = 0;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];

            // Zisti typ dielu
            var partType = utils.safeGet(part, centralConfig.fields.orderPart.partType) || ("Diel " + (i + 1));

            // VYNECHAJ subdodávky - tie sa nepočítajú do hmotnosti materiálu
            if (partType === "Subdodávky") {
                utils.addDebug(currentEntry, "    ⊗ " + partType + " (Subdodávka - vynechané)");
                continue;
            }

            // Zisti hmotnosť tohto dielu
            var partWeight = utils.safeGet(part, centralConfig.fields.orderPart.materialWeight) || 0;

            if (partWeight > 0) {
                totalWeight += partWeight;
                processedCount++;
                utils.addDebug(currentEntry, "    ✓ " + partType + ": " + partWeight.toFixed(3) + " t");
            } else {
                utils.addDebug(currentEntry, "    ○ " + partType + ": 0.000 t (bez materiálu)");
            }
        }

        utils.addDebug(currentEntry, "    " + "-".repeat(40));
        utils.addDebug(currentEntry, "    ✅ Celková hmotnosť: " + totalWeight.toFixed(3) + " t (z " + processedCount + " dielov)");

        return totalWeight;

    } catch (error) {
        var errorMsg = "Chyba pri výpočte hmotnosti materiálu: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "calculateMaterialWeight", error);
        throw error;
    }
}

/**
 * Vypočíta cenu presunu hmôt podľa zvolenej metódy
 * @param {number} totalFromParts - celková suma z dielov
 * @param {number} materialWeight - celková hmotnosť materiálu v tonách
 * @param {Date} currentDate - dátum zákazky
 * @returns {number} - vypočítaná cena presunu hmôt
 */
function calculateMassTransferPrice(totalFromParts, materialWeight, currentDate) {
    try {
        utils.addDebug(currentEntry, "  📦 Výpočet presunu hmôt");

        var massTransferCalc = utils.safeGet(currentEntry, fields.massTransferCalculation) || "Neúčtovať";
        utils.addDebug(currentEntry, "    Typ účtovania: " + massTransferCalc);

        var massTransferPrice = 0;

        // ========== NEÚČTOVAŤ ==========
        if (massTransferCalc === "Neúčtovať" || !massTransferCalc) {
            utils.addDebug(currentEntry, "    Metóda: Neúčtovať");
            utils.addDebug(currentEntry, "      ℹ️ Presun hmôt sa neúčtuje");
            utils.addDebug(currentEntry, "      ✅ Cena presunu hmôt: 0.00 €");
            return 0;
        }

        // ========== PAUŠÁL ==========
        else if (massTransferCalc === "Paušál") {
            utils.addDebug(currentEntry, "    Metóda: Paušál presunu hmôt");

            var flatRateEntries = utils.safeGetLinks(currentEntry, fields.massTransferFlatRate);

            if (!flatRateEntries || flatRateEntries.length === 0) {
                utils.addDebug(currentEntry, "      ⚠️ Nie je vybraná položka Paušál presunu hmôt (pole: " + fields.massTransferFlatRate + ")");
                return 0;
            }

            var flatRateEntry = flatRateEntries[0];
            var flatRateName = utils.safeGet(flatRateEntry, centralConfig.fields.priceList.name) || "Paušál presunu hmôt";
            utils.addDebug(currentEntry, "      Položka: " + flatRateName);

            // Zisti cenu paušálu
            var flatRatePrice = findWorkPrice(flatRateEntry, currentDate);

            if (!flatRatePrice || flatRatePrice <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Neplatná cena paušálu (cena: " + flatRatePrice + ")");
                return 0;
            }

            massTransferPrice = flatRatePrice;

            utils.addDebug(currentEntry, "      📊 Paušál: " + flatRatePrice.toFixed(2) + " €");
            utils.addDebug(currentEntry, "      ✅ Cena presunu hmôt: " + massTransferPrice.toFixed(2) + " €");
        }

        // ========== PODĽA HMOTNOSTI MATERIÁLU ==========
        else if (massTransferCalc === "Podľa hmotnosti materiálu") {
            utils.addDebug(currentEntry, "    Metóda: Podľa hmotnosti materiálu");

            // Zisti cenu z poľa "Cena presunu hmôt materiálu"
            var priceEntries = utils.safeGetLinks(currentEntry, fields.massTransferPriceEntry);

            if (!priceEntries || priceEntries.length === 0) {
                utils.addDebug(currentEntry, "      ⚠️ Nie je vybraná položka Cena presunu hmôt materiálu (pole: " + fields.massTransferPriceEntry + ")");
                return 0;
            }

            var priceEntry = priceEntries[0];
            var priceName = utils.safeGet(priceEntry, centralConfig.fields.priceList.name) || "Cena presunu hmôt materiálu";
            utils.addDebug(currentEntry, "      Položka: " + priceName);

            var priceValue = findWorkPrice(priceEntry, currentDate);

            if (!priceValue || priceValue <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Neplatná cena (cena: " + priceValue + ")");
                return 0;
            }
            utils.addDebug(currentEntry, "      Cena za jednotku: " + priceValue.toFixed(2) + " €");

            if (materialWeight <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Hmotnosť materiálu je 0 t");
                utils.addDebug(currentEntry, "      ℹ️ Uistite sa, že diely majú vypočítanú hmotnosť materiálu");
                return 0;
            }
            utils.addDebug(currentEntry, "      Hmotnosť materiálu: " + materialWeight.toFixed(3) + " t");

            massTransferPrice = priceValue * materialWeight;

            utils.addDebug(currentEntry, "      📊 Výpočet: " + priceValue.toFixed(2) + " € × " + materialWeight.toFixed(3) + " t");
            utils.addDebug(currentEntry, "      ✅ Cena presunu hmôt: " + massTransferPrice.toFixed(2) + " €");
        }

        // ========== PERCENTO ZO ZÁKAZKY ==========
        else if (massTransferCalc === "% zo zákazky") {
            utils.addDebug(currentEntry, "    Metóda: % zo zákazky");

            var massTransferPercentage = utils.safeGet(currentEntry, fields.massTransferPercentage) || 0;

            if (massTransferPercentage <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Percento presunu hmôt je 0% (pole: " + fields.massTransferPercentage + ")");
                return 0;
            }
            utils.addDebug(currentEntry, "      Percento: " + massTransferPercentage + "%");

            massTransferPrice = totalFromParts * (massTransferPercentage / 100);

            utils.addDebug(currentEntry, "      📊 Výpočet: " + totalFromParts.toFixed(2) + " € × " + massTransferPercentage + "%");
            utils.addDebug(currentEntry, "      ✅ Cena presunu hmôt: " + massTransferPrice.toFixed(2) + " €");
        }

        // ========== PEVNÁ CENA ==========
        else if (massTransferCalc === "Pevná cena") {
            utils.addDebug(currentEntry, "    Metóda: Pevná cena");

            massTransferPrice = utils.safeGet(currentEntry, fields.fixedMassTransferPrice) || 0;

            if (massTransferPrice <= 0) {
                utils.addDebug(currentEntry, "      ⚠️ Pole 'Pevná cena presunu hmôt' nie je vyplnené (pole: " + fields.fixedMassTransferPrice + ")");
                utils.addDebug(currentEntry, "      ℹ️ Zadaj pevnú cenu do poľa 'Pevná cena presunu hmôt'");
                return 0;
            }

            utils.addDebug(currentEntry, "      📊 Pevná cena: " + massTransferPrice.toFixed(2) + " €");
            utils.addDebug(currentEntry, "      ✅ Cena presunu hmôt: " + massTransferPrice.toFixed(2) + " €");
        }

        return massTransferPrice;

    } catch (error) {
        var errorMsg = "Chyba pri výpočte ceny presunu hmôt: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "calculateMassTransferPrice", error);
        throw error;
    }
}

/**
 * Správa subdodávok podľa nastavenia "Účtovanie subdodávok"
 * Presúva subdodávky medzi polami "Diely" a "Subdodávky" podľa potreby
 * @returns {Object} - { subcontractEntry, location, totalSubcontracts }
 */
function manageSubcontracts() {
    try {
        utils.addDebug(currentEntry, "  🔧 Správa subdodávok");

        // Priame názvy polí z MementoConfig
        var subcontractsFieldName = centralConfig.fields.order.subcontracts || "Subdodávky";
        var subcontractsTotalFieldName = centralConfig.fields.order.subcontractsTotal || "Celkom subdodávky";

        var subcontractsCalc = utils.safeGet(currentEntry, fields.subcontractsCalculation) || "Neúčtovať";
        utils.addDebug(currentEntry, "    Účtovanie subdodávok: " + subcontractsCalc);

        // Určenie cieľového miesta pre subdodávky
        var targetField = null;
        if (subcontractsCalc === "Zarátať do ceny") {
            targetField = "parts"; // Pole "Diely"
        } else if (subcontractsCalc === "Vytvoriť dodatok") {
            targetField = "subcontracts"; // Pole "Subdodávky"
        }

        // Hľadanie subdodávky v oboch poliach
        var subcontractEntry = null;
        var currentLocation = null;

        // 1. Hľadaj v poli "Diely"
        var partsEntries = utils.safeGetLinks(currentEntry, fields.parts) || [];
        for (var i = 0; i < partsEntries.length; i++) {
            var part = partsEntries[i];
            var partType = utils.safeGet(part, centralConfig.fields.orderPart.partType);
            if (partType === "Subdodávky") {
                subcontractEntry = part;
                currentLocation = "parts";
                utils.addDebug(currentEntry, "    ✅ Nájdená subdodávka v poli 'Diely'");
                break;
            }
        }

        // 2. Ak nie je v Dieloch, hľadaj v poli "Subdodávky"
        if (!subcontractEntry) {
            var subcontractsEntries = utils.safeGetLinks(currentEntry, subcontractsFieldName) || [];
            for (var i = 0; i < subcontractsEntries.length; i++) {
                var part = subcontractsEntries[i];
                var partType = utils.safeGet(part, centralConfig.fields.orderPart.partType);
                if (partType === "Subdodávky") {
                    subcontractEntry = part;
                    currentLocation = "subcontracts";
                    utils.addDebug(currentEntry, "    ✅ Nájdená subdodávka v poli 'Subdodávky'");
                    break;
                }
            }
        }

        // 3. Ak subdodávka neexistuje
        if (!subcontractEntry) {
            // Ak je nastavené "Neúčtovať" a subdodávka neexistuje - je to OK, vynechaj ostatné kroky
            if (subcontractsCalc === "Neúčtovať") {
                utils.addDebug(currentEntry, "    ✅ Subdodávka neexistuje, účtovanie je nastavené na 'Neúčtovať' - OK");
                currentEntry.set(subcontractsTotalFieldName, 0);
                return { subcontractEntry: null, location: null, totalSubcontracts: 0 };
            }

            // Ak je nastavené inak (Zarátať do ceny / Vytvoriť dodatok) a subdodávka neexistuje - upozorni
            utils.addDebug(currentEntry, "    ℹ️ Subdodávka nenájdená v žiadnom poli");
            utils.addDebug(currentEntry, "    ⚠️ Účtovanie je nastavené na '" + subcontractsCalc + "', ale subdodávka neexistuje");

            // Vynulovať pole "Celkom subdodávky"
            currentEntry.set(subcontractsTotalFieldName, 0);

            return { subcontractEntry: null, location: null, totalSubcontracts: 0 };
        }

        // 4. Ak je nastavené "Neúčtovať" a subdodávka existuje
        if (subcontractsCalc === "Neúčtovať") {
            message("⚠️ Účtovanie subdodávok je nastavené na 'Neúčtovať', ale subdodávka existuje!\n" +
                    "Subdodávka je v poli: " + (currentLocation === "parts" ? "Diely" : "Subdodávky"));
            utils.addDebug(currentEntry, "    ⚠️ Subdodávka existuje, ale účtovanie je nastavené na 'Neúčtovať'");

            // Vynulovať pole "Celkom subdodávky"
            currentEntry.set(subcontractsTotalFieldName, 0);

            return { subcontractEntry: subcontractEntry, location: currentLocation, totalSubcontracts: 0 };
        }

        // 5. Kontrola, či je subdodávka na správnom mieste
        if (currentLocation !== targetField) {
            utils.addDebug(currentEntry, "    🔄 Subdodávka je v nesprávnom poli, presúvam...");
            utils.addDebug(currentEntry, "      Z: " + (currentLocation === "parts" ? "Diely" : "Subdodávky"));
            utils.addDebug(currentEntry, "      Do: " + (targetField === "parts" ? "Diely" : "Subdodávky"));

            // Krok 1: Odstráň subdodávku z OBOCH polí (zabráni duplicitám)
            // Vyčisti pole Diely
            var cleanedParts = [];
            partsEntries = utils.safeGetLinks(currentEntry, fields.parts) || [];
            for (var i = 0; i < partsEntries.length; i++) {
                var partType = utils.safeGet(partsEntries[i], centralConfig.fields.orderPart.partType);
                if (partType !== "Subdodávky") {
                    cleanedParts.push(partsEntries[i]);
                }
            }
            currentEntry.set(fields.parts, cleanedParts);

            // Vyčisti pole Subdodávky
            var cleanedSubcontracts = [];
            var subcontractsEntries = utils.safeGetLinks(currentEntry, subcontractsFieldName) || [];
            for (var i = 0; i < subcontractsEntries.length; i++) {
                var partType = utils.safeGet(subcontractsEntries[i], centralConfig.fields.orderPart.partType);
                if (partType !== "Subdodávky") {
                    cleanedSubcontracts.push(subcontractsEntries[i]);
                }
            }
            currentEntry.set(subcontractsFieldName, cleanedSubcontracts);

            // Krok 2: Pridaj subdodávku LEN do cieľového poľa
            if (targetField === "parts") {
                cleanedParts.push(subcontractEntry);
                currentEntry.set(fields.parts, cleanedParts);
            } else {
                cleanedSubcontracts.push(subcontractEntry);
                currentEntry.set(subcontractsFieldName, cleanedSubcontracts);
            }

            currentLocation = targetField;
            utils.addDebug(currentEntry, "    ✅ Subdodávka presunutá (duplicity odstránené)");
        } else {
            // Aj keď je na správnom mieste, vyčisti duplicity
            utils.addDebug(currentEntry, "    ✅ Subdodávka je už na správnom mieste");

            // Kontrola duplicít v aktuálnom poli
            var hasDuplicates = false;
            if (currentLocation === "parts") {
                var count = 0;
                for (var i = 0; i < partsEntries.length; i++) {
                    var partType = utils.safeGet(partsEntries[i], centralConfig.fields.orderPart.partType);
                    if (partType === "Subdodávky") {
                        count++;
                    }
                }
                if (count > 1) {
                    hasDuplicates = true;
                    utils.addDebug(currentEntry, "    ⚠️ Nájdené duplicity v poli Diely, čistím...");
                    var cleanedParts = [];
                    var added = false;
                    for (var i = 0; i < partsEntries.length; i++) {
                        var partType = utils.safeGet(partsEntries[i], centralConfig.fields.orderPart.partType);
                        if (partType === "Subdodávky") {
                            if (!added) {
                                cleanedParts.push(partsEntries[i]);
                                added = true;
                            }
                        } else {
                            cleanedParts.push(partsEntries[i]);
                        }
                    }
                    currentEntry.set(fields.parts, cleanedParts);
                }
            } else {
                var subcontractsEntries = utils.safeGetLinks(currentEntry, subcontractsFieldName) || [];
                var count = 0;
                for (var i = 0; i < subcontractsEntries.length; i++) {
                    var partType = utils.safeGet(subcontractsEntries[i], centralConfig.fields.orderPart.partType);
                    if (partType === "Subdodávky") {
                        count++;
                    }
                }
                if (count > 1) {
                    hasDuplicates = true;
                    utils.addDebug(currentEntry, "    ⚠️ Nájdené duplicity v poli Subdodávky, čistím...");
                    var cleanedSubcontracts = [];
                    var added = false;
                    for (var i = 0; i < subcontractsEntries.length; i++) {
                        var partType = utils.safeGet(subcontractsEntries[i], centralConfig.fields.orderPart.partType);
                        if (partType === "Subdodávky") {
                            if (!added) {
                                cleanedSubcontracts.push(subcontractsEntries[i]);
                                added = true;
                            }
                        } else {
                            cleanedSubcontracts.push(subcontractsEntries[i]);
                        }
                    }
                    currentEntry.set(subcontractsFieldName, cleanedSubcontracts);
                }
            }

            if (hasDuplicates) {
                utils.addDebug(currentEntry, "    ✅ Duplicity odstránené");
            }
        }

        // 6. Získaj hodnotu "Celkom" zo subdodávky
        var subcontractTotal = utils.safeGet(subcontractEntry, centralConfig.fields.orderPart.totalSum) || 0;
        utils.addDebug(currentEntry, "    💰 Celkom subdodávky: " + subcontractTotal.toFixed(2) + " €");

        // 7. Aktualizuj pole "Celkom subdodávky" ak je v samostatnom poli
        if (currentLocation === "subcontracts") {
            currentEntry.set(subcontractsTotalFieldName, subcontractTotal);
            utils.addDebug(currentEntry, "    ✅ Aktualizované pole 'Celkom subdodávky'");
        } else {
            // Ak je v Dieloch, vynuluj "Celkom subdodávky" (lebo sa počíta v totalFromParts)
            currentEntry.set(subcontractsTotalFieldName, 0);
        }

        return {
            subcontractEntry: subcontractEntry,
            location: currentLocation,
            totalSubcontracts: currentLocation === "subcontracts" ? subcontractTotal : 0
        };

    } catch (error) {
        var errorMsg = "Chyba pri správe subdodávok: " + error.toString();
        if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
        if (error.stack) errorMsg += "\nStack: " + error.stack;
        utils.addError(currentEntry, errorMsg, "manageSubcontracts", error);
        throw error;
    }
}

// ==============================================
// HLAVNÁ LOGIKA PREPOČTU
// ==============================================

function main() {
    try {
        // Vyčisti logy na začiatku
        utils.clearLogs(currentEntry, true);

        // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Aktualizácia názvu z miesta" },
            step2a: { success: false, name: "Validácia prepojení dielov" },
            step2: { success: false, name: "Spočítanie dielov" },
            step2c: { success: false, name: "Správa subdodávok" },
            step2d: { success: false, name: "Výpočet hmotnosti materiálu" },
            step2b: { success: false, name: "Výpočet predpokladaných km" },
            step3: { success: false, name: "Výpočet dopravy" },
            step3b: { success: false, name: "Výpočet presunu hmôt" },
            step4: { success: false, name: "Výpočet DPH" },
            step5: { success: false, name: "Celková suma" }
        };

        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

        // Zisti dátum zákazky
        var currentDate = utils.safeGet(currentEntry, fields.date);
        if (!currentDate) {
            currentDate = new Date();
            utils.addDebug(currentEntry, "⚠️ Dátum nie je zadaný, použijem dnešný dátum");
        }
        utils.addDebug(currentEntry, "📅 Dátum zákazky: " + moment(currentDate).format("DD.MM.YYYY"));

        // KROK 1: Aktualizácia názvu z miesta realizácie
        utils.addDebug(currentEntry, "\n" + utils.getIcon("place") + " KROK 1: Aktualizácia názvu z miesta realizácie");
        try {
            updateNameFromPlace();
            steps.step1.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri aktualizácii názvu: " + error.toString(), CONFIG.scriptName);
            steps.step1.success = false;
        }

        // KROK 2a: Validácia prepojení dielov so zákazkou
        utils.addDebug(currentEntry, "\n" + utils.getIcon("settings") + " KROK 2a: Validácia prepojení dielov");
        try {
            validatePartsLinks();
            steps.step2a.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri validácii prepojení dielov: " + error.toString(), CONFIG.scriptName);
            steps.step2a.success = false;
            // Pokračujeme aj pri chybe - môžu existovať validné diely
        }

        // KROK 2: Spočítanie súčtov z dielov
        utils.addDebug(currentEntry, "\n" + utils.getIcon("calculation") + " KROK 2: Spočítanie súčtov z dielov");
        var totalFromParts = 0;
        try {
            totalFromParts = calculatePartsTotal();
            currentEntry.set(fields.total, totalFromParts);
            steps.step2.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri spočítaní dielov: " + error.toString(), CONFIG.scriptName);
            steps.step2.success = false;
            return false;
        }

        // KROK 2c: Správa subdodávok (presun medzi Diely/Subdodávky podľa nastavenia)
        utils.addDebug(currentEntry, "\n" + utils.getIcon("settings") + " KROK 2c: Správa subdodávok");
        var subcontractsInfo = { subcontractEntry: null, location: null, totalSubcontracts: 0 };
        try {
            subcontractsInfo = manageSubcontracts();
            steps.step2c.success = true;

            // Po presune subdodávky znova spočítaj totalFromParts
            totalFromParts = calculatePartsTotal();
            currentEntry.set(fields.total, totalFromParts);
            utils.addDebug(currentEntry, "  ✅ Prepočítaná suma z dielov: " + totalFromParts.toFixed(2) + " €");

        } catch (error) {
            utils.addError(currentEntry, "Chyba pri správe subdodávok: " + error.toString(), CONFIG.scriptName);
            steps.step2c.success = false;
        }

        // KROK 2d: Výpočet celkovej hmotnosti materiálu
        utils.addDebug(currentEntry, "\n" + utils.getIcon("calculation") + " KROK 2d: Výpočet hmotnosti materiálu");
        var materialWeight = 0;
        try {
            materialWeight = calculateMaterialWeight();
            currentEntry.set(fields.materialWeight, materialWeight);
            steps.step2d.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri výpočte hmotnosti materiálu: " + error.toString(), CONFIG.scriptName);
            steps.step2d.success = false;
            // Pokračujeme aj pri chybe - presun hmôt môže byť iná metóda
        }

        // KROK 2b: Výpočet predpokladaného počtu km
        utils.addDebug(currentEntry, "\n" + utils.getIcon("transport") + " KROK 2b: Výpočet predpokladaného počtu km");
        var expectedKm = 0;
        try {
            expectedKm = calculateExpectedKm();
            currentEntry.set(fields.expectedKm, expectedKm);
            steps.step2b.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri výpočte predpokladaných km: " + error.toString(), CONFIG.scriptName);
            steps.step2b.success = false;
            // Pokračujeme aj pri chybe - doprava môže byť iná metóda
        }

        // KROK 3: Výpočet dopravy
        utils.addDebug(currentEntry, "\n" + utils.getIcon("transport") + " KROK 3: Výpočet dopravy");
        var transportPrice = 0;
        try {
            transportPrice = calculateTransportPrice(totalFromParts, currentDate, expectedKm);
            currentEntry.set(fields.transportPrice, transportPrice);
            steps.step3.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri výpočte dopravy: " + error.toString(), CONFIG.scriptName);
            steps.step3.success = false;
        }

        // KROK 3b: Výpočet ceny presunu hmôt
        utils.addDebug(currentEntry, "\n" + utils.getIcon("calculation") + " KROK 3b: Výpočet ceny presunu hmôt");
        var massTransferPrice = 0;
        try {
            massTransferPrice = calculateMassTransferPrice(totalFromParts, materialWeight, currentDate);
            currentEntry.set(fields.massTransferPrice, massTransferPrice);
            steps.step3b.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri výpočte presunu hmôt: " + error.toString(), CONFIG.scriptName);
            steps.step3b.success = false;
        }

        // KROK 4: Výpočet DPH
        utils.addDebug(currentEntry, "\n" + utils.getIcon("calculation") + " KROK 4: Výpočet DPH");
        try {
            var vatRatePercentage = utils.getValidVatRate(currentDate, "základná");
            utils.addDebug(currentEntry, "  Sadzba DPH: " + vatRatePercentage + "%");

            currentEntry.set(fields.vatRate, vatRatePercentage);

            var baseForVat = totalFromParts + transportPrice + massTransferPrice;
            var vatAmount = baseForVat * (vatRatePercentage / 100);

            utils.addDebug(currentEntry, "  Základ pre DPH: " + baseForVat.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  ✅ DPH: " + vatAmount.toFixed(2) + " €");

            currentEntry.set(fields.vat, vatAmount);
            steps.step4.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri výpočte DPH: " + error.toString(), CONFIG.scriptName);
            steps.step4.success = false;
        }

        // KROK 5: Celková suma s DPH
        utils.addDebug(currentEntry, "\n" + utils.getIcon("finish") + " KROK 5: Celková suma");
        try {
            var baseForVat = totalFromParts + transportPrice + massTransferPrice;
            var vatAmount = baseForVat * (vatRatePercentage / 100);
            var totalWithVat = baseForVat + vatAmount;

            utils.addDebug(currentEntry, "  Celkom z dielov:     " + totalFromParts.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  Doprava:             " + transportPrice.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  Presun hmôt:         " + massTransferPrice.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  Hmotnosť materiálu:  " + materialWeight.toFixed(3) + " t");
            utils.addDebug(currentEntry, "  " + "-".repeat(50));
            utils.addDebug(currentEntry, "  Celkom (bez DPH):    " + baseForVat.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  DPH:                 " + vatAmount.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  " + "-".repeat(50));
            utils.addDebug(currentEntry, "  ✅ CELKOM S DPH:      " + totalWithVat.toFixed(2) + " €");

            currentEntry.set(fields.total, baseForVat);
            currentEntry.set(fields.totalWithVat, totalWithVat);
            steps.step5.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri výpočte celkovej sumy: " + error.toString(), CONFIG.scriptName);
            steps.step5.success = false;
        }

        // Finálne info
        utils.addDebug(currentEntry, "\n" + utils.getIcon("finish") + " === KONIEC PREPOČTU ===");

        var successCount = 0;
        var totalSteps = Object.keys(steps).length;
        for (var key in steps) {
            if (steps[key].success) successCount++;
        }
        utils.addDebug(currentEntry, "Úspešnosť: " + successCount + "/" + totalSteps + " krokov");

        return true;

    } catch (error) {
        utils.addError(currentEntry, "❌ KRITICKÁ CHYBA: " + error.toString() + ", Line: " + error.lineNumber, "MAIN", error);
        return false;
    }
}

// Spustenie hlavnej funkcie
main();
