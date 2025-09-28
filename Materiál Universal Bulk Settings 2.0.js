/**
 * MATERIÁL UNIVERSAL BULK SETTINGS
 * Verzia: 2.0 | Dátum: September 2025 | Autor: ASISTANTO
 *
 * FUNKCIA:
 * - Univerzálne hromadné nastavenie polí pre materiály
 * - Implementuje pokročilé development patterns
 * - Používa centralizovaný dátový objekt
 * - Využíva nové addInfo/addInfoTelegram funkcie
 * - Optimalizované field access cez MementoConfig
 * - Znovupoužiteľné funkcie pre bulk operations
 */

// ===== INICIALIZÁCIA MODULOV =====
var utils = MementoUtils;
var config = utils.getConfig();
var core = utils.getCore();
var business = utils.getBusiness();

// ===== KONFIGURÁCIA SCRIPTU =====
var SCRIPT_CONFIG = {
    name: "Materiál Universal Bulk Settings",
    version: "2.0",
    fields: config.fields.items,
    libraries: {
        primary: config.libraries.inventory
    },
    arguments: [
        "Prepočet ceny",
        "Obchodná prirážka",
        "Zaokrúhľovanie cien",
        "Hodnota zaokrúhenia",
        "Zmena nákupnej ceny",
        "Percento zmeny"
    ]
};

// ===== CENTRALIZOVANÝ DÁTOVÝ OBJEKT =====
var BulkSettingsData = {
    // Základné info o operácii
    operation: {
        selectedMaterials: [],
        arguments: {},
        timestamp: null
    },

    // Výsledky spracovania
    results: {
        totalMaterials: 0,
        processedMaterials: 0,
        updatedMaterials: 0,
        skippedMaterials: 0,
        errorMaterials: 0
    },

    // Detaily spracovaných materiálov
    materialDetails: {},

    // Nastavenia operácie
    settings: {
        validateArguments: true,
        createDetailedLogs: true,
        addSettingsIcon: true,
        showProgressDialog: false
    },

    // Špeciálne flagy
    flags: {
        hasAnyChanges: false,
        hasValidationErrors: false,
        hasProcessingErrors: false
    },

    // Metódy pre prácu s objektom
    addMaterialResult: function(materialId, materialData) {
        this.materialDetails[materialId] = materialData;
        this.results.processedMaterials++;

        if (materialData.error) {
            this.results.errorMaterials++;
            this.flags.hasProcessingErrors = true;
        } else if (materialData.changes && materialData.changes.length > 0) {
            this.results.updatedMaterials++;
            this.flags.hasAnyChanges = true;
        } else {
            this.results.skippedMaterials++;
        }
    },

    getMaterialResult: function(materialId) {
        return this.materialDetails[materialId] || null;
    },

    getSummary: function() {
        return {
            operation: this.operation,
            results: this.results,
            flags: this.flags,
            processedCount: Object.keys(this.materialDetails).length
        };
    }
};

// ===== HLAVNÁ LOGIKA =====
function main() {
    try {
        // 1. Validácia a príprava
        validateEnvironment();

        // 2. Získanie dát optimalizovaným spôsobom
        var bulkData = getBulkOperationDataOptimized();

        // 3. Spracovanie s centralizovaným objektom
        processBulkSettings(bulkData, BulkSettingsData);

        // 4. Generovanie výsledkov
        var summary = BulkSettingsData.getSummary();

        // 5. Logging a output s novými addInfo funkciami
        core.addInfo(entry(), "Bulk nastavenie materiálov dokončené", summary, {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "BulkSettings",
            sectionName: "Súhrn operácie",
            includeHeader: true,
            includeFooter: true
        });

        // 6. Zobrazenie výsledkov užívateľovi
        showOperationResults(summary);

    } catch (error) {
        core.addError(entry(), error.toString(), "main", {
            script: SCRIPT_CONFIG.name,
            version: SCRIPT_CONFIG.version
        });

        utils.showErrorDialog("❌ KRITICKÁ CHYBA\n\n" + error.toString());
    }
}

// ===== HELPER FUNKCIE =====
function getBulkOperationDataOptimized() {
    // Inicializuj operáciu
    BulkSettingsData.operation.timestamp = new Date();

    // Získaj označené materiály - prioritne cez selectedEntries()
    var selectedMaterials = getSelectedMaterialsOptimized();
    if (!selectedMaterials || selectedMaterials.length === 0) {
        throw new Error("Žiadne materiály nie sú označené pre bulk operáciu");
    }

    BulkSettingsData.operation.selectedMaterials = selectedMaterials;
    BulkSettingsData.results.totalMaterials = selectedMaterials.length;

    // Získaj a validuj argumenty
    var operationArguments = getValidatedArguments();
    BulkSettingsData.operation.arguments = operationArguments;

    utils.addDebug(entry(), `Pripravená bulk operácia`, {
        materialsCount: selectedMaterials.length,
        argumentsCount: Object.keys(operationArguments.validArguments).length
    });

    return {
        materials: selectedMaterials,
        arguments: operationArguments,
        timestamp: BulkSettingsData.operation.timestamp
    };
}

function getSelectedMaterialsOptimized() {
    try {
        // Prioritne použiť selectedEntries() - štandardný Memento prístup
        var selected = selectedEntries();

        if (!selected || selected.length === 0) {
            return [];
        }

        // Validácia že sú to materiály z správnej knižnice
        var validMaterials = [];
        var materialLibrary = lib(SCRIPT_CONFIG.libraries.primary);

        selected.forEach(function(entry) {
            // Skontroluj či entry patrí do knižnice materiálov
            if (entry && entry.library && entry.library() === materialLibrary) {
                validMaterials.push(entry);
            }
        });

        return validMaterials;

    } catch (error) {
        utils.addError(entry(), `Chyba získania označených materiálov: ${error.message}`, "getSelectedMaterialsOptimized");
        return [];
    }
}

function getValidatedArguments() {
    var argumentsData = {
        validArguments: {},
        hasValidArguments: false,
        validationErrors: []
    };

    try {
        // Spracuj všetky definované argumenty
        SCRIPT_CONFIG.arguments.forEach(function(argName) {
            var value = getSafeArgumentValue(argName);

            if (value !== null && value !== undefined && value !== "") {
                // Validácia podľa typu argumentu
                var validatedValue = validateArgumentValue(argName, value);

                if (validatedValue.isValid) {
                    argumentsData.validArguments[argName] = validatedValue.value;
                    argumentsData.hasValidArguments = true;
                } else {
                    argumentsData.validationErrors.push(`${argName}: ${validatedValue.error}`);
                    BulkSettingsData.flags.hasValidationErrors = true;
                }
            }
        });

        if (!argumentsData.hasValidArguments) {
            throw new Error("Nie je zadaný žiadny platný argument pre bulk operáciu");
        }

        return argumentsData;

    } catch (error) {
        throw new Error(`Chyba validácie argumentov: ${error.message}`);
    }
}

function getSafeArgumentValue(argName) {
    try {
        return arg(argName);
    } catch (error) {
        utils.addError(entry(), `Chyba získania argumentu '${argName}': ${error.message}`, "getSafeArgumentValue");
        return null;
    }
}

function validateArgumentValue(argName, value) {
    try {
        switch (argName) {
            case "Obchodná prirážka":
            case "Percento zmeny":
                var numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    return { isValid: false, error: "Musí byť číselná hodnota" };
                }
                if (numValue < 0 || numValue > 1000) {
                    return { isValid: false, error: "Hodnota musí byť medzi 0-1000%" };
                }
                return { isValid: true, value: numValue };

            case "Prepočet ceny":
                var validOptions = ["Pevná cena", "Podľa prirážky", "Neprepočítavať"];
                if (!validOptions.includes(value)) {
                    return { isValid: false, error: `Platné možnosti: ${validOptions.join(", ")}` };
                }
                return { isValid: true, value: value };

            case "Zaokrúhľovanie cien":
                var validOptions = ["Nahor", "Nadol", "Nezaokrúhľovať", "Najbližšie"];
                if (!validOptions.includes(value)) {
                    return { isValid: false, error: `Platné možnosti: ${validOptions.join(", ")}` };
                }
                return { isValid: true, value: value };

            case "Hodnota zaokrúhenia":
                var validOptions = ["Desatiny", "Jednotky", "Desiatky", "Stovky"];
                if (!validOptions.includes(value)) {
                    return { isValid: false, error: `Platné možnosti: ${validOptions.join(", ")}` };
                }
                return { isValid: true, value: value };

            case "Zmena nákupnej ceny":
                var validOptions = ["Upozorniť", "Prepočítať", "Upozorniť a prepočítať", "Ignorovať"];
                if (!validOptions.includes(value)) {
                    return { isValid: false, error: `Platné možnosti: ${validOptions.join(", ")}` };
                }
                return { isValid: true, value: value };

            default:
                return { isValid: true, value: value };
        }
    } catch (error) {
        return { isValid: false, error: `Chyba validácie: ${error.message}` };
    }
}

function processBulkSettings(bulkData, resultObject) {
    var materials = bulkData.materials;
    var arguments = bulkData.arguments.validArguments;

    materials.forEach(function(material, index) {
        try {
            // Získaj info o materiáli
            var materialInfo = getMaterialInfo(material);

            // Vyčisti logy materiálu
            clearMaterialLogs(material);

            // Spracuj nastavenia pre tento materiál
            var materialResult = processMaterialSettings(material, materialInfo, arguments);

            // Ulož výsledok
            resultObject.addMaterialResult(material.id(), materialResult);

            // Aktualizuj materiál ak boli zmeny
            if (materialResult.changes && materialResult.changes.length > 0) {
                updateMaterialWithResults(material, materialResult, arguments);
            }

            utils.addDebug(material, `Spracovaný materiál: ${materialInfo.name}`, {
                changes: materialResult.changes ? materialResult.changes.length : 0,
                hasError: !!materialResult.error
            });

        } catch (materialError) {
            var errorResult = {
                materialInfo: { id: material.id(), name: "Neznámy materiál" },
                error: materialError.toString(),
                changes: []
            };

            resultObject.addMaterialResult(material.id(), errorResult);

            utils.addError(material, `Chyba spracovania materiálu na indexe ${index}: ${materialError.message}`, "processBulkSettings");
        }
    });
}

function getMaterialInfo(material) {
    return {
        id: material.id(),
        name: core.safeFieldAccess(material, config.fields.items.name, "Neznámy materiál"),
        category: core.safeFieldAccess(material, config.fields.items.category, ""),
        entry: material
    };
}

function clearMaterialLogs(material) {
    // Vyčisti debug a error logy pre čistý stav
    core.safeSet(material, config.fields.common.debugLog, "");
    core.safeSet(material, config.fields.common.errorLog, "");
}

function processMaterialSettings(material, materialInfo, arguments) {
    var result = {
        materialInfo: materialInfo,
        changes: [],
        previousValues: {},
        error: null
    };

    try {
        // Spracuj každý argument
        Object.keys(arguments).forEach(function(argName) {
            var argValue = arguments[argName];
            var fieldResult = applyFieldSetting(material, argName, argValue);

            if (fieldResult.wasChanged) {
                result.changes.push(fieldResult.changeDescription);
                result.previousValues[argName] = fieldResult.previousValue;
            }
        });

        return result;

    } catch (error) {
        result.error = error.toString();
        return result;
    }
}

function applyFieldSetting(material, argumentName, argumentValue) {
    var fieldMapping = {
        "Prepočet ceny": config.fields.items.priceCalculation,
        "Obchodná prirážka": config.fields.items.markupPercentage,
        "Zaokrúhľovanie cien": config.fields.items.priceRounding,
        "Hodnota zaokrúhenia": config.fields.items.roundingValue,
        "Zmena nákupnej ceny": config.fields.items.purchasePriceChange,
        "Percento zmeny": config.fields.items.changePercentage
    };

    var fieldName = fieldMapping[argumentName];
    if (!fieldName) {
        throw new Error(`Neznámy argument: ${argumentName}`);
    }

    var currentValue = core.safeFieldAccess(material, fieldName, "");
    var hasChanged = false;

    // Porovnaj hodnoty podľa typu
    if (typeof argumentValue === "number") {
        var currentNum = parseFloat(currentValue) || 0;
        hasChanged = Math.abs(currentNum - argumentValue) > 0.01;
    } else {
        hasChanged = currentValue !== argumentValue;
    }

    if (hasChanged) {
        core.safeSet(material, fieldName, argumentValue);

        return {
            wasChanged: true,
            previousValue: currentValue,
            newValue: argumentValue,
            changeDescription: `${argumentName}: '${currentValue}' → '${argumentValue}'`
        };
    }

    return {
        wasChanged: false,
        previousValue: currentValue,
        newValue: argumentValue,
        changeDescription: null
    };
}

function updateMaterialWithResults(material, materialResult, arguments) {
    try {
        // Pridaj ikonu nastavení
        if (BulkSettingsData.settings.addSettingsIcon) {
            addMaterialSettingsIcon(material);
        }

        // Vytvor detailný info záznam s novými addInfo funkciami
        if (BulkSettingsData.settings.createDetailedLogs) {
            createMaterialInfoRecord(material, materialResult, arguments);
        }

    } catch (error) {
        utils.addError(material, `Chyba aktualizácie materiálu: ${error.message}`, "updateMaterialWithResults");
    }
}

function addMaterialSettingsIcon(material) {
    try {
        var iconsField = config.fields.items.icons || "icons";
        var currentIcons = core.safeFieldAccess(material, iconsField, "");
        var settingsIcon = config.icons.settings;

        if (!currentIcons.includes(settingsIcon)) {
            var updatedIcons = currentIcons ? `${currentIcons} ${settingsIcon}` : settingsIcon;
            core.safeSet(material, iconsField, updatedIcons);
        }
    } catch (error) {
        utils.addError(material, `Chyba pridania ikony: ${error.message}`, "addMaterialSettingsIcon");
    }
}

function createMaterialInfoRecord(material, materialResult, arguments) {
    try {
        // Použiť novú addInfo funkciu s štandardizovaným formátovaním
        core.addInfo(material, "Bulk nastavenie polí dokončené", {
            materiál: materialResult.materialInfo.name,
            nastavenéHodnoty: arguments,
            vykonanéZmeny: materialResult.changes,
            pôvodnéHodnoty: materialResult.previousValues
        }, {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "BulkSettings",
            sectionName: "Výsledok nastavenia",
            includeHeader: true,
            includeFooter: false
        });

    } catch (error) {
        utils.addError(material, `Chyba vytvorenia info záznamu: ${error.message}`, "createMaterialInfoRecord");
    }
}

function showOperationResults(summary) {
    try {
        var results = summary.results;
        var isSuccess = results.errorMaterials === 0;

        var message = isSuccess ? "✅ BULK OPERÁCIA ÚSPEŠNÁ" : "⚠️ BULK OPERÁCIA S CHYBAMI";
        message += `\n\n📦 Celkom materiálov: ${results.totalMaterials}`;
        message += `\n✅ Aktualizované: ${results.updatedMaterials}`;
        message += `\n➖ Preskočené: ${results.skippedMaterials}`;

        if (results.errorMaterials > 0) {
            message += `\n❌ Chyby: ${results.errorMaterials}`;
        }

        if (results.updatedMaterials > 0) {
            message += `\n\nℹ️ Detaily v info poli každého aktualizovaného materiálu`;
        }

        if (isSuccess) {
            utils.showSuccessDialog(message);
        } else {
            utils.showErrorDialog(message);
        }

    } catch (error) {
        utils.addError(entry(), `Chyba zobrazenia výsledkov: ${error.message}`, "showOperationResults");
        utils.showErrorDialog("Chyba zobrazenia výsledkov!\n\n" + error.toString());
    }
}

function validateEnvironment() {
    // Kontrola dostupnosti modulov
    if (!utils || !config || !core || !business) {
        throw new Error("Memento moduly nie sú dostupné");
    }

    // Kontrola knižnice materiálov
    if (!lib(SCRIPT_CONFIG.libraries.primary)) {
        throw new Error(`Knižnica ${SCRIPT_CONFIG.libraries.primary} nie je dostupná`);
    }

    // Kontrola selectedEntries funkcie
    if (typeof selectedEntries !== 'function') {
        throw new Error("Funkcia selectedEntries() nie je dostupná");
    }

    utils.addDebug(entry(), "Validácia prostredia úspešná", {
        modul: "BulkSettings",
        knižnica: SCRIPT_CONFIG.libraries.primary
    });
}

// ===== SPUSTENIE =====
main();