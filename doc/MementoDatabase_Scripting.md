📘 Komplexný manuál pre JavaScript v Memento Database
📑 Obsah
Úvod do skriptovania v Memento

Typy skriptov

Memento JavaScript API

Práca s poliami a záznamami

Link to Entry operácie

HTTP komunikácia a API volania

SQL operácie

AI integrácia

Debugging a error handling

Best practices

Praktické príklady

Troubleshooting

1. Úvod do skriptovania v Memento
1.1 Základné informácie
Memento Database používa JavaScript 1.7 engine, ktorý podporuje:

✅ Základný JavaScript syntax

✅ Funkcie, objekty, pole

✅ Try-catch error handling

✅ RegExp a string operácie

✅ moment.js knižnicu pre prácu s časom

❌ ES6+ features (let, const, arrow functions, template strings)

❌ Node.js modules (require, fs, path)

❌ Modern Web APIs (fetch, Promise)

1.2 Spôsoby spúšťania skriptov
Automatické spúšťanie:

Trigger scripty - reagujú na udalosti (save, create, delete)

JavaScript polia - počítajú hodnoty automaticky

Manuálne spúšťanie:

Action scripty - tlačidlá v toolbar

Custom Data Source - pre dropdown polia

Widget scripty - pre dashboard komponenty

1.3 Prístup k skriptom
text
Memento Database → Settings → Scripts
2. Typy skriptov
2.1 JavaScript polia
Účel: Automatický výpočet hodnôt na základe iných polí

Kontext: Spúšťa sa pri uložení záznamu alebo zmene závislých polí

Príklad:

javascript
// Pole: "Celková cena"
field('Jednotková cena') * field('Množstvo');
Ďalšie príklady:

javascript
// Formátovanie mena
field('Meno') + ' ' + field('Priezvisko');

// Podmienené hodnoty
field('Vek') >= 18 ? 'Dospelý' : 'Maloletý';

// Výpočet DPH
field('Základ') * 1.20;
2.2 Trigger scripty
Typy triggerov:

Before Save - pred uložením (validácia, úprava dát)

After Save - po uložení (vytvorenie súvisiacich záznamov)

Before Delete - pred zmazaním (kontrola závislostí)

After Delete - po zmazaní (cleanup operácie)

On Open - pri otvorení záznamu (načítanie dát)

Príklad Before Save triggera:

javascript
var e = entry();

// Validácia
if (!e.field('Email') || e.field('Email').indexOf('@') === -1) {
    message('Neplatný email!');
    cancel(); // Zruší uloženie
}

// Automatické nastavenie dátumu
if (!e.field('Dátum vytvorenia')) {
    e.set('Dátum vytvorenia', Date.now());
}
Príklad After Save triggera:

javascript
var e = entry();

// Vytvorenie záznamu v inej knižnici
var logLib = libByName('Audit Log');
logLib.create({
    'Akcia': 'Vytvorený nový zákazník',
    'Dátum': Date.now(),
    'Používateľ': 'System',
    'Detail': 'ID: ' + e.field('ID')
});
2.3 Action scripty
Účel: Manuálne spustiteľné operácie

Príklad mass update:

javascript
var selected = lib().find('selected:true');

if (selected.length === 0) {
    message('Označte záznamy na spracovanie');
    return;
}

for (var i = 0; i < selected.length; i++) {
    selected[i].set('Status', 'Spracované');
    selected[i].set('Dátum spracovania', Date.now());
}

message('Spracovaných: ' + selected.length + ' záznamov');
2.4 Custom Data Source
Účel: Dynamické naplnenie dropdown polí

Príklad:

javascript
var results = [];
var products = libByName('Produkty').entries();

for (var i = 0; i < products.length; i++) {
    var product = products[i];
    if (product.field('Aktívny')) {
        results.push({
            name: product.field('Názov'),
            value: product.field('ID')
        });
    }
}

return results;
3. Memento JavaScript API
3.1 Základné objekty
entry() - Aktuálny záznam
javascript
var e = entry();
var name = e.field('Názov');
e.set('Status', 'Aktívny');
lib() - Aktuálna knižnica
javascript
var currentLib = lib();
var allEntries = currentLib.entries();
var foundEntries = currentLib.find('Status', 'Aktívny');
libByName() - Iná knižnica
javascript
var customersLib = libByName('Zákazníci');
var customers = customersLib.entries();
3.2 Práca so záznamami
Vytvorenie nového záznamu
javascript
var newEntry = lib().create({
    'Názov': 'Nový záznam',
    'Dátum': Date.now(),
    'Status': 'Čaká'
});
Vyhľadávanie záznamov
javascript
// Podľa konkrétnej hodnoty
var active = lib().find('Status', 'Aktívny');

// Podľa výrazu
var recent = lib().find('created > ?', moment().subtract(7, 'days').toDate());

// Označené záznamy
var selected = lib().find('selected:true');
Úprava záznamu
javascript
var e = entry();
e.set('Názov', 'Nový názov');
e.set('Upraveň', Date.now());

// Hromadná úprava
var entries = lib().find('Status', 'Čaká');
for (var i = 0; i < entries.length; i++) {
    entries[i].set('Status', 'Spracováva sa');
}
3.3 Metódy záznamu
javascript
var e = entry();

// Základné operácie
e.field('Názov');           // Získanie hodnoty
e.set('Názov', 'Hodnota');  // Nastavenie hodnoty
e.trash();                  // Zmazanie záznamu
e.copy();                   // Kopírovanie záznamu

// Linky a atribúty
e.linksFrom('Objednávky', 'Zákazník');  // Nájdenie spätných linkov
e.setAttr('Pole', 0, 'atribút', 'hodnota');  // Nastavenie atribútu
4. Práca s poliami a záznamami
4.1 Typy polí v Memento
Text a Number polia
javascript
var text = entry().field('Popis') || 'Default text';
var number = entry().field('Cena') || 0;

// Validácia
if (typeof number !== 'number' || number < 0) {
    message('Neplatná cena!');
    cancel();
}
Date a DateTime polia
javascript
var date = entry().field('Dátum');

// Práca s moment.js
var formattedDate = moment(date).format('DD.MM.YYYY');
var isToday = moment(date).isSame(moment(), 'day');

// Nastavenie dátumu
entry().set('Dátum', moment().toDate());
entry().set('Dátum', Date.now());
Choice polia
javascript
var status = entry().field('Status');

switch (status) {
    case 'Nový':
        entry().set('Farba', 'Zelená');
        break;
    case 'Spracováva sa':
        entry().set('Farba', 'Oranžová');
        break;
    case 'Dokončený':
        entry().set('Farba', 'Modrá');
        break;
}
Photo polia
javascript
var photo = entry().field('Foto');

if (photo && photo.content) {
    // Získanie base64 obsahu
    var base64 = photo.content();
    
    // Kontrola veľkosti
    if (base64.length > 1000000) {
        message('Obrázok je príliš veľký!');
    }
}
4.2 Bezpečný prístup k poliam
Problém: Pole môže neexisťať alebo byť null

Riešenie - Safe access pattern:

javascript
function safeGet(entry, fieldName, defaultValue) {
    try {
        var value = entry.field(fieldName);
        return (value !== null && value !== undefined) ? value : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

// Použitie
var name = safeGet(entry(), 'Názov', 'Bez názvu');
var price = safeGet(entry(), 'Cena', 0);
4.3 Dynamické polia
javascript
// Zoznam všetkých polí
var fields = lib().fields();
for (var i = 0; i < fields.length; i++) {
    var fieldName = fields[i].name;
    var fieldType = fields[i].type;
    message('Pole: ' + fieldName + ' (' + fieldType + ')');
}

// Podmienené spracovanie polí
var requiredFields = ['Názov', 'Email', 'Telefón'];
for (var j = 0; j < requiredFields.length; j++) {
    var fieldName = requiredFields[j];
    var value = entry().field(fieldName);
    
    if (!value || value.trim() === '') {
        message('Pole ' + fieldName + ' je povinné!');
        cancel();
    }
}
5. Link to Entry operácie
5.1 Základy Link to Entry
Single Link:

javascript
var customer = entry().field('Zákazník');
if (customer) {
    var customerName = customer.field('Názov');
    var customerEmail = customer.field('Email');
}
Multi Link:

javascript
var products = entry().field('Produkty');
var totalPrice = 0;

for (var i = 0; i < products.length; i++) {
    var product = products[i];
    var price = product.field('Cena') || 0;
    totalPrice += price;
}

entry().set('Celková cena', totalPrice);
5.2 Atribúty v Link to Entry
Nastavenie atribútu:

javascript
// Syntax: entry.setAttr(fieldName, index, attributeName, value)
entry().setAttr('Produkty', 0, 'Množstvo', 5);
entry().setAttr('Produkty', 0, 'Zľava', 0.1);
Čítanie atribútu:

javascript
var products = entry().field('Produkty');
if (products && products.length > 0) {
    var quantity = products[0].attr('Množstvo') || 1;
    var discount = products[0].attr('Zľava') || 0;
    
    var price = products[0].field('Cena');
    var finalPrice = price * quantity * (1 - discount);
}
5.3 LinksFrom operácie
Hľadanie spätných linkov:

javascript
var customer = entry(); // Aktuálny zákazník

// Nájdi všetky objednávky tohto zákazníka
var orders = customer.linksFrom('Objednávky', 'Zákazník');

var totalOrders = orders.length;
var totalValue = 0;

for (var i = 0; i < orders.length; i++) {
    var orderValue = orders[i].field('Celková cena') || 0;
    totalValue += orderValue;
}

entry().set('Počet objednávok', totalOrders);
entry().set('Celková hodnota', totalValue);
5.4 Rozšírené Link operácie
javascript
// Pridanie nového linku
var newProduct = libByName('Produkty').create({
    'Názov': 'Nový produkt',
    'Cena': 100
});

var currentProducts = entry().field('Produkty') || [];
currentProducts.push(newProduct);
entry().set('Produkty', currentProducts);

// Odstránenie linku
var products = entry().field('Produkty');
var filteredProducts = [];

for (var i = 0; i < products.length; i++) {
    if (products[i].field('Aktívny')) {
        filteredProducts.push(products[i]);
    }
}

entry().set('Produkty', filteredProducts);
6. HTTP komunikácia a API volania
6.1 Základné HTTP operácie
GET request
javascript
var httpObj = http();
var response = httpObj.get('https://api.example.com/data');

if (response.code === 200) {
    var data = JSON.parse(response.body);
    message('Získané dáta: ' + data.length + ' položiek');
} else {
    message('Chyba: ' + response.code);
}
POST request
javascript
var httpObj = http();
httpObj.header('Content-Type', 'application/json');
httpObj.header('Authorization', 'Bearer ' + apiKey);

var requestData = {
    name: entry().field('Názov'),
    email: entry().field('Email')
};

var response = httpObj.post(
    'https://api.example.com/users',
    JSON.stringify(requestData)
);

if (response.code === 201) {
    var result = JSON.parse(response.body);
    entry().set('External ID', result.id);
    message('Úspešne vytvorené');
} else {
    message('Chyba pri vytváraní: ' + response.body);
}
6.2 API integrácie
REST API wrapper
javascript
function callAPI(method, endpoint, data, headers) {
    var httpObj = http();
    
    // Nastavenie headerov
    httpObj.header('Content-Type', 'application/json');
    if (headers) {
        for (var key in headers) {
            httpObj.header(key, headers[key]);
        }
    }
    
    var response;
    switch (method.toLowerCase()) {
        case 'get':
            response = httpObj.get(endpoint);
            break;
        case 'post':
            response = httpObj.post(endpoint, JSON.stringify(data));
            break;
        case 'put':
            response = httpObj.put(endpoint, JSON.stringify(data));
            break;
        case 'delete':
            response = httpObj.delete(endpoint);
            break;
        default:
            return {success: false, error: 'Unsupported method'};
    }
    
    return {
        success: response.code >= 200 && response.code < 300,
        code: response.code,
        data: response.body ? JSON.parse(response.body) : null,
        raw: response.body
    };
}

// Použitie
var result = callAPI('GET', 'https://api.example.com/users/123', null, {
    'Authorization': 'Bearer ' + apiToken
});

if (result.success) {
    entry().set('Externé dáta', JSON.stringify(result.data));
} else {
    message('API volanie zlyhalo: ' + result.code);
}
6.3 Error handling pre HTTP
javascript
function safeHttpCall(url, options) {
    try {
        var httpObj = http();
        
        // Timeout nastavenie (ak podporované)
        if (options && options.timeout) {
            httpObj.timeout(options.timeout);
        }
        
        var response = httpObj.get(url);
        
        if (response.code === 0) {
            return {success: false, error: 'Network timeout or connection failed'};
        }
        
        if (response.code >= 400) {
            return {success: false, error: 'HTTP ' + response.code + ': ' + response.body};
        }
        
        return {
            success: true,
            data: response.body ? JSON.parse(response.body) : null,
            code: response.code
        };
        
    } catch (e) {
        return {success: false, error: 'HTTP call failed: ' + e.toString()};
    }
}
7. SQL operácie
7.1 Základné SQL dotazy
SELECT operácie
javascript
// Jednoduchý SELECT
var results = sql('SELECT * FROM Zákazníci WHERE Aktívny = 1').asObjects();

for (var i = 0; i < results.length; i++) {
    message('Zákazník: ' + results[i].Názov);
}

// Agregácie
var totalOrders = sql('SELECT COUNT(*) FROM Objednávky').asScalar();
var avgPrice = sql('SELECT AVG(Cena) FROM Produkty WHERE Aktívny = 1').asScalar();

entry().set('Celkový počet objednávok', totalOrders);
entry().set('Priemerná cena', avgPrice);
Parametrizované dotazy
javascript
var customerId = entry().field('ID');
var orders = sql(
    'SELECT * FROM Objednávky WHERE Zákazník_ID = ? ORDER BY Dátum DESC', 
    [customerId]
).asObjects();

// Komplexnejší dotaz
var startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
var monthlyStats = sql(
    'SELECT COUNT(*) as Počet, SUM(Cena) as Suma FROM Objednávky WHERE Dátum >= ? AND Zákazník_ID = ?',
    [startDate, customerId]
).asObjects();

if (monthlyStats.length > 0) {
    entry().set('Objednávky za mesiac', monthlyStats[0].Počet);
    entry().set('Hodnota za mesiac', monthlyStats[0].Suma);
}
7.2 Pokročilé SQL operácie
Grouping a agregácie
javascript
var salesByMonth = sql(`
    SELECT 
        strftime('%Y-%m', Dátum) as Mesiac,
        COUNT(*) as Počet,
        SUM(Celková_cena) as Tržby
    FROM Objednávky 
    WHERE Dátum >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', Dátum)
    ORDER BY Mesiac
`).asObjects();

var report = '';
for (var i = 0; i < salesByMonth.length; i++) {
    var month = salesByMonth[i];
    report += month.Mesiac + ': ' + month.Počet + ' objednávok, ' + 
              month.Tržby + ' €\n';
}

entry().set('Mesačný report', report);
JOINy medzi knižnicami
javascript
var customerOrders = sql(`
    SELECT 
        z.Názov as Zákazník,
        COUNT(o.ID) as Počet_objednávok,
        SUM(o.Celková_cena) as Celková_hodnota
    FROM Zákazníci z
    LEFT JOIN Objednávky o ON z.ID = o.Zákazník_ID
    WHERE z.Aktívny = 1
    GROUP BY z.ID, z.Názov
    HAVING COUNT(o.ID) > 0
    ORDER BY Celková_hodnota DESC
    LIMIT 10
`).asObjects();
7.3 SQL utility funkcie
javascript
function safeSql(query, params, returnType) {
    try {
        var sqlObj = sql(query, params || []);
        
        switch (returnType) {
            case 'objects':
                return sqlObj.asObjects();
            case 'arrays':
                return sqlObj.asArrays();
            case 'scalar':
                return sqlObj.asScalar();
            case 'count':
                return sqlObj.count();
            default:
                return sqlObj.asObjects();
        }
    } catch (e) {
        message('SQL Error: ' + e.toString());
        return returnType === 'scalar' ? 0 : [];
    }
}

// Použitie
var activeCustomers = safeSql(
    'SELECT COUNT(*) FROM Zákazníci WHERE Aktívny = ?', 
    [1], 
    'scalar'
);
8. AI integrácia
8.1 Základné AI volania
OpenAI API
javascript
function callOpenAI(prompt, apiKey) {
    var httpObj = http();
    httpObj.header('Content-Type', 'application/json');
    httpObj.header('Authorization', 'Bearer ' + apiKey);
    
    var requestBody = {
        model: 'gpt-4o-mini',
        messages: [{
            role: 'user',
            content: prompt
        }],
        max_tokens: 1000,
        temperature: 0.7
    };
    
    var response = httpObj.post(
        'https://api.openai.com/v1/chat/completions',
        JSON.stringify(requestBody)
    );
    
    if (response.code === 200) {
        var data = JSON.parse(response.body);
        return {
            success: true,
            response: data.choices[0].message.content
        };
    } else {
        return {
            success: false,
            error: 'API Error: ' + response.code + ' - ' + response.body
        };
    }
}

// Použitie
var apiKey = libByName('API Keys').find('Provider', 'OpenAI')[0].field('Key');
var prompt = 'Zhrň tento text: ' + entry().field('Popis');

var result = callOpenAI(prompt, apiKey);
if (result.success) {
    entry().set('AI Zhrnutie', result.response);
} else {
    message('AI volanie zlyhalo: ' + result.error);
}
8.2 AI analýza dokumentov
javascript
function analyzeInvoice(imageBase64, apiKey) {
    var prompt = `Analyzuj túto faktúru a extrahuj z nej nasledujúce údaje v JSON formáte:
{
  "dodavatel": "názov firmy",
  "ico": "IČO",
  "cislo_faktury": "číslo faktúry",
  "datum_splatnosti": "YYYY-MM-DD",
  "suma_s_dph": 0.00,
  "polozky": ["položka 1", "položka 2"]
}`;
    
    var httpObj = http();
    httpObj.header('Content-Type', 'application/json');
    httpObj.header('Authorization', 'Bearer ' + apiKey);
    
    var requestBody = {
        model: 'gpt-4o',
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: prompt
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: 'data:image/jpeg;base64,' + imageBase64
                    }
                }
            ]
        }],
        max_tokens: 2000
    };
    
    var response = httpObj.post(
        'https://api.openai.com/v1/chat/completions',
        JSON.stringify(requestBody)
    );
    
    if (response.code === 200) {
        var data = JSON.parse(response.body);
        var aiResponse = data.choices[0].message.content;
        
        try {
            var invoiceData = JSON.parse(aiResponse);
            return {success: true, data: invoiceData};
        } catch (e) {
            return {success: false, error: 'Failed to parse AI response as JSON'};
        }
    } else {
        return {success: false, error: 'API Error: ' + response.body};
    }
}

// Použitie v trigger scripte
var photo = entry().field('Foto faktúry');
if (photo && photo.content) {
    var base64 = photo.content();
    var apiKey = libByName('API Keys').find('Provider', 'OpenAI')[0].field('Key');
    
    var result = analyzeInvoice(base64, apiKey);
    if (result.success) {
        var data = result.data;
        
        entry().set('Dodávateľ', data.dodavatel);
        entry().set('IČO', data.ico);
        entry().set('Číslo faktúry', data.cislo_faktury);
        entry().set('Dátum splatnosti', data.datum_splatnosti);
        entry().set('Suma s DPH', data.suma_s_dph);
        entry().set('AI spracované', 'Áno');
        
        message('Faktúra automaticky spracovaná pomocou AI');
    } else {
        message('AI spracovanie zlyhalo: ' + result.error);
    }
}
8.3 Natural Language to SQL
javascript
function generateSQL(naturalQuery, availableTables, apiKey) {
    var prompt = `Vygeneruj SQL dotaz na základe tohto požiadavku: "${naturalQuery}"

Dostupné tabuľky: ${availableTables.join(', ')}

Pravidlá:
- Vráť iba SQL dotaz bez dodatočného textu
- Používaj SQLite syntax
- Pre slovenčinu používaj COLLATE NOCASE

SQL dotaz:`;
    
    var result = callOpenAI(prompt, apiKey);
    if (result.success) {
        // Vyčisti odpoveď od markdown formátovania
        var sqlQuery = result.response
            .replace(/```
            .replace(/```/g, '')
            .trim();
            
        return {success: true, query: sqlQuery};
    } else {
        return result;
    }
}

// Použitie
var naturalQuery = 'Koľko objednávok má každý zákazník za posledný mesiac?';
var tables = ['Zákazníci', 'Objednávky'];
var apiKey = libByName('API Keys').find('Provider', 'OpenAI')[0].field('Key');

var sqlResult = generateSQL(naturalQuery, tables, apiKey);
if (sqlResult.success) {
    try {
        var data = sql(sqlResult.query).asObjects();
        
        var report = 'Automaticky vygenerovaný report:\n\n';
        for (var i = 0; i < data.length; i++) {
            report += JSON.stringify(data[i]) + '\n';
        }
        
        entry().set('AI Report', report);
        entry().set('SQL Query', sqlResult.query);
    } catch (e) {
        message('Chyba pri vykonávaní SQL: ' + e.toString());
    }
} else {
    message('Generovanie SQL zlyhalo: ' + sqlResult.error);
}
9. Debugging a error handling
9.1 Základné debugging techniky
Console logging do polí
javascript
function addDebug(entry, message) {
    var timestamp = moment().format('HH:mm:ss');
    var debugMessage = '[' + timestamp + '] ' + message;
    
    var existingDebug = entry.field('Debug_Log') || '';
    entry.set('Debug_Log', existingDebug + debugMessage + '\n');
}

// Použitie
addDebug(entry(), 'Script started');
addDebug(entry(), 'Processing customer: ' + entry().field('Názov'));

try {
    // Riskantný kód
    var result = doSomethingRisky();
    addDebug(entry(), 'Operation successful: ' + result);
} catch (e) {
    addDebug(entry(), 'Error occurred: ' + e.toString());
}
Try-catch patterns
javascript
function safeOperation(operation, defaultValue) {
    try {
        return operation();
    } catch (e) {
        addDebug(entry(), 'Safe operation failed: ' + e.toString());
        return defaultValue;
    }
}

// Použitie
var customerName = safeOperation(function() {
    return entry().field('Zákazník').field('Názov');
}, 'Neznámy zákazník');

var totalPrice = safeOperation(function() {
    var products = entry().field('Produkty');
    var total = 0;
    for (var i = 0; i < products.length; i++) {
        total += products[i].field('Cena');
    }
    return total;
}, 0);
9.2 Error reporting systém
javascript
function addError(entry, errorMessage, context) {
    var timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    var errorLog = '[' + timestamp + '] ERROR';
    
    if (context) {
        errorLog += ' (' + context + ')';
    }
    
    errorLog += ': ' + errorMessage;
    
    var existingErrors = entry.field('Error_Log') || '';
    entry.set('Error_Log', existingErrors + errorLog + '\n');
    
    // Voliteľne aj do message
    message('Chyba: ' + errorMessage);
}

function addInfo(entry, infoMessage, details) {
    var timestamp = moment().format('DD.MM.YY HH:mm');
    var infoLog = '📋 [' + timestamp + '] ' + infoMessage;
    
    if (details) {
        if (details.sourceId) infoLog += '\n   • Zdroj: #' + details.sourceId;
        if (details.method) infoLog += '\n   • Metóda: ' + details.method;
        if (details.result) infoLog += '\n   • Výsledok: ' + details.result;
    }
    
    var existingInfo = entry.field('Info_Log') || '';
    entry.set('Info_Log', existingInfo + infoLog + '\n');
}

// Použitie v komplexnom scripte
try {
    addInfo(entry(), 'Spúšťam spracovanie objednávky', {
        method: 'processOrder',
        sourceId: entry().field('ID')
    });
    
    var customer = entry().field('Zákazník');
    if (!customer) {
        addError(entry(), 'Chýba zákazník v objednávke', 'processOrder');
        cancel();
    }
    
    var products = entry().field('Produkty');
    if (!products || products.length === 0) {
        addError(entry(), 'Objednávka nemá žiadne produkty', 'processOrder');
        cancel();
    }
    
    // Spracovanie...
    addInfo(entry(), 'Objednávka úspešne spracovaná', {
        result: products.length + ' produktov spracovaných'
    });
    
} catch (e) {
    addError(entry(), 'Kritická chyba: ' + e.toString(), 'processOrder');
}
9.3 Performance monitoring
javascript
function measureTime(operation, label) {
    var startTime = Date.now();
    
    try {
        var result = operation();
        var endTime = Date.now();
        var duration = endTime - startTime;
        
        addDebug(entry(), label + ' dokončené za ' + duration + 'ms');
        return result;
    } catch (e) {
        var endTime = Date.now();
        var duration = endTime - startTime;
        
        addError(entry(), label + ' zlyhalo po ' + duration + 'ms: ' + e.toString());
        throw e;
    }
}

// Použitie
var orders = measureTime(function() {
    return sql('SELECT * FROM Objednávky WHERE Zákazník_ID = ' + entry().field('ID')).asObjects();
}, 'Načítanie objednávok');

var apiResult = measureTime(function() {
    return callAPI('GET', 'https://api.example.com/data');
}, 'API volanie');
10. Best practices
10.1 Kódová štruktúra
Modulárny prístup
javascript
// Shared Script - utility functions
var Utils = {
    formatMoney: function(amount, currency) {
        currency = currency || '€';
        if (typeof amount !== 'number') return '0.00 ' + currency;
        return amount.toFixed(2) + ' ' + currency;
    },
    
    safeGet: function(entry, fieldName, defaultValue) {
        try {
            var value = entry.field(fieldName);
            return (value !== null && value !== undefined) ? value : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    
    validateEmail: function(email) {
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};

// V trigger scripte
eval(sharedScript('Utils'));

var email = Utils.safeGet(entry(), 'Email', '');
if (email && !Utils.validateEmail(email)) {
    message('Neplatný email formát');
    cancel();
}

var price = Utils.safeGet(entry(), 'Cena', 0);
entry().set('Formátovaná cena', Utils.formatMoney(price));
Konfiguračné konštanty
javascript
var CONFIG = {
    DEFAULT_CURRENCY: '€',
    MAX_RETRY_COUNT: 3,
    API_TIMEOUT: 30000,
    DEBUG_MODE: true,
    
    FIELD_NAMES: {
        DEBUG_LOG: 'Debug_Log',
        ERROR_LOG: 'Error_Log',
        CUSTOMER: 'Zákazník',
        TOTAL_PRICE: 'Celková cena'
    },
    
    VALIDATION: {
        MIN_PRICE: 0,
        MAX_PRICE: 999999,
        REQUIRED_FIELDS: ['Názov', 'Cena']
    }
};
10.2 Performance optimalizácie
Caching mechanizmy
javascript
var cache = {};

function getCachedLibrary(libraryName) {
    if (!cache[libraryName]) {
        cache[libraryName] = libByName(libraryName);
    }
    return cache[libraryName];
}

function getCachedApiKey(provider) {
    var cacheKey = 'apikey_' + provider;
    if (!cache[cacheKey]) {
        var apiLib = getCachedLibrary('API Keys');
        var keys = apiLib.find('Provider', provider);
        cache[cacheKey] = keys.length > 0 ? keys[0].field('Key') : null;
    }
    return cache[cacheKey];
}
Batch operácie
javascript
function processBatch(items, processor, batchSize) {
    batchSize = batchSize || 50;
    var results = {success: 0, failed: 0, errors: []};
    
    for (var i = 0; i < items.length; i += batchSize) {
        var batch = items.slice(i, i + batchSize);
        
        for (var j = 0; j < batch.length; j++) {
            try {
                processor(batch[j]);
                results.success++;
            } catch (e) {
                results.failed++;
                results.errors.push({
                    index: i + j,
                    error: e.toString()
                });
            }
        }
        
        // Pause medzi batch-mi pre performance
        if (i + batchSize < items.length) {
            // Memento nemá setTimeout, ale môžeme simulovať pause
            var pauseStart = Date.now();
            while (Date.now() - pauseStart < 100) {
                // 100ms pause
            }
        }
    }
    
    return results;
}
10.3 Bezpečnostné pravidlá
Input validácia
javascript
function validateInput(entry, rules) {
    var errors = [];
    
    for (var fieldName in rules) {
        var rule = rules[fieldName];
        var value = entry.field(fieldName);
        
        if (rule.required && (!value || value.toString().trim() === '')) {
            errors.push(fieldName + ' je povinné pole');
            continue;
        }
        
        if (value) {
            if (rule.type === 'email' && !Utils.validateEmail(value)) {
                errors.push(fieldName + ' má neplatný email formát');
            }
            
            if (rule.type === 'number' && isNaN(parseFloat(value))) {
                errors.push(fieldName + ' musí byť číslo');
            }
            
            if (rule.minLength && value.toString().length < rule.minLength) {
                errors.push(fieldName + ' musí mať minimálne ' + rule.minLength + ' znakov');
            }
            
            if (rule.maxLength && value.toString().length > rule.maxLength) {
                errors.push(fieldName + ' môže mať maximálne ' + rule.maxLength + ' znakov');
            }
        }
    }
    
    return errors;
}

// Použitie
var validationRules = {
    'Názov': {required: true, minLength: 2, maxLength: 100},
    'Email': {required: true, type: 'email'},
    'Cena': {required: true, type: 'number'},
    'Popis': {maxLength: 1000}
};

var errors = validateInput(entry(), validationRules);
if (errors.length > 0) {
    message('Chyby validácie:\n' + errors.join('\n'));
    cancel();
}
SQL injection prevencia
javascript
function safeSqlQuery(query, params) {
    // Kontrola nebezpečných kľúčových slov
    var dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'UPDATE'];
    var upperQuery = query.toUpperCase();
    
    for (var i = 0; i < dangerousKeywords.length; i++) {
        if (upperQuery.indexOf(dangerousKeywords[i]) !== -1) {
            throw new Error('Nebezpečné SQL kľúčové slovo detected: ' + dangerousKeywords[i]);
        }
    }
    
    // Používaj vždy parametrizované dotazy
    return sql(query, params || []);
}
11. Praktické príklady
11.1 E-commerce objednávkový systém
Automatické vypočítanie celkovej ceny objednávky
javascript
// Trigger: After Save v knižnici Objednávky
var order = entry();
var products = order.field('Produkty') || [];
var customer = order.field('Zákazník');

var subtotal = 0;
var totalQuantity = 0;

// Výpočet podsumy z produktov a ich atribútov
for (var i = 0; i < products.length; i++) {
    var product = products[i];
    var price = product.field('Cena') || 0;
    var quantity = product.attr('Množstvo') || 1;
    var discount = product.attr('Zľava') || 0;
    
    var lineTotal = price * quantity * (1 - discount);
    subtotal += lineTotal;
    totalQuantity += quantity;
}

// Zľava pre VIP zákazníkov
var customerDiscount = 0;
if (customer && customer.field('VIP') === true) {
    customerDiscount = 0.1; // 10% zľava
}

// Poštovné
var shipping = subtotal > 50 ? 0 : 5.99;

// Finálne výpočty
var discountAmount = subtotal * customerDiscount;
var subtotalAfterDiscount = subtotal - discountAmount;
var tax = subtotalAfterDiscount * 0.2; // 20% DPH
var total = subtotalAfterDiscount + tax + shipping;

// Uloženie výsledkov
order.set('Podsum', subtotal);
order.set('Zľava zákazníka', discountAmount);
order.set('Poštovné', shipping);
order.set('DPH', tax);
order.set('Celková cena', total);
order.set('Počet položiek', totalQuantity);

// Info log
addInfo(order, 'Objednávka prepočítaná', {
    method: 'calculateOrderTotal',
    result: totalQuantity + ' položiek, celkom ' + total.toFixed(2) + ' €'
});
Automatická kontrola skladových zásob
javascript
// Trigger: Before Save v knižnici Objednávky
var order = entry();
var products = order.field('Produkty') || [];
var outOfStockItems = [];

for (var i = 0; i < products.length; i++) {
    var product = products[i];
    var requestedQty = product.attr('Množstvo') || 1;
    var availableQty = product.field('Skladom') || 0;
    
    if (availableQty < requestedQty) {
        outOfStockItems.push({
            name: product.field('Názov'),
            requested: requestedQty,
            available: availableQty
        });
    }
}

if (outOfStockItems.length > 0) {
    var errorMsg = 'Nedostatok skladových zásob:\n';
    for (var j = 0; j < outOfStockItems.length; j++) {
        var item = outOfStockItems[j];
        errorMsg += '• ' + item.name + ': požadované ' + item.requested + 
                   ', dostupné ' + item.available + '\n';
    }
    
    message(errorMsg);
    cancel();
}

// Rezervácia zásob
for (var k = 0; k < products.length; k++) {
    var product = products[k];
    var qty = product.attr('Množstvo') || 1;
    var currentStock = product.field('Skladom') || 0;
    var reserved = product.field('Rezervované') || 0;
    
    product.set('Rezervované', reserved + qty);
    
    addInfo(order, 'Rezervácia zásob', {
        result: 'Produkt ' + product.field('Názov') + ': rezervované ' + qty + ' ks'
    });
}
11.2 CRM systém
Automatické sledovanie aktivít zákazníka
javascript
// Trigger: After Save v knižnici Kontakty
var contact = entry();
var customer = contact.field('Zákazník');

if (customer) {
    // Aktualizácia posledného kontaktu
    customer.set('Posledný kontakt', Date.now());
    
    // Počítanie kontaktov za mesiac
    var thisMonth = moment().format('YYYY-MM');
    var monthlyContacts = customer.linksFrom('Kontakty', 'Zákazník');
    
    var contactsThisMonth = 0;
    for (var i = 0; i < monthlyContacts.length; i++) {
        var contactDate = monthlyContacts[i].field('Dátum');
        if (contactDate && moment(contactDate).format('YYYY-MM') === thisMonth) {
            contactsThisMonth++;
        }
    }
    
    customer.set('Kontakty tento mesiac', contactsThisMonth);
    
    // Lead scoring
    var leadScore = 0;
    leadScore += contactsThisMonth * 10; // 10 bodov za každý kontakt
    leadScore += customer.field('Návštevy webu') || 0;
    leadScore += (customer.field('Email otvorený') === true) ? 20 : 0;
    
    customer.set('Lead Score', leadScore);
    
    // Automatické označenie hot leadov
    if (leadScore > 100) {
        customer.set('Priorita', 'Vysoká');
        customer.set('Hot Lead', true);
        
        // Notifikácia sales tímu
        createTaskForSalesTeam(customer);
    }
}

function createTaskForSalesTeam(customer) {
    var tasksLib = libByName('Úlohy');
    tasksLib.create({
        'Názov': 'Hot Lead: ' + customer.field('Názov'),
        'Popis': 'Zákazník ' + customer.field('Názov') + ' dosiahol vysoké skóre (' + 
                 customer.field('Lead Score') + '). Kontaktovať do 24h.',
        'Priorita': 'Vysoká',
        'Deadline': moment().add(1, 'day').toDate(),
        'Priradené': customer.field('Account Manager'),
        'Status': 'Nová'
    });
}
11.3 Projektový manažment
Automatické sledovanie progress projektu
javascript
// Trigger: After Save v knižnici Úlohy
var task = entry();
var project = task.field('Projekt');

if (project) {
    // Získanie všetkých úloh projektu
    var allTasks = project.linksFrom('Úlohy', 'Projekt');
    
    var totalTasks = allTasks.length;
    var completedTasks = 0;
    var inProgressTasks = 0;
    var totalHours = 0;
    var completedHours = 0;
    
    for (var i = 0; i < allTasks.length; i++) {
        var projectTask = allTasks[i];
        var status = projectTask.field('Status');
        var estimatedHours = projectTask.field('Odhadované hodiny') || 0;
        var actualHours = projectTask.field('Skutočné hodiny') || 0;
        
        totalHours += estimatedHours;
        
        if (status === 'Dokončená') {
            completedTasks++;
            completedHours += actualHours;
        } else if (status === 'V procese') {
            inProgressTasks++;
        }
    }
    
    // Výpočet progress
    var taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    var hoursProgress = totalHours > 0 ? (completedHours / totalHours) * 100 : 0;
    
    // Aktualizácia projektu
    project.set('Celkový počet úloh', totalTasks);
    project.set('Dokončené úlohy', completedTasks);
    project.set('Úlohy v procese', inProgressTasks);
    project.set('Progress úloh (%)', Math.round(taskProgress));
    project.set('Progress hodín (%)', Math.round(hoursProgress));
    project.set('Celkové hodiny', totalHours);
    project.set('Odpracované hodiny', completedHours);
    project.set('Posledná aktualizácia', Date.now());
    
    // Automatické označenie statusu projektu
    if (taskProgress === 100) {
        project.set('Status', 'Dokončený');
        
        // Notifikácia project managera
        var pmEmail = project.field('Project Manager').field('Email');
        sendProjectCompletionEmail(project, pmEmail);
    } else if (taskProgress > 80) {
        project.set('Status', 'Finalizácia');
    } else if (taskProgress > 0) {
        project.set('Status', 'V procese');
    }
    
    // Risk management
    checkProjectRisks(project);
}

function checkProjectRisks(project) {
    var deadline = project.field('Deadline');
    var progress = project.field('Progress úloh (%)') || 0;
    
    if (deadline) {
        var daysUntilDeadline = moment(deadline).diff(moment(), 'days');
        var expectedProgress = Math.max(0, 100 - (daysUntilDeadline / 30) * 100); // 30 dní projekt
        
        if (progress < expectedProgress - 20) {
            project.set('Risk Level', 'Vysoké');
            project.set('Risk Reason', 'Projekt zaostáva za harmonogramom');
            
            // Vytvorenie risk záznamu
            createRiskEntry(project, 'Časový sklz');
        } else if (progress < expectedProgress - 10) {
            project.set('Risk Level', 'Stredné');
            project.set('Risk Reason', 'Mierne oneskorenie');
        } else {
            project.set('Risk Level', 'Nízke');
            project.set('Risk Reason', '');
        }
    }
}
12. Troubleshooting
12.1 Časté chyby a riešenia
"Field does not exist" error
javascript
// ❌ Problematický kód
var value = entry().field('NeexistujúcePole');

// ✅ Bezpečné riešenie
function safeField(entry, fieldName, defaultValue) {
    try {
        var value = entry.field(fieldName);
        return value !== null && value !== undefined ? value : defaultValue;
    } catch (e) {
        addDebug(entry, 'Field not found: ' + fieldName);
        return defaultValue;
    }
}

var value = safeField(entry(), 'NeexistujúcePole', 'default');
"Invalid return" v trigger scriptoch
javascript
// ❌ Nesprávne - return nie je povolený v trigger scriptoch
if (someCondition) {
    return; // Chyba!
}

// ✅ Správne - použitie flag premenných
var shouldContinue = true;

if (someCondition) {
    shouldContinue = false;
}

if (shouldContinue) {
    // pokračovanie kódu
}
Link to Entry attribute chyby
javascript
// ❌ Nesprávna syntax
entry().field('LinkField').setAttr('attrName', 'value');

// ✅ Správna syntax
entry().setAttr('LinkField', 0, 'attrName', 'value');

// ✅ Bezpečná verzia s kontrolou
function safeSetAttr(entry, fieldName, index, attrName, value) {
    try {
        var field = entry.field(fieldName);
        if (field && field.length > index) {
            entry.setAttr(fieldName, index, attrName, value);
            return true;
        }
        return false;
    } catch (e) {
        addError(entry, 'Failed to set attribute: ' + e.toString());
        return false;
    }
}
12.2 Performance problémy
Pomalé SQL dotazy
javascript
// ❌ Neoptimalizovaný dotaz
var results = sql('SELECT * FROM VeľkáTabuľka WHERE pole LIKE "%' + hľadanýText + '%"').asObjects();

// ✅ Optimalizovaný prístup
function optimizedSearch(searchText, limit) {
    limit = limit || 100;
    
    // Indexované vyhľadávanie
    var exactResults = sql(
        'SELECT * FROM VeľkáTabuľka WHERE pole = ? LIMIT ?', 
        [searchText, limit]
    ).asObjects();
    
    if (exactResults.length === 0) {
        // Fallback na LIKE len ak je potrebný
        var likeResults = sql(
            'SELECT * FROM VeľkáTabuľka WHERE pole LIKE ? LIMIT ?',
            ['%' + searchText + '%', limit]
        ).asObjects();
        return likeResults;
    }
    
    return exactResults;
}
Memory management
javascript
// ❌ Pamäťovo náročné
var allEntries = lib().entries(); // Môže byť tisíce záznamov
for (var i = 0; i < allEntries.length; i++) {
    processEntry(allEntries[i]);
}

// ✅ Optimalizované batch spracovanie
function processBatchOptimized(batchSize) {
    batchSize = batchSize || 50;
    var totalCount = lib().count();
    
    for (var offset = 0; offset < totalCount; offset += batchSize) {
        var batch = sql(
            'SELECT * FROM CurrentLibrary LIMIT ? OFFSET ?',
            [batchSize, offset]
        ).asEntries();
        
        for (var i = 0; i < batch.length; i++) {
            processEntry(batch[i]);
        }
        
        // Cleanup batch z pamäte
        batch = null;
    }
}
12.3 API a network problémy
Timeout handling
javascript
function robustApiCall(url, maxRetries) {
    maxRetries = maxRetries || 3;
    var attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            var httpObj = http();
            var response = httpObj.get(url);
            
            if (response.code === 200) {
                return {success: true, data: JSON.parse(response.body)};
            } else if (response.code >= 500) {
                // Server error - skúsiť znovu
                attempt++;
                continue;
            } else {
                // Client error - neskúšať znovu
                return {success: false, error: 'HTTP ' + response.code};
            }
        } catch (e) {
            attempt++;
            if (attempt >= maxRetries) {
                return {success: false, error: 'All retries failed: ' + e.toString()};
            }
            
            // Exponential backoff
            var delay = Math.pow(2, attempt) * 1000;
            var start = Date.now();
            while (Date.now() - start < delay) {
                // Busy wait (Memento nemá setTimeout)
            }
        }
    }
    
    return {success: false, error: 'Max retries exceeded'};
}
12.4 Debugging komplexných skriptov
Debug utility systém
javascript
var DebugUtils = {
    enabled: true,
    maxLogLength: 10000,
    
    log: function(entry, level, message, context) {
        if (!this.enabled) return;
        
        var timestamp = moment().format('HH:mm:ss.SSS');
        var logEntry = '[' + timestamp + '] ' + level.toUpperCase();
        
        if (context) {
            logEntry += ' (' + context + ')';
        }
        
        logEntry += ': ' + message;
        
        var fieldName = level === 'error' ? 'Error_Log' : 'Debug_Log';
        var existingLog = entry.field(fieldName) || '';
        
        // Trimovanie ak je log príliš dlhý
        if (existingLog.length > this.maxLogLength) {
            existingLog = '... [trimmed] ...\n' + existingLog.substring(existingLog.length - 5000);
        }
        
        entry.set(fieldName, existingLog + logEntry + '\n');
    },
    
    debug: function(entry, message, context) {
        this.log(entry, 'debug', message, context);
    },
    
    error: function(entry, message, context) {
        this.log(entry, 'error', message, context);
    },
    
    performance: function(entry, operation, duration) {
        this.debug(entry, operation + ' took ' + duration + 'ms', 'PERF');
    },
    
    dumpObject: function(entry, obj, name) {
        try {
            var json = JSON.stringify(obj, null, 2);
            this.debug(entry, name + ':\n' + json, 'DUMP');
        } catch (e) {
            this.error(entry, 'Failed to dump object ' + name + ': ' + e.toString(), 'DUMP');
        }
    }
};

// Použitie
DebugUtils.debug(entry(), 'Script started');

var customer = entry().field('Zákazník');
if (customer) {
    DebugUtils.dumpObject(entry(), {
        id: customer.field('ID'),
        name: customer.field('Názov'),
        email: customer.field('Email')
    }, 'Customer data');
} else {
    DebugUtils.error(entry(), 'Customer not found', 'VALIDATION');
}
📋 Záver
Tento manuál poskytuje komplexný prehľad možností JavaScriptu v Memento Database. Kľúčové body:

✅ Čo ste sa naučili:
Základy skriptovania v Memento prostredí

Prácu s rôznymi typmi skriptov a ich použitie

Memento JavaScript API a jeho možnosti

Bezpečné patterns pre prácu s dátami

AI integráciu a pokročilé automatizácie

Debugging techniky a best practices

Riešenie bežných problémov

🚀 Ďalšie kroky:
Začnite jednoduchými skriptmi - JavaScript polia a základné triggery

Testujte na testovacích dátach - nikdy nevyvíjajte na produkčných dátach

Používajte MementoUtils knižnicu - pre robustné a efektívne riešenia

Implementujte postupne - pridávajte funkcionalitu krok za krokom

Monitorujte performance - sledujte rýchlosť a stabilitu skriptov

📚 Ďalšie zdroje:
Memento Database dokumentácia

JavaScript tutoriály a príručky

Moment.js dokumentácia pre prácu s časom

API dokumentácie pre integrácie

Skriptovanie v Memento Database vám umožňuje vytvárať mocné a inteligentné aplikácie priamo v mobilnom prostredí. Využite tieto znalosti na automatizáciu vašich procesov a zvýšenie produktivity! 🎯