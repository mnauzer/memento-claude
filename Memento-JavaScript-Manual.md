# Manuál pre použitie JavaScript v Memento Database

## Obsah
1. [Úvod do JavaScript v Memento Database](#úvod)
2. [Typy skriptov](#typy-skriptov)
3. [JavaScript Field (Polia)](#javascript-field)
4. [Triggery (Spúšťače)](#triggery)
5. [Akcie](#akcie)
6. [Memento JavaScript API](#api)
7. [Základné objekty a funkcie](#zakladne-objekty)
8. [Práca s knižnicami a záznamami](#prace-s-kniznicami)
9. [Pokročilé funkcie](#pokrocile-funkcie)
10. [Praktické príklady](#praktické-priklady)
11. [Najlepšie praktiky](#najlepsie-praktiky)

## 1. Úvod do JavaScript v Memento Database {#úvod}

JavaScript v Memento Database poskytuje výkonné možnosti pre automatizáciu, výpočty a rozšírenie funkcionality vašej databázy. Umožňuje vykonávať komplexné operácie, ktoré presahujú štandardné možnosti používateľského rozhrania.

### Kde sa JavaScript používa:
- **Triggery** - automatické vykonávanie pri databázových udalostiach
- **Akcie a tlačidlá** - spúšťanie pri kliknutí používateľom
- **JavaScript Field** - výpočty v poliach záznamov
- **Data Sources** - dynamické údaje pre automatické dopĺňanie
- **Widgety** - programovanie vzhľadu a správania

## 2. Typy skriptov {#typy-skriptov}

### JavaScript Field
- Obmedzený kontext vykonávania
- Používa sa pre výpočty v poliach
- Nemôže modifikovať hodnoty polí
- Nepodporuje Memento JavaScript API metódy

### Trigger Scripts
- Spúšťajú sa automaticky pri udalostiach
- Majú prístup k plnému Memento JavaScript API
- Môžu modifikovať záznamy a knižnice

### Action Scripts
- Spúšťajú sa manuálne tlačidlami alebo menu
- Plný prístup k API
- Môžu vykonávať komplexné operácie

### Shared Scripts
- Zdieľaný kód pre iné skripty
- Obsahuje opakujúce sa funkcie
- Dostupné všetkým ostatným skriptom

## 3. JavaScript Field (Polia) {#javascript-field}

JavaScript polia slúžia na výpočet hodnôt na základe výrazov a formuliek.

### Základné použitie:
```javascript
// Jednoduchý výpočet
field("Jednotková_cena") * field("Množstvo")

// Podmienené vykonávanie
if (field("Produkt") == "Pomaranč")
    "Ovocie"
else if (field("Produkt") == "Brokolica")
    "Zelenina"
else
    "Iné"

// Práca s dátumami (moment.js)
moment(field("Dátum")).format("DD.MM.YYYY")
```

### Funkcia field()
Získava hodnotu poľa zo záznamu:

```javascript
// Textové pole
field("Názov")              // String

// Číselné pole
field("Množstvo")           // Number

// Dátum
field("Termín")             // Date

// Checkbox
field("Dokončené")          // Boolean

// Viacnásobný výber
field("Kategórie")          // Array of strings

// Link na záznam
field("Súvisiace_úlohy")    // Array of entries
field("Súvisiace_úlohy")[0].field("Názov")  // Pole z prepojeného záznamu
```

## 4. Triggery (Spúšťače) {#triggery}

Triggery sa spúšťajú automaticky pri špecifických udalostiach v databáze.

### Typy udalostí:
- **Vytváranie záznamu** - pred/po vytvorení
- **Aktualizácia záznamu** - pred/po aktualizácii
- **Mazanie záznamu** - pred/po zmazaní
- **Otvorenie knižnice** - pri vstupe do knižnice
- **Zmena poľa** - pri zmene konkrétneho poľa

### Fázy vykonávania:
- **Pred uložením** (Before saving) - pre validáciu a modifikáciu
- **Po uložení** (After saving) - pre následné akcie
- **Otvorenie formulára** (Opening entry edit card) - pre nastavenie predvolených hodnôt

### Základný trigger:
```javascript
// Získanie aktuálneho záznamu
var zaznam = entry();

// Nastavenie hodnoty poľa
zaznam.set("Celková_cena", zaznam.field("Cena") * zaznam.field("Množstvo"));

// Práca s prepojenými knižnicami
var projekty = libByName("Projekty");
var projekt = projekty.findByKey("Názov projektu");
```

## 5. Akcie {#akcie}

Akcie sa spúšťajú manuálne pomocou tlačidiel alebo menu položiek.

### Príklad akcie:
```javascript
// Vytvorenie nového záznamu v inej knižnici
var faktury = libByName("Faktúry");
var novaFaktura = faktury.create({
    "Číslo": "F" + new Date().getFullYear() + "-001",
    "Dátum": new Date(),
    "Zákazník": entry().field("Názov")
});

// Zobrazenie správy
message("Faktúra bola vytvorená: " + novaFaktura.field("Číslo"));
```

## 6. Memento JavaScript API {#api}

### Globálne funkcie pre knižnice:

#### entry()
```javascript
// Získanie aktuálneho záznamu
var zaznam = entry();
var nazov = zaznam.field("Názov");
zaznam.set("Stav", "Aktívny");
```

#### lib()
```javascript
// Aktuálna knižnica
var aktualnaKniznica = lib();
var vsetkyZaznamy = aktualnaKniznica.entries();
```

#### libByName(name)
```javascript
// Knižnica podľa názvu
var zamestnanci = libByName("Zamestnanci");
if (zamestnanci) {
    var novyZamestnanec = zamestnanci.create({
        "Meno": "Ján Novák",
        "Pozícia": "Vývojár"
    });
}
```

#### libById(id)
```javascript
// Knižnica podľa ID (spoľahlivejšie)
var projekty = libById("lib_projects_001");
```

## 7. Základné objekty a funkcie {#zakladne-objekty}

### Entry objekt

#### Vlastnosti:
```javascript
var zaznam = entry();

zaznam.id              // ID záznamu
zaznam.name            // Názov záznamu
zaznam.author          // Autor
zaznam.creationTime    // Čas vytvorenia
zaznam.lastModifiedTime // Posledná zmena
zaznam.deleted         // Je zmazaný
zaznam.favorites       // Je v obľúbených
```

#### Metódy:
```javascript
// Získanie hodnoty poľa
var hodnota = zaznam.field("Názov_poľa");

// Nastavenie hodnoty poľa
zaznam.set("Názov_poľa", hodnota);

// Prepojenie s iným záznamom
zaznam.link("Pole_prepojenia", inyZaznam);

// Odstránenie prepojenia
zaznam.unlink("Pole_prepojenia", inyZaznam);

// Prepočítanie vypočítavaných polí
zaznam.recalc();

// Presun do koša
zaznam.trash();

// Obnovenie z koša
zaznam.untrash();

// Zobrazenie záznamu
zaznam.show();
```

### Library objekt

#### Vlastnosti:
```javascript
var kniznica = lib();

kniznica.name          // Názov knižnice
kniznica.title         // Titul (alias pre name)
kniznica.id            // ID knižnice
```

#### Metódy:
```javascript
// Vytvorenie nového záznamu
var novyZaznam = kniznica.create({
    "Pole1": "hodnota1",
    "Pole2": "hodnota2"
});

// Všetky záznamy (od najnovších)
var zaznamy = kniznica.entries();

// Posledný záznam
var posledny = kniznica.lastEntry();

// Prvý záznam
var prvy = kniznica.firstEntry();

// Názvy polí
var polia = kniznica.fields();

// Vyhľadávanie
var vysledky = kniznica.find("hľadaný text");

// Nájdenie podľa ID
var zaznam = kniznica.findById("id_zaznamu");

// Nájdenie podľa kľúča
var zaznam = kniznica.findByKey("názov");

// Odkazy na záznam
var odkazy = kniznica.linksTo(zaznam);

// Zobrazenie knižnice
kniznica.show();
```

## 8. Práca s knižnicami a záznamami {#prace-s-kniznicami}

### Vytvorenie a úprava záznamov:
```javascript
// Vytvorenie nového záznamu
var zakaznici = libByName("Zákazníci");
var novyZakaznik = zakaznici.create({
    "Názov": "ABC s.r.o.",
    "IČO": "12345678",
    "Email": "info@abc.sk"
});

// Aktualizácia existujúceho záznamu
var zaznam = entry();
zaznam.set("Stav", "Spracovávaný");
zaznam.set("Dátum_spracovania", new Date());

// Práca s prepojeniami
var projekt = libByName("Projekty").findByKey("Web projekt");
zaznam.link("Projekt", projekt);
```

### Vyhľadávanie a filtrovanie:
```javascript
// Vyhľadávanie textom
var vysledky = lib().find("dokončené");

// Iterácia cez záznamy
var zaznamy = lib().entries();
for (var i = 0; i < zaznamy.length; i++) {
    var zaznam = zaznamy[i];
    if (zaznam.field("Stav") == "Aktívny") {
        // Spracovanie aktívnych záznamov
        zaznam.set("Posledná_kontrola", new Date());
    }
}
```

### Práca s rôznymi typmi polí:
```javascript
// Textové polia
zaznam.set("Názov", "Nový názov");

// Číselné polia
zaznam.set("Množstvo", 42);

// Dátumové polia
zaznam.set("Termín", new Date());

// Boolean polia
zaznam.set("Dokončené", true);

// Viacnásobný výber
zaznam.set("Kategórie", ["Práca", "Dôležité", "Projekt"]);

// Prepojenia na záznamy
var prepojeneZaznamy = [zaznam1, zaznam2];
zaznam.set("Súvisiace_položky", prepojeneZaznamy);
```

## 9. Pokročilé funkcie {#pokrocile-funkcie}

### SQL queries:
```javascript
// Základný SQL dotaz
var vysledky = sql("SELECT * FROM MojaKniznica WHERE Stav = 'Aktívny'").asObjects();

// Získanie záznamov ako Entry objekty
var zaznamy = sql("SELECT id, Názov FROM MojaKniznica WHERE Číslo > 10").asEntries();

// Agregovanie
var pocet = sql("SELECT COUNT(*) FROM MojaKniznica").asInt();
var priemer = sql("SELECT AVG(Hodnotenie) FROM MojaKniznica").asDouble();
```

### HTTP requesty:
```javascript
// GET request
var odpoved = http().get("https://api.example.com/data");
if (odpoved.code == 200) {
    var data = JSON.parse(odpoved.body);
    // Spracovanie dát
}

// POST request
var data = JSON.stringify({
    "nazov": entry().field("Názov"),
    "hodnota": entry().field("Hodnota")
});
var odpoved = http().post("https://api.example.com/create", data);

// Nastavenie headerov
var httpClient = http();
httpClient.headers({"Content-Type": "application/json"});
var odpoved = httpClient.post("https://api.example.com/data", data);
```

### Email:
```javascript
// Konfigurácia SMTP
var config = {
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "vas@gmail.com",
    "pass": "heslo",
    "from": "vas@gmail.com"
};

// Odoslanie emailu
email().send(config, "prijemca@email.com", "Predmet", "Text správy");
```

### Práca so súbormi:
```javascript
// Čítanie súboru
var subor = file("data.txt");
var obsah = subor.readAll();
subor.close();

// Zápis do súboru
var subor = file("output.txt");
subor.write("Text na zapísanie");
subor.writeLine("Riadok s ukončením");
subor.close();
```

## 10. Praktické príklady {#praktické-priklady}

### Automatické číslenie faktúr:
```javascript
// Trigger: Vytváranie záznamu - Pred uložením
var zaznam = entry();
var rok = new Date().getFullYear();
var faktury = lib();

// Nájdenie najvyššieho čísla v aktuálnom roku
var query = "SELECT MAX(CAST(SUBSTR(Cislo, 6) AS INTEGER)) as max_num " +
           "FROM Faktury WHERE Cislo LIKE '" + rok + "-%'";
var maxCislo = sql(query).asInt() || 0;

// Nastavenie nového čísla
var noveCislo = rok + "-" + String(maxCislo + 1).padStart(3, '0');
zaznam.set("Cislo", noveCislo);
```

### Automatický prepočet DPH:
```javascript
// JavaScript Field pre pole "Cena s DPH"
var zakladnaCena = field("Základná_cena") || 0;
var dphSadzba = field("DPH_sadzba") || 20;
var cenaSdph = zakladnaCena * (1 + dphSadzba / 100);

// Zaokrúhlenie na 2 desatinné miesta
Math.round(cenaSdph * 100) / 100;
```

### Automatické notifikácie:
```javascript
// Trigger: Aktualizácia záznamu - Po uložení
var zaznam = entry();
if (zaznam.field("Stav") == "Dokončené") {
    // Nájdenie zodpovědného
    var zamestnanec = zaznam.field("Zodpovedný")[0];
    if (zamestnanec) {
        var email = zamestnanec.field("Email");
        
        // Konfigurácia emailu
        var config = {
            "host": "smtp.example.com",
            "port": 587,
            "user": "system@firma.sk",
            "pass": "heslo",
            "from": "system@firma.sk"
        };
        
        var predmet = "Úloha dokončená: " + zaznam.field("Názov");
        var sprava = "Úloha '" + zaznam.field("Názov") + "' bola označená ako dokončená.";
        
        email().send(config, email, predmet, sprava);
    }
}
```

### Validácia dát:
```javascript
// Trigger: Aktualizácia záznamu - Pred uložením
var zaznam = entry();
var email = zaznam.field("Email");

// Validácia emailu
if (email && email.indexOf("@") == -1) {
    message("Neplatný formát emailovej adresy!");
    cancel(); // Zruší uloženie
}

// Validácia IČO (8 číslic)
var ico = zaznam.field("IČO");
if (ico && (ico.length != 8 || !/^\d+$/.test(ico))) {
    message("IČO musí obsahovať presne 8 číslic!");
    cancel();
}
```

### Automatické dopĺňanie z inej knižnice:
```javascript
// Trigger: Zmena poľa "Zákazník" - Po zmene
var zaznam = entry();
var zakaznik = zaznam.field("Zákazník")[0];

if (zakaznik) {
    // Automatické dopĺňanie údajov zo zákazníka
    zaznam.set("Fakturačná_adresa", zakaznik.field("Adresa"));
    zaznam.set("IČO", zakaznik.field("IČO"));
    zaznam.set("DIČ", zakaznik.field("DIČ"));
    zaznam.set("Email", zakaznik.field("Kontaktný_email"));
}
```

## 11. Najlepšie praktiky {#najlepsie-praktiky}

### Všeobecné zásady:
1. **Používajte komentáre** - vysvetlite účel kódu
2. **Validujte vstupné dáta** - vždy kontrolujte existenciu hodnôt
3. **Používajte try-catch** - pre ošetrenie chýb
4. **Minimalizujte počet operácií** - optimalizujte výkon

### Bezpečnosť:
```javascript
// Vždy kontrolujte existenciu objektov
var kniznica = libByName("Názov_knižnice");
if (kniznica) {
    var zaznam = kniznica.findByKey("kľúč");
    if (zaznam) {
        // Bezpečné použitie
        zaznam.set("Pole", "hodnota");
    }
}

// Ošetrenie chýb
try {
    var vysledok = nejakaFunkcia();
    // Spracovanie výsledku
} catch (error) {
    log("Chyba: " + error.message);
    message("Nastala chyba pri spracovaní dát.");
}
```

### Výkon:
```javascript
// Ukladajte často používané objekty do premenných
var aktualnyZaznam = entry();
var nazov = aktualnyZaznam.field("Názov");
var stav = aktualnyZaznam.field("Stav");

// Namiesto opakovania entry().field() pre každé pole
```

### Údržba kódu:
```javascript
// Používajte významné názvy premenných
var faktura = entry();
var zakaznik = faktura.field("Zákazník")[0];
var celkovaSuma = faktura.field("Celková_suma");

// Rozdeľte komplexný kód do funkcií (v Shared Scripts)
function vypocitajDph(zakladnaCena, sadzba) {
    return zakladnaCena * (sadzba / 100);
}
```

### Debugovanie:
```javascript
// Používajte log() pre ladenie
log("Začiatok spracovania záznamu: " + entry().field("Názov"));

// Používajte message() pre informácie používateľa
message("Spracovanie dokončené úspešne.");

// Kontrolné výpisy
var hodnota = field("Dôležité_pole");
log("Hodnota dôležitého poľa: " + hodnota);
```

---

Tento manuál pokrýva základné i pokročilé použitie JavaScript v Memento Database. Pre konkrétne príklady a ďalšie informácie navštívte:
- [Wiki Memento Database](http://wiki.mementodatabase.com)
- [Scripts Memento Database](https://scripts.mementodatabase.com)
- [Google Groups - Memento Database](https://groups.google.com/g/mementodatabase)