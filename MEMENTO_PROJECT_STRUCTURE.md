# Memento Database Project - Štruktúra

## Organizácia projektu

```
memento-claude/
├── core/                           # Základné moduly systému (všetky v root core/)
│   ├── MementoCore7.js            # Foundation utilities (logging, field access, validation)
│   ├── MementoConfig7.js          # Centralized configuration management
│   ├── MementoUtils7.js           # Extended utilities and helper functions
│   ├── MementoBusiness7.js        # Business logic (attendance, payroll calculations)
│   ├── MementoAI7.js              # AI services integration (OpenAI, Claude)
│   ├── MementoTelegram8.js        # Telegram Bot API integration
│   └── MementoGPS.js              # GPS utilities
│
├── libraries/                      # Knižnice Memento Database
│   ├── dochadzka/                 # Dochádzka (Attendance)
│   │   ├── Doch.Calc.Main.js
│   │   ├── Doch.Calc.Universal.js
│   │   ├── Doch.Calc.Custom.PeterBabicenko.js
│   │   ├── Doch.Trigger.BeforeDelete.js
│   │   └── Doch.Notif.Individual.js
│   │
│   ├── kniha-jazd/                # Kniha jázd (Vehicle Logbook)
│   │   ├── Knij.Calc.Main.js
│   │   ├── Knij.Action.LinkOrders.js
│   │   └── Knij.Action.SetStartEnd.js
│   │
│   ├── material/                  # Materiál (Materials Management)
│   │   ├── Mat.Calc.Receipts.js
│   │   ├── Mat.Calc.Issues.js
│   │   ├── Mat.Action.SetFields.js
│   │   ├── Mat.Action.CalcPrice.js
│   │   ├── Mat.BulkAction.SetFields.v1.0.js
│   │   ├── Mat.BulkAction.SetFields.v1.1.js
│   │   ├── Mat.BulkAction.UpdatePrices.js
│   │   ├── Mat.BulkAction.UniversalSettings.js
│   │   └── Mat.Button.CalcPrice.js
│   │
│   ├── pokladna/                  # Pokladňa (Cash Register)
│   │   ├── Pokl.Calc.VAT.js
│   │   └── Pokl.Action.PayObligations.js
│   │
│   ├── zamestnanec/               # Zamestnanec (Employee)
│   │   ├── Zam.Calc.Main.js
│   │   └── Zam.Calc.Universal.js
│   │
│   ├── zakazky/                   # Zákazky (Projects/Orders)
│   │   └── Zak.Calc.Main.js
│   │
│   └── zaznam-prac/               # Záznam prác (Work Records)
│       └── Zazp.Calc.Main.js
│
├── utils/                          # Všeobecné utility scripty
│   ├── Notif.Trigger.OnDelete.js
│   ├── Utils.Action.ExtractLibraryIDs.js
│   ├── Utils.Action.Renumber.js
│   └── Utils.Action.RenumberRecords.js
│
└── templates/                      # Šablóny pre nové scripty
```

## Závislosť modulov

### Dependency Chain
```
MementoConfig (žiadne závislosti)
    ↓
MementoCore (závisí od MementoConfig)
    ↓
MementoBusiness, MementoAI, MementoUtils (závisia od Core + Config)
    ↓
MementoTelegram (závisí od všetkých vyššie uvedených)
```

## Knižnice - Popis a súvislosti

### 1. Dochádzka (libraries/dochadzka/)
**Účel:** Evidencia dochádzky zamestnancov, výpočet odpracovaných hodín a miezd

**Scripty:**
- `Dochádzka Prepočet 7.js` - Hlavný prepočtový engine
  - Výpočet hodín s 15-minútovým zaokrúhlením
  - Výpočet miezdy (hodinové sadzby, prémie, zrážky)
  - Vytváranie záväzkov pre zamestnancov

- `Dochádzka Universal Attendance Calculator 1.0.js` - Univerzálny kalkulátor
- `Peter Babičenko Attendance Calculator 1.0.js` - Špecializovaný kalkulátor
- `Dochádzka Individual Notifications 3.0.js` - Individuálne notifikácie
- `Dochádzka Before Delete Cleanup.js` - Cleanup pri mazaní záznamov

**Súvislosti:**
- Linkuje na knižnicu Zamestnanec (employee rates)
- Vytvára záväzky pre zamestnancov
- Prepojenie s MementoBusiness7.js pre business logiku

### 2. Kniha jázd (libraries/kniha-jazd/)
**Účel:** Evidencia jazd vozidiel, výpočet kilometrov a nákladov

**Scripty:**
- `Kniha jázd Prepočet 9.js` - Hlavný prepočtový engine
- `Kniha jázd Nalinkuj zákazky.js` - Linkovanie na zákazky
- `Kniha jázd nastavenie Štart a Cieľ.js` - Nastavenie štartovacích/cieľových bodov

**Súvislosti:**
- Linkuje na knižnicu Zákazky
- Používa MementoGPS.js pre GPS funkcie

### 3. Materiál (libraries/material/)
**Účel:** Správa materiálu, príjemky, výdajky, cenové prepočty

**Scripty:**
- `Príjemky materiálu Prepočet.js` - Prepočet príjemiek
- `Výdajky materiálu Prepočet.js` - Prepočet výdajiek
- `Materiál Universal Bulk Settings 2.0.js` - Hromadné nastavenia v2.0
- `Materiál Nastavenie polí Action.js` - Nastavenie polí (akcia)
- `Materiál Nastavenie polí Bulk Action.js` - Hromadné nastavenie polí
- `Materiál Nastavenie polí Bulk Action v1.1.js` - Hromadné nastavenie v1.1
- `Materiál Prepočet ceny Action.js` - Prepočet ceny (akcia)
- `Materiál Prepočet ceny Bulk Action.js` - Hromadný prepočet ceny
- `Materiál Prepočet ceny Button.js` - Prepočet ceny (tlačidlo)

**Súvislosti:**
- Linkuje na cenníky materiálu
- Prepojenie s Zákazkami a Záznamom prác

### 4. Pokladňa (libraries/pokladna/)
**Účel:** Evidencia pokladničných operácií, DPH, úhrady záväzkov

**Scripty:**
- `Pokladňa prepočet dph.js` - Výpočet DPH
- `Pokladňa Úhrada záväzkov.js` - Úhrada záväzkov

**Súvislosti:**
- Linkuje na záväzky zamestnancov a dodávateľov
- Prepojenie s účtovníctvom

### 5. Zamestnanec (libraries/zamestnanec/)
**Účel:** Evidencia zamestnancov, sadzieb, prepočty

**Scripty:**
- `Zamestnanec Prepočet.js` - Hlavný prepočtový script
- `Zamestnanec Universal Calculator 2.0.js` - Univerzálny kalkulátor v2.0

**Súvislosti:**
- Poskytuje dáta pre Dochádzku (hodinové sadzby)
- Vytvára rate tables pre zamestnancov

### 6. Zákazky (libraries/zakazky/)
**Účel:** Evidencia zákaziek/projektov, výpočet nákladov a výnosov

**Scripty:**
- `Zákazky Prepočet.js` - Hlavný prepočtový engine

**Súvislosti:**
- Linkuje na Záznam prác
- Linkuje na Knihu jázd
- Prepojenie s Materials a cenníkmi

### 7. Záznam prác (libraries/zaznam-prac/)
**Účel:** Evidencia vykonaných prác, výpočet hodín a nákladov

**Scripty:**
- `Záznam prác Prepočet.js` - Hlavný prepočtový engine

**Súvislosti:**
- Linkuje na Zákazky
- Linkuje na Zamestnancov (sadzby)
- Vytvára work statements

## Core moduly - Popis

Všetky core moduly sú umiestnené priamo v `core/` adresári pre jednoduchú prístupnosť z Memento Database.

### core/MementoCore7.js
- Safe field access utilities
- Logging functions
- Validation utilities
- Base utilities pre všetky scripty

### core/MementoConfig7.js
- Centrálna konfigurácia
- Field name mappings
- Library IDs
- Nastavenia pre všetky moduly

### core/MementoUtils7.js
- Extended helper functions
- Time calculations (15-minute rounding)
- Date/time formatting
- Common utilities

### core/MementoBusiness7.js
- Business logic pre attendance
- Payroll calculations
- Work hours calculations
- Rate calculations

### core/MementoAI7.js
- OpenAI GPT-4 integration
- Claude API integration
- HTTP wrapper pre AI services
- Image analysis

### core/MementoTelegram8.js
- Telegram Bot API integration
- Message sending/editing/deletion
- Group and thread support
- Notification aggregation

### core/MementoGPS.js
- GPS coordinate utilities
- Distance calculations
- Location services

## Utility Scripts

### Notifications Delete Trigger.js
- Cleanup notifikácií pri mazaní záznamov
- Univerzálny pre všetky knižnice

### Extract Library IDs.js
- Extrakcia Library IDs z Memento Database
- Development utility

### Library Renumber Action.js
- Prečíslovanie záznamov v knižnici
- Univerzálny pre všetky knižnice

### Utils Prečísluj záznamy.js
- Utility pre prečíslovanie
- Všeobecný helper

## Konvencie pomenovania

### Scripty typu "Prepočet"
- Hlavné prepočtové engines pre knižnice
- Nazývané: `{Knižnica} Prepočet.js`
- Primárna business logika

### Scripty typu "Action"
- Jednorázové akcie/operácie
- Nazývané: `{Knižnica} {Operácia} Action.js`

### Scripty typu "Bulk Action"
- Hromadné operácie
- Nazývané: `{Knižnica} {Operácia} Bulk Action.js`

### Scripty typu "Universal Calculator"
- Univerzálne kalkulátory
- Nazývané: `{Knižnica} Universal Calculator {verzia}.js`

### Scripty typu "Notifications"
- Notification handling
- Nazývané: `{Knižnica} {Typ} Notifications {verzia}.js`

## Git Synchronizácia

**Synchronizované:**
- core/ - všetky core moduly
- libraries/ - všetky library scripty
- utils/ - utility scripty
- templates/ - šablóny

**Ignorované (lokálne):**
- telegram-integration/
- python-utilities/
- workflows/
- logs-temp/
- kb-docs/
- config/
- Debug*, Test*, Template* súbory

## Naming Convention

**Formát názvu scriptu:** `[Knižnica].[Typ].[Názov].js`

**Príklady:**
- `Doch.Calc.Main.js` - Hlavný prepočet dochádzky
- `Mat.Action.SetFields.js` - Akcia nastavenia polí materiálu
- `Notif.Trigger.OnDelete.js` - Trigger cleanup notifikácií

**Verzia** je uvedená v hlavičke scriptu, NIE v názve súboru!

Pre úplnú konvenciu pomenovania pozri: **MEMENTO_NAMING_CONVENTION.md**

## Použitie v Claude Code

Pri práci so scriptami referencovať:
- `core/MementoCore7.js:123` - core utilities
- `core/MementoConfig7.js:45` - configuration
- `libraries/dochadzka/Doch.Calc.Main.js:456` - attendance calculation
- `libraries/material/Mat.Action.SetFields.js:78` - material fields setup

**Dôležité:** Všetky core moduly sú v `core/` adresári (bez podadresárov) pre jednoduchšiu prístupnosť z Memento Database.

Claude Code má prístup k tejto knowledge base a vie:
1. Kde nájsť príslušné scripty
2. Aké sú závislosti medzi modulmi
3. Ktoré scripty spolu súvisia
4. Kde pridávať nové funkcie
5. Ako pomenovať nové scripty
6. Že core moduly sú všetky v `core/` root adresári
