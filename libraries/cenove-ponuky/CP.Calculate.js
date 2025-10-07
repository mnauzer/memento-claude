// ==============================================
// CENOVÉ PONUKY - Hlavný prepočet
// Verzia: 1.2.2 | Dátum: 2025-10-07 | Autor: ASISTANTO
// Knižnica: Cenové ponuky (ID: 90RmdjWuk)
// Trigger: onChange
// ==============================================
// 📋 FUNKCIA:
//    - Aktualizuje názov z Miesta realizácie
//    - Spočíta hodnoty "Celkom" zo všetkých dielov cenovej ponuky
//    - Vypočíta predpokladaný počet km (vzdialenosť × 2 × počet jázd)
//    - Vypočíta cenu dopravy podľa nastavenia (Paušál, Km, % zo zákazky, Pevná cena)
//    - Vypočíta cenu presunu hmôt podľa nastavenia
//    - Vypočíta cenu subdodávok podľa nastavenia
//    - Získa aktuálnu sadzbu DPH
//    - Vypočíta celkovú sumu s DPH
// ==============================================
// 🔧 CHANGELOG v1.2.2 (2025-10-07):
//    - KRITICKÁ OPRAVA: Metóda "km" sa nespúšťala kvôli case-sensitive porovnaniu
//    - FIX: Opravené porovnanie z "km" na "Km" (hodnota v Memento je s veľkým K)
//    - OPRAVA: Odstránené var business = MementoBusiness (používa sa len utils)
//    - OPRAVA: utils.getValidVatRate() namiesto business.getValidVatRate()
//    - DÔVOD: Debug log končil po "Typ účtovania: km" bez vykonania metódy
// 🔧 CHANGELOG v1.2.1 (2025-10-07):
//    - OPRAVA: expectedKm sa predáva ako parameter do calculateTransportPrice()
//    - FIX: Metóda "km" teraz dostáva správnu hodnotu expectedKm z premennej, nie z poľa
//    - DÔVOD: Pole expectedKm ešte nemusí byť uložené v databáze pri volaní calculateTransportPrice()
// 🔧 CHANGELOG v1.2.0 (2025-10-07):
//    - PRIDANÉ: KROK 2b - Výpočet predpokladaného počtu km
//    - PRIDANÉ: Funkcia calculateExpectedKm() - vzdialenosť × 2 × počet jázd
//    - OPRAVA: Metóda "km" používa predpočítané pole expectedKm
//    - ZJEDNODUŠENÉ: Metóda "km" - odstránený duplicitný výpočet vzdialenosti
//    - ODSTRÁNENÉ: Diagnostic kód z metódy "Pevná cena" (už funguje správne)
// 🔧 CHANGELOG v1.1.0 (2025-10-07):
//    - REFACTOR: Kompletný refactoring štruktúry scriptu
//    - PRIDANÉ: Štruktúrované kroky s progress trackingom (steps object)
//    - PRIDANÉ: Try-catch na všetkých funkciách s detailným error loggingom
//    - PRIDANÉ: Stack trace a číslo riadku pri chybách
//    - PRIDANÉ: Ikony pre každý krok (utils.getIcon)
//    - PRIDANÉ: Detailný debugging pre každú metódu dopravy
//    - PRIDANÉ: Finálne info o úspešnosti krokov
//    - VYLEPŠENÉ: Lepšie odsadenie a prehľadnosť logov
// 🔧 CHANGELOG v1.0.2 (2025-10-07):
//    - OPRAVA: Pevná cena dopravy - čítanie z poľa "Doprava pevná cena" (fixedTransportPrice)
//    - OPRAVA: Názov poľa "Doprava cena za km" (bol len "Cena za km")
//    - PRIDANÉ: Lepšie warning pre nevyplnenú pevnú cenu
// 🔧 CHANGELOG v1.0.1 (2025-10-07):
//    - OPRAVA: Použitie správnej funkcie getValidVatRate(date, vatType)
//    - PRIDANÉ: Aktualizácia názvu z Miesta realizácie
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
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Cenové ponuky - Prepočet",
    version: "1.2.2",

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
 * Aktualizuje názov cenovej ponuky z Miesta realizácie
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
 * Spočíta hodnoty "Celkom" zo všetkých dielov cenovej ponuky
 * @returns {Number} - Suma všetkých dielov
 */
function calculatePartsTotal() {
    try {
        utils.addDebug(currentEntry, "  📋 Spočítanie súčtov z dielov");

        var partsEntries = utils.safeGetLinks(currentEntry, fields.parts);

        if (!partsEntries || partsEntries.length === 0) {
            utils.addDebug(currentEntry, "    ⚠️ Žiadne diely cenovej ponuky");
            return 0;
        }

        utils.addDebug(currentEntry, "    Počet dielov: " + partsEntries.length);

        var totalSum = 0;
        var partTotalField = centralConfig.fields.quotePart.totalSum; // "Celkom"

        for (var i = 0; i < partsEntries.length; i++) {
            var part = partsEntries[i];
            var partTotal = utils.safeGet(part, partTotalField) || 0;

            var partName = utils.safeGet(part, centralConfig.fields.quotePart.name) || "Diel #" + (i + 1);
            utils.addDebug(currentEntry, "      • " + partName + ": " + partTotal.toFixed(2) + " €");

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
 * @param {Date} currentDate - Dátum cenovej ponuky
 * @param {Number} expectedKm - Predpokladaný počet km (už vypočítaný)
 * @returns {Number} - Cena dopravy
 */
function calculateTransportPrice(totalFromParts, currentDate, expectedKm) {
    try {
        utils.addDebug(currentEntry, "  🚗 Výpočet dopravy");

        var rideCalc = utils.safeGet(currentEntry, fields.rideCalculation) || "Neúčtovať";
        utils.addDebug(currentEntry, "    Typ účtovania: " + rideCalc);

        if (rideCalc === "Neúčtovať" || !rideCalc) {
            utils.addDebug(currentEntry, "    ℹ️ Doprava sa neúčtuje");
            return 0;
        }

        var transportPrice = 0;

        // ========== PAUŠÁL ==========
        if (rideCalc === "Paušál") {
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
            step2: { success: false, name: "Spočítanie dielov" },
            step2b: { success: false, name: "Výpočet predpokladaných km" },
            step3: { success: false, name: "Výpočet dopravy" },
            step4: { success: false, name: "Výpočet DPH" },
            step5: { success: false, name: "Celková suma" }
        };

        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

        // Zisti dátum cenovej ponuky
        var currentDate = utils.safeGet(currentEntry, fields.date);
        if (!currentDate) {
            currentDate = new Date();
            utils.addDebug(currentEntry, "⚠️ Dátum nie je zadaný, použijem dnešný dátum");
        }
        utils.addDebug(currentEntry, "📅 Dátum cenovej ponuky: " + moment(currentDate).format("DD.MM.YYYY"));

        // KROK 1: Aktualizácia názvu z miesta realizácie
        utils.addDebug(currentEntry, "\n" + utils.getIcon("place") + " KROK 1: Aktualizácia názvu z miesta realizácie");
        try {
            updateNameFromPlace();
            steps.step1.success = true;
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri aktualizácii názvu: " + error.toString(), CONFIG.scriptName);
            steps.step1.success = false;
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

        // KROK 4: Výpočet DPH
        utils.addDebug(currentEntry, "\n" + utils.getIcon("calculation") + " KROK 4: Výpočet DPH");
        try {
            var vatRatePercentage = utils.getValidVatRate(currentDate, "základná");
            utils.addDebug(currentEntry, "  Sadzba DPH: " + vatRatePercentage + "%");

            currentEntry.set(fields.vatRate, vatRatePercentage);

            var baseForVat = totalFromParts + transportPrice;
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
            var baseForVat = totalFromParts + transportPrice;
            var vatAmount = baseForVat * (vatRatePercentage / 100);
            var totalWithVat = baseForVat + vatAmount;

            utils.addDebug(currentEntry, "  Celkom z dielov: " + totalFromParts.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  Doprava:         " + transportPrice.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  DPH:             " + vatAmount.toFixed(2) + " €");
            utils.addDebug(currentEntry, "  " + "-".repeat(48));
            utils.addDebug(currentEntry, "  ✅ CELKOM S DPH:  " + totalWithVat.toFixed(2) + " €");

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
