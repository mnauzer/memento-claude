# 📚 MEMENTO JAVASCRIPT LIBRARIES - KOMPLETNÁ DOKUMENTÁCIA

## 🏗️ ARCHITEKTÚRA SYSTÉMU

### Hierarchia knižníc
```
MementoUtils (3.3) - Hlavný agregátor
├── MementoCore (1.0) - Základné funkcie [POVINNÉ]
├── MementoAI (1.0) - AI integrácia [OPTIONAL]
├── MementoTelegram (1.0) - Telegram API [OPTIONAL]
└── MementoBusiness (1.0) - Business logika [OPTIONAL]

MementoConfig (1.1) - Centralizovaná konfigurácia
└── MementoConfigAdapter (1.0) - Spätná kompatibilita

Notifications Helper (2.0) - Správa notifikácií
└── Notifications Telegram (1.0) - Telegram špecifiká

ModuleLoader Helper (1.0) - Jednotné načítanie modulov
```

---

## 📦 **1. MementoUtils (v3.3)**
**Účel**: Hlavný agregátor všetkých modulov, single point of access
**Závislosti**: MementoCore (povinné), MementoAI, MementoTelegram, MementoBusiness (voliteľné)

### Hlavné funkcie:
```javascript
// === CORE FUNKCIE (vždy dostupné) ===

// Logging
MementoUtils.addDebug(entry, message)
MementoUtils.addError(entry, message, source, error)
MementoUtils.addInfo(entry, message, data)
MementoUtils.clearLogs(entry, clearError)

// Safe field access
MementoUtils.safeGet(entry, fieldName, defaultValue)
MementoUtils.safeSet(entry, fieldName, value)
MementoUtils.safeGetAttribute(entry, fieldName, attrName, defaultValue)
MementoUtils.safeSetAttribute(entry, fieldName, attrName, value)
MementoUtils.safeGetLinks(entry, fieldName)

// Time & formatting
MementoUtils.formatDate(date, format)
MementoUtils.formatTime(time)
MementoUtils.formatMoney(amount)
MementoUtils.parseTimeToMinutes(timeString)
MementoUtils.roundToQuarter(time, direction)

// Validation
MementoUtils.validateRequiredFields(entry, fields)

// Utilities
MementoUtils.findEntryById(libraryName, id)
MementoUtils.getSettings(libraryName, fieldName)

// === AI FUNKCIE (ak je modul dostupný) ===
MementoUtils.AI_PROVIDERS
MementoUtils.getApiKey(provider)
MementoUtils.httpRequest(method, url, data, headers)
MementoUtils.callAI(provider, prompt, options)
MementoUtils.analyzeImage(imageUrl, prompt, options)

// === TELEGRAM FUNKCIE (ak je modul dostupný) ===
MementoUtils.sendTelegramMessage(chatId, text, options)
MementoUtils.deleteTelegramMessage(chatId, messageId)
MementoUtils.editTelegramMessage(chatId, messageId, newText)
MementoUtils.createNotificationEntry(type, data)
MementoUtils.getTelegramGroup(groupId)

// === BUSINESS FUNKCIE (ak je modul dostupný) ===
MementoUtils.calculateWorkHours(start, end)
MementoUtils.isWeekend(date)
MementoUtils.isHoliday(date)
MementoUtils.formatEmployeeName(employee)
MementoUtils.getEmployeeDetails(employee, date)
MementoUtils.findEmployeeByNick(nick)
MementoUtils.calculateDailyWage(employee, hours)

// === HELPER FUNKCIE ===
MementoUtils.getLoadedModules()
MementoUtils.checkDependencies()
```

### Properties:
```javascript
MementoUtils.version // "3.3"
MementoUtils.moduleVersions // {core: "1.0", ai: "1.0", ...}
MementoUtils.DEFAULT_CONFIG // Backward compatibility config
```

---

## 🎯 **2. MementoCore (v1.0)**
**Účel**: Základné funkcie používané všetkými modulmi
**Závislosti**: Žiadne

### Konfigurácia:
```javascript
config = {
    version: "1.0",
    debug: true,
    includeLineNumbers: true,
    includeStackTrace: false,
    debugFieldName: "Debug_Log",
    errorFieldName: "Error_Log",
    infoFieldName: "info",
    dateFormat: "DD.MM.YY HH:mm",
    dateOnlyFormat: "DD.MM.YYYY",
    timeFormat: "HH:mm",
    quarterRoundingMinutes: 15
}
```

### API:
```javascript
// Logging funkcie
addDebug(entry, message)
addError(entry, message, source, error)
addInfo(entry, message, data)
clearLogs(entry, clearError)
saveLogs(entry) // Placeholder

// Safe field operations
safeGet(entry, fieldName, defaultValue)
safeSet(entry, fieldName, value)
safeFieldAccess(entry, fieldName, defaultValue) // Alias pre safeGet
safeGetAttribute(entry, fieldName, attrName, defaultValue)
safeSetAttribute(entry, fieldName, attrName, value)
safeGetLinks(entry, fieldName)

// Time & formatting
formatDate(date, format)
formatTime(time)
formatMoney(amount)
parseTimeToMinutes(timeString)
roundToQuarter(time, direction)

// Validation
validateRequiredFields(entry, fields)

// Utilities
findEntryById(libraryName, id)
getSettings(libraryName, fieldName)
```

---

## 🤖 **3. MementoAI (v1.0)**
**Účel**: AI integrácia (OpenAI, Perplexity, OpenRouter)
**Závislosti**: MementoCore

### AI Providers:
```javascript
AI_PROVIDERS = {
    OpenAi: {
        name: "OpenAI",
        baseUrl: "https://api.openai.com/v1/chat/completions",
        defaultModel: "gpt-4o-mini"
    },
    Perplexity: {
        name: "Perplexity",
        baseUrl: "https://api.perplexity.ai/chat/completions",
        defaultModel: "llama-3.1-sonar-small-128k-online"
    },
    OpenRouter: {
        name: "OpenRouter",
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        defaultModel: "meta-llama/llama-3.2-3b-instruct:free"
    }
}
```

### API:
```javascript
// API Key management
getApiKey(provider)
clearApiKeyCache()

// HTTP requests
httpRequest(method, url, data, headers, options)

// AI calls
callAI(provider, prompt, options)
// options: {
//     apiKey, model, systemPrompt, temperature,
//     maxTokens, stream, responseFormat
// }

// Image analysis
analyzeImage(imageUrl, prompt, options)

// N8N integration (v priprave)
// triggerN8NWorkflow(webhookUrl, notificationData, options)
```

---

## 📱 **4. MementoTelegram (v1.0)**
**Účel**: Telegram API integrácia a správa notifikácií
**Závislosti**: MementoCore, MementoAI

### Konfigurácia:
```javascript
config = {
    version: "1.0",
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "Notifications",
    telegramGroupsLibrary: "Telegram Groups",
    telegramBotTokenField: "Telegram Bot Token",
    telegramBaseUrl: "https://api.telegram.org/bot",
    maxRetries: 3,
    retryDelay: 5000
}
```

### API:
```javascript
// Telegram messaging
sendTelegramMessage(chatId, text, options)
// options: { parseMode, threadId, replyMarkup }

deleteTelegramMessage(chatId, messageId)
editTelegramMessage(chatId, messageId, newText, options)

// Notification management
createNotificationEntry(type, data)
manageNotifications(action, params)
processNotificationQueue()

// Groups
getTelegramGroup(groupId)
// returns: { chatId, name, isThread, threadId, threadName }
```

---

## 💼 **5. MementoBusiness (v1.0)**
**Účel**: Business logika pre dochádzku, mzdy, zákazky
**Závislosti**: MementoCore

### Konfigurácia:
```javascript
CONFIG = {
    defaultWorkHoursPerDay: 8,
    overtimeThreshold: 8,
    weekendMultiplier: 1.5,
    holidayMultiplier: 2.0,
    
    // Knižnice
    employeesLibrary: "Zamestnanci",
    attendanceLibrary: "Dochádzka",
    workRecordsLibrary: "Záznam prác",
    // ... atď
}
```

### API:
```javascript
// Time calculations
calculateWorkHours(startTime, endTime)
// returns: { hours, minutes, totalMinutes, overtime, error }

isWeekend(date)
isHoliday(date)
getWorkDayMultiplier(date)

// Employee functions
formatEmployeeName(employee)
getEmployeeDetails(employee, date)
findEmployeeByNick(nick)
validateEmployee(employee)

// Wage calculations
calculateDailyWage(employee, hours, date)
calculateOvertimePay(hours, hourlyRate)

// Attendance
generateAttendanceSummary(entries, dateFrom, dateTo)
processAttendanceEntry(entry)
```

---

## ⚙️ **6. MementoConfig (v1.1)**
**Účel**: Centralizovaná konfigurácia pre všetky moduly
**Závislosti**: Žiadne

### Štruktúra:
```javascript
// SYSTEM CONFIG
SYSTEM = {
    version: "1.1",
    environment: "production",
    debugMode: true,
    language: "sk"
}

// LIBRARY NAMES
LIBRARIES = {
    core: {
        defaults: "ASISTANTO Defaults",
        api: "ASISTANTO API",
        settings: "ASISTANTO Settings",
        notifications: "Notifications"
    },
    business: {
        employees: "Zamestnanci",
        attendance: "Dochádzka",
        workRecords: "Záznam práce",
        obligations: "Záväzky",
        rates: "sadzby zamestnancov"
    },
    telegram: {
        groups: "Telegram Groups",
        threads: "Telegram Threads"
    }
}

// FIELD MAPPINGS
FIELD_MAPPINGS = {
    attendance: {
        datum: "Dátum",
        prichod: "Príchod",
        odchod: "Odchod",
        zamestnanci: "Zamestnanci",
        // ... kompletný zoznam
    },
    attendanceAttributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        dennaMzda: "denná mzda",
        // ...
    },
    employees: { /* ... */ },
    employeeRates: { /* ... */ },
    obligations: { /* ... */ },
    notifications: { /* ... */ },
    defaults: { /* ... */ }
}

// FORMATS
FORMATS = {
    datetime: { default: "DD.MM.YYYY HH:mm" },
    date: { default: "DD.MM.YYYY" },
    time: { default: "HH:mm" },
    money: { currency: "EUR", symbol: "€" }
}
```

### API:
```javascript
MementoConfig.init()
MementoConfig.getConfig(moduleName)
MementoConfig.getLibraries()
MementoConfig.getFieldMappings(entity)
MementoConfig.getAttendanceAttributes()
MementoConfig.getFormats()
MementoConfig.getLibraryName(category, library)
MementoConfig.getFieldName(entity, field)

// Override system
MementoConfig.override(moduleName, config)
MementoConfig.resetOverrides(moduleName)
MementoConfig.saveOverrides()
```

---

## 🔄 **7. MementoConfigAdapter (v1.0)**
**Účel**: Adapter pre spätnú kompatibilitu starých scriptov
**Závislosti**: MementoConfig

### API:
```javascript
// Get adapter pre konkrétny modul
MementoConfigAdapter.getAdapter(moduleName)
// Vracia config objekt kompatibilný so starým formátom

// Direct access
MementoConfigAdapter.getConfig()
MementoConfigAdapter.getLibraryName(category, library)
MementoConfigAdapter.getFieldName(entity, field)
```

### Podporované moduly:
- core / mementocore
- ai / mementoai
- telegram / mementotelegram
- business / mementobusiness
- notifications / notificationshelper
- attendance

---

## 📬 **8. Notifications Helper (v2.0)**
**Účel**: Vysokoúrovňová správa notifikácií
**Závislosti**: MementoUtils, MementoConfig (optional)

### Hlavné funkcie:
```javascript
// Vytvorenie notifikácií
createNotification(data)
createFromTemplate(templateName, data)
createBulkNotifications(recipientsList, baseData)

// Šablóny
createDochadzkaTemplate(entry)
createZaznamPracTemplate(entry)
createTodoTemplate(task)
createSystemTemplate(message, type)

// Formátovanie
formatTelegramMessage(data)
escapeMarkdown(text)

// Lifecycle management
cancelNotificationsBySource(sourceLibrary, sourceId)
processExpiredNotifications(daysOld)
getNotificationStats(dateFrom, dateTo)

// Advanced features
createRepeatedNotification(data, schedule)
cleanupOldNotifications(daysToKeep)

// N8N integrácia
prepareN8NPayload(notificationEntry)
triggerN8NIfConfigured(notificationEntry, options)
```

### Konfigurácia:
```javascript
CONFIG = {
    debug: true,
    version: "2.0",
    scriptName: "Notifications Helper",
    
    libraries: {
        notifications: "Notifications",
        telegramGroups: "Telegram Groups",
        api: "ASISTANTO API",
        defaults: "ASISTANTO Defaults"
    },
    
    validation: {
        required: ['sprava'],
        optional: ['predmet', 'priorita', 'adresat', 'formatovanie'],
        maxRetries: 3,
        timeoutMs: 30000
    },
    
    businessRules: {
        defaultPriority: "Normálna",
        defaultFormatting: "Markdown",
        defaultSource: "Automatická",
        defaultType: "Systémová"
    }
}
```

---

## 🚀 **9. ModuleLoader Helper (v1.0)**
**Účel**: Jednotné načítanie a inicializácia modulov
**Závislosti**: Žiadne (self-contained)

### API:
```javascript
// Inicializácia
ModuleLoader.init()
ModuleLoader.reset() // Pre testing

// Gettery pre moduly
ModuleLoader.getUtils()
ModuleLoader.getConfig(moduleName)
ModuleLoader.getNotifications()
ModuleLoader.getTelegram()
ModuleLoader.getEntry()

// Helper funkcie
ModuleLoader.buildScriptConfig(scriptName, version, fallbackConfig)

// Status
ModuleLoader.getStatus()
// returns: { initialized, hasErrors, hasWarnings, errors[], warnings[] }

ModuleLoader.isReady()
```

### Použitie v scriptoch:
```javascript
// Štandardný začiatok každého scriptu
var loader = ModuleLoader;
loader.init();

var utils = loader.getUtils();
var CONFIG = loader.buildScriptConfig(
    "Názov Scriptu",
    "1.0",
    fallbackConfig // lokálny config ako záloha
);
var currentEntry = loader.getEntry();
```

---

## 🔗 **VZÁJOMNÉ ZÁVISLOSTI**

### Dependency Tree:
```
Scripty (Dochádzka, Zákazky, atď.)
├── ModuleLoader Helper
│   └── MementoUtils
│       ├── MementoCore [REQUIRED]
│       ├── MementoAI [OPTIONAL]
│       │   └── MementoCore
│       ├── MementoTelegram [OPTIONAL]
│       │   ├── MementoCore
│       │   └── MementoAI
│       └── MementoBusiness [OPTIONAL]
│           └── MementoCore
├── MementoConfig
│   └── MementoConfigAdapter
└── Notifications Helper
    └── MementoUtils
```

### Import Order (správne poradie):
1. MementoCore
2. MementoConfig
3. MementoConfigAdapter
4. MementoAI
5. MementoTelegram
6. MementoBusiness
7. MementoUtils
8. ModuleLoader Helper
9. Notifications Helper

---

## ⚠️ **ZNÁME PROBLÉMY A RIEŠENIA**

### 1. **Scripty nevidia knižnice**
- **Problém**: `MementoUtils is not defined`
- **Riešenie**: Knižnice musia byť v JavaScript Libraries a správne pomenované
- **Workaround**: Použiť ModuleLoader Helper s fallback funkciami

### 2. **Duplicitné funkcie**
- **Problém**: Funkcie sú definované viackrát
- **Riešenie**: Vždy používať cez MementoUtils, nie priamo z modulov

### 3. **Config nekonzistencie**
- **Problém**: Rôzne názvy polí v rôznych scriptoch
- **Riešenie**: Používať MementoConfig.getFieldName()

### 4. **setAttr problémy**
- **Problém**: `setAttr` s 3 parametrami nefunguje
- **Správny spôsob**:
```javascript
// Pre atribúty na Link to Entry poli
var zamArray = entry.field("Zamestnanci");
zamArray[index].attr("hodinovka", 25.50);
```

---

## 🎯 **BEST PRACTICES**

### 1. **Vždy používaj ModuleLoader**
```javascript
var loader = ModuleLoader;
loader.init();
var utils = loader.getUtils();
```

### 2. **Centralizovaná konfigurácia**
```javascript
var CONFIG = loader.buildScriptConfig("Script Name", "1.0", fallback);
```

### 3. **Error handling**
```javascript
try {
    // kód
} catch(error) {
    utils.addError(entry, error.toString(), "functionName", error);
}
```

### 4. **Lazy loading**
```javascript
function getUtils() {
    if (!utils && typeof MementoUtils !== 'undefined') {
        utils = MementoUtils;
    }
    return utils;
}
```

### 5. **Null checks**
```javascript
var value = utils.safeGet(entry, "fieldName", defaultValue);
```

---

## 📝 **CHANGELOG**

### Verzie:
- **MementoUtils 3.3**: Agregátor všetkých modulov
- **MementoCore 1.0**: Základné funkcie
- **MementoConfig 1.1**: Rozšírené field mappings pre Dochádzku
- **MementoAI 1.0**: AI integrácia
- **MementoTelegram 1.0**: Telegram API
- **MementoBusiness 1.0**: Business logika
- **ModuleLoader 1.0**: Jednotné načítanie
- **Notifications Helper 2.0**: Vysokoúrovňové notifikácie

---

## 📌 **QUICK REFERENCE**

### Najpoužívanejšie funkcie:
```javascript
// Logging
utils.addDebug(entry, "message");
utils.addError(entry, "error", "source");

// Safe access
utils.safeGet(entry, "field", default);
utils.safeSet(entry, "field", value);

// Formatting
utils.formatDate(date);
utils.formatMoney(amount);

// Config
config = MementoConfig.getFieldMappings("attendance");

// Notifications
notif = ASISTANTONotifications.createNotification(data);
```

---

Táto dokumentácia slúži ako **jediný zdroj pravdy** pre všetky Memento JavaScript knižnice. Pri každej zmene alebo pridaní novej funkcionality by mala byť aktualizovaná.