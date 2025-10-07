// ==============================================
// CENOVÉ PONUKY - Hlavný prepočet
// Verzia: 1.0.0 | Dátum: 2025-10-07 | Autor: ASISTANTO
// Knižnica: Cenové ponuky (ID: 90RmdjWuk)
// Trigger: onChange
// ==============================================
// 📋 FUNKCIA:
//    - Spočíta hodnoty "Celkom" zo všetkých dielov cenovej ponuky
//    - Vypočíta cenu dopravy podľa nastavenia (Paušál, km, %, Pevná cena)
//    - Vypočíta cenu presunu hmôt podľa nastavenia
//    - Vypočíta cenu subdodávok podľa nastavenia
//    - Získa aktuálnu sadzbu DPH
//    - Vypočíta celkovú sumu s DPH
// ==============================================
// 🔧 CHANGELOG v1.0.0 (2025-10-07):
//    - Prvá verzia
//    - Spočítanie súčtov z dielov
//    - Výpočet dopravy (Paušál, km, %, Pevná cena)
//    - Výpočet DPH a celkovej sumy
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var business = MementoBusiness;
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Cenové ponuky - Prepočet",
    version: "1.0.0",

    // Referencie na centrálny config
    fields: centralConfig.fields.quote,
    icons: centralConfig.icons
};

var fields = CONFIG.fields;

utils.addDebug(currentEntry, "🚀 START: Prepočet cenovej ponuky");

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Spočíta hodnoty "Celkom" zo všetkých dielov cenovej ponuky
 * @returns {Number} - Suma všetkých dielov
 */
function calculatePartsTotal() {
    try {
        utils.addDebug(currentEntry, "\n📋 Spočítanie súčtov z dielov");

        var partsEntries = utils.safeGetLinks(currentEntry, fields.parts);

        if (!partsEntries || partsEntries.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Žiadne diely cenovej ponuky");
            return 0;
        }

        utils.addDebug(currentEntry, "  Počet dielov: " + partsEntries.length);

        var totalSum = 0;
        var partTotalField = centralConfig.fields.quotePart.totalSum; // "Celkom"

        for (var i = 0; i < partsEntries.length; i++) {
            var part = partsEntries[i];
            var partTotal = utils.safeGet(part, partTotalField) || 0;

            var partName = utils.safeGet(part, centralConfig.fields.quotePart.name) || "Diel #" + (i + 1);
            utils.addDebug(currentEntry, "    • " + partName + ": " + partTotal.toFixed(2) + " €");

            totalSum += partTotal;
        }

        utils.addDebug(currentEntry, "  ✅ Celkový súčet dielov: " + totalSum.toFixed(2) + " €");
        return totalSum;

    } catch (error) {
        utils.addError(currentEntry, "❌ Chyba pri spočítaní dielov: " + error.toString(), "calculatePartsTotal", error);
        return 0;
    }
}

/**
 * Nájde platnú cenu práce k danému dátumu
 * @param {Entry} workEntry - Záznam práce (Cenník prác)
 * @param {Date} date - Dátum pre ktorý hľadáme cenu
 * @returns {Number|null} - Platná cena alebo null
 */
function findWorkPrice(workEntry, date) {
    var options = {
        priceLibrary: "workPrices",
        linkField: "work",
        priceField: "price",
        fallbackPriceField: "price",
        currentEntry: currentEntry
    };
    return utils.findValidPrice(workEntry, date, options);
}

/**
 * Vypočíta cenu dopravy podľa nastaveného typu účtovania
 * @param {Number} totalFromParts - Celková suma z dielov
 * @param {Date} currentDate - Dátum cenovej ponuky
 * @returns {Number} - Cena dopravy
 */
function calculateTransportPrice(totalFromParts, currentDate) {
    try {
        utils.addDebug(currentEntry, "\n🚗 Výpočet dopravy");

        var rideCalc = utils.safeGet(currentEntry, fields.rideCalculation) || "Neúčtovať";
        utils.addDebug(currentEntry, "  Typ účtovania: " + rideCalc);

        if (rideCalc === "Neúčtovať" || !rideCalc) {
            utils.addDebug(currentEntry, "  ℹ️ Doprava sa neúčtuje");
            return 0;
        }

        var transportPrice = 0;

        // ========== PAUŠÁL ==========
        if (rideCalc === "Paušál") {
            var flatRateEntries = utils.safeGetLinks(currentEntry, fields.rideFlatRate);

            if (!flatRateEntries || flatRateEntries.length === 0) {
                utils.addDebug(currentEntry, "  ⚠️ Nie je vybraná položka Paušál dopravy");
                return 0;
            }

            var flatRateEntry = flatRateEntries[0];
            var flatRateName = utils.safeGet(flatRateEntry, centralConfig.fields.priceList.name) || "Paušál";

            // Zisti cenu paušálu
            var flatRatePrice = findWorkPrice(flatRateEntry, currentDate);

            if (!flatRatePrice || flatRatePrice <= 0) {
                utils.addDebug(currentEntry, "  ⚠️ Neplatná cena paušálu");
                return 0;
            }

            var ridesCount = utils.safeGet(currentEntry, fields.expectedRidesCount) || 1;

            transportPrice = flatRatePrice * ridesCount;

            utils.addDebug(currentEntry, "  📊 " + flatRateName + ": " + flatRatePrice.toFixed(2) + " € × " + ridesCount + " jázd");
            utils.addDebug(currentEntry, "  ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
        }

        // ========== KILOMETER ==========
        else if (rideCalc === "km") {
            var kmPriceEntries = utils.safeGetLinks(currentEntry, fields.kmPrice);

            if (!kmPriceEntries || kmPriceEntries.length === 0) {
                utils.addDebug(currentEntry, "  ⚠️ Nie je vybraná položka Cena za km");
                return 0;
            }

            var kmPriceEntry = kmPriceEntries[0];
            var kmPriceName = utils.safeGet(kmPriceEntry, centralConfig.fields.priceList.name) || "Cena za km";

            // Zisti cenu za km
            var kmPriceValue = findWorkPrice(kmPriceEntry, currentDate);

            if (!kmPriceValue || kmPriceValue <= 0) {
                utils.addDebug(currentEntry, "  ⚠️ Neplatná cena za km");
                return 0;
            }

            // Zisti vzdialenosť z miesta realizácie
            var placeEntries = utils.safeGetLinks(currentEntry, fields.place);

            if (!placeEntries || placeEntries.length === 0) {
                utils.addDebug(currentEntry, "  ⚠️ Nie je vybrané miesto realizácie");
                return 0;
            }

            var placeEntry = placeEntries[0];
            var distance = utils.safeGet(placeEntry, centralConfig.fields.place.distance) || 0;

            if (distance <= 0) {
                utils.addDebug(currentEntry, "  ⚠️ Vzdialenosť miesta je 0 km");
                return 0;
            }

            var ridesCount = utils.safeGet(currentEntry, fields.expectedRidesCount) || 1;

            // Vzdialenosť tam a nazad
            var totalKm = distance * 2 * ridesCount;

            transportPrice = kmPriceValue * totalKm;

            utils.addDebug(currentEntry, "  📊 " + kmPriceName + ": " + kmPriceValue.toFixed(2) + " €/km");
            utils.addDebug(currentEntry, "  📏 Vzdialenosť: " + distance + " km × 2 × " + ridesCount + " jázd = " + totalKm + " km");
            utils.addDebug(currentEntry, "  ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
        }

        // ========== PERCENTO ZO ZÁKAZKY ==========
        else if (rideCalc === "% zo zákazky") {
            var ridePercentage = utils.safeGet(currentEntry, fields.ridePercentage) || 0;

            if (ridePercentage <= 0) {
                utils.addDebug(currentEntry, "  ⚠️ Percento dopravy je 0%");
                return 0;
            }

            transportPrice = totalFromParts * (ridePercentage / 100);

            utils.addDebug(currentEntry, "  📊 Základ: " + totalFromParts.toFixed(2) + " € × " + ridePercentage + "%");
            utils.addDebug(currentEntry, "  ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
        }

        // ========== PEVNÁ CENA ==========
        else if (rideCalc === "Pevná cena") {
            transportPrice = utils.safeGet(currentEntry, fields.transportPrice) || 0;

            utils.addDebug(currentEntry, "  📊 Pevná cena dopravy");
            utils.addDebug(currentEntry, "  ✅ Cena dopravy: " + transportPrice.toFixed(2) + " €");
        }

        return transportPrice;

    } catch (error) {
        utils.addError(currentEntry, "❌ Chyba pri výpočte dopravy: " + error.toString(), "calculateTransportPrice", error);
        return 0;
    }
}

// ==============================================
// HLAVNÁ LOGIKA PREPOČTU
// ==============================================

try {
    var currentDate = utils.safeGet(currentEntry, fields.date);

    if (!currentDate) {
        currentDate = new Date();
        utils.addDebug(currentEntry, "⚠️ Dátum nie je zadaný, použijem dnešný dátum");
    }

    utils.addDebug(currentEntry, "📅 Dátum cenovej ponuky: " + moment(currentDate).format("DD.MM.YYYY"));

    // ========== SPOČÍTANIE DIELOV ==========
    var totalFromParts = calculatePartsTotal();

    // Zapíš do poľa Celkom
    currentEntry.set(fields.total, totalFromParts);

    // ========== VÝPOČET DOPRAVY ==========
    var transportPrice = calculateTransportPrice(totalFromParts, currentDate);

    // Zapíš do poľa Cena dopravy
    currentEntry.set(fields.transportPrice, transportPrice);

    // ========== ZÍSKANIE SADZBY DPH ==========
    utils.addDebug(currentEntry, "\n💰 Výpočet DPH");

    var vatRatePercentage = business.getCurrentVatRate(currentDate);
    utils.addDebug(currentEntry, "  Sadzba DPH: " + vatRatePercentage + "%");

    // Zapíš sadzbu DPH
    currentEntry.set(fields.vatRate, vatRatePercentage);

    // ========== VÝPOČET DPH ==========
    var baseForVat = totalFromParts + transportPrice;
    var vatAmount = baseForVat * (vatRatePercentage / 100);

    utils.addDebug(currentEntry, "  Základ pre DPH: " + baseForVat.toFixed(2) + " €");
    utils.addDebug(currentEntry, "  ✅ DPH: " + vatAmount.toFixed(2) + " €");

    // Zapíš DPH
    currentEntry.set(fields.vat, vatAmount);

    // ========== CELKOVÁ SUMA S DPH ==========
    var totalWithVat = baseForVat + vatAmount;

    utils.addDebug(currentEntry, "\n💵 CELKOVÁ SUMA");
    utils.addDebug(currentEntry, "  Celkom z dielov: " + totalFromParts.toFixed(2) + " €");
    utils.addDebug(currentEntry, "  Doprava:         " + transportPrice.toFixed(2) + " €");
    utils.addDebug(currentEntry, "  DPH:             " + vatAmount.toFixed(2) + " €");
    utils.addDebug(currentEntry, "  " + "-".repeat(48));
    utils.addDebug(currentEntry, "  ✅ CELKOM S DPH:  " + totalWithVat.toFixed(2) + " €");

    // Zapíš celkovú sumu
    currentEntry.set(fields.totalWithVat, totalWithVat);

    utils.addDebug(currentEntry, "\n✅ FINISH: Prepočet cenovej ponuky úspešne dokončený");

} catch (error) {
    utils.addError(currentEntry, "❌ KRITICKÁ CHYBA: " + error.toString() + ", Line: " + error.lineNumber, "MAIN", error);
}
