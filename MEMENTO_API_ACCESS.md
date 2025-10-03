# Memento Database API Access Guide

**Dátum vytvorenia:** 2025-10-03
**Autor:** ASISTANTO
**Verzia:** 1.0

## Dôležité poznatky o Memento API

### Autentifikácia

**KRITICKÉ:** Memento Database API používa **token ako URL parameter**, NIE v hlavičke!

#### ✅ Správny spôsob:
```bash
curl "https://api.mementodatabase.com/v1/libraries?token=YOUR_API_KEY"
```

#### ❌ Nesprávne spôsoby (nefungujú):
```bash
# Tieto metódy NEFUNGUJÚ s Memento API:
curl -H "Authorization: Bearer YOUR_API_KEY" ...
curl -H "X-Access-Token: YOUR_API_KEY" ...
curl -u "YOUR_API_KEY:" ...
```

### API Endpoint

**Base URL:** `https://api.mementodatabase.com/v1`

**Dôležité:** Starý endpoint `https://mementoserver-hrd.appspot.com/v1` už nepoužívať!

### Aktuálny API Key

**Funkčný API kľúč:** `hx7GjATH8FtqljeQeoU24Oy495oCGi`

**Umiestnenie:**
- `/home/rasto/memento-claude/.env`
- `/home/rasto/memento-claude/config/.env`

### API Dokumentácia

**Oficiálna dokumentácia:** https://mementodatabase.docs.apiary.io/

**Poznámka:** Dokumentácia je dynamicky načítavaná cez JavaScript, preto curl/wget vráti len HTML kostru.

## Python Skripty

### Umiestnenie

Všetky Python utility sú v adresári:
```
/home/rasto/memento-claude/python-utilities/
```

### Existujúce skripty

1. **memento_api_simple.py** - Jednoduchý API client (nový, vytvorený 2025-10-03)
   - Kompletný CRUD prístup k Memento Database
   - CLI interface
   - Podpora pre všetky základné operácie

2. **memento_api_client.py** - Pokročilý API client s rate limiting
   - Rate limiting (10 requests/min)
   - Retry mechanizmus
   - Logging a debugging
   - Alternative auth methods

3. **extract_all_libraries.py** - Extrahovanie všetkých knižníc
4. **analyze_library_structure.py** - Analýza štruktúry knižníc
5. **field_sync_system.py** - Synchronizácia polí
6. A ďalšie...

### Použitie memento_api_simple.py

#### CLI Interface

```bash
# Musíš nastaviť API key ako environment variable
export MEMENTO_API_KEY=hx7GjATH8FtqljeQeoU24Oy495oCGi

# Zoznam všetkých knižníc
python3 python-utilities/memento_api_simple.py libraries

# Štruktúra knižnice podľa názvu
python3 python-utilities/memento_api_simple.py structure --library-name "Denný report"

# Štruktúra knižnice podľa ID
python3 python-utilities/memento_api_simple.py structure --library-id Tt4pxN4xQ

# Získať entries z knižnice
python3 python-utilities/memento_api_simple.py entries --library-id Tt4pxN4xQ --limit 10

# Nájsť knižnicu podľa názvu
python3 python-utilities/memento_api_simple.py find --library-name "Dochádzka"
```

#### Python API

```python
from memento_api_simple import MementoAPI

# Inicializácia (číta z .env)
api = MementoAPI()

# Alebo s explicitným API kľúčom
api = MementoAPI(api_key="hx7GjATH8FtqljeQeoU24Oy495oCGi")

# Získať zoznam knižníc
libraries = api.get_libraries()

# Získať štruktúru knižnice
structure = api.get_library_structure('Tt4pxN4xQ')

# Nájsť knižnicu podľa názvu
library = api.find_library_by_name('Denný report')

# Získať entries
entries = api.get_entries('Tt4pxN4xQ', limit=100)

# Vytvoriť nový entry
fields = {
    10: "2025-10-03",  # Dátum
    15: "Test popis"    # Popis
}
new_entry = api.create_entry('Tt4pxN4xQ', fields)

# Aktualizovať entry
api.update_entry('Tt4pxN4xQ', 'entry_id', fields)

# Vymazať entry
api.delete_entry('Tt4pxN4xQ', 'entry_id')

# Helper funkcie
field_id = api.get_field_id_by_name('Tt4pxN4xQ', 'Dátum')
fields_map = api.get_fields_map('Tt4pxN4xQ')
api.print_library_structure('Tt4pxN4xQ')
```

## Environment Variables

### Prečo sú 2 .env súbory?

1. **Root .env** (`/home/rasto/memento-claude/.env`)
   - Pre nové skripty
   - Minimalistický
   - V .gitignore

2. **Config .env** (`/home/rasto/memento-claude/config/.env`)
   - Pre existujúce Python utilities
   - Obsahuje všetky library IDs
   - Telegram konfiguráciu
   - N8N konfiguráciu
   - V .gitignore

### Načítanie .env v Python skriptoch

**Problém:** Python-dotenv môže čítať nesprávny .env súbor.

**Riešenie:**

```python
import os
from pathlib import Path
from dotenv import load_dotenv

# Načítať z project root
script_dir = Path(__file__).parent
project_root = script_dir.parent
env_file = project_root / '.env'
if env_file.exists():
    load_dotenv(env_file)
else:
    load_dotenv()  # fallback

# Alebo explicitná cesta
load_dotenv('/home/rasto/memento-claude/config/.env')
```

**Alternatíva - export v shell:**
```bash
export MEMENTO_API_KEY=hx7GjATH8FtqljeQeoU24Oy495oCGi
python3 script.py
```

## Knižnica "Denný report"

### Základné informácie

- **Názov:** Denný report
- **ID:** `Tt4pxN4xQ`
- **Owner:** rasto
- **Vytvorená:** 2025-10-03T10:47:42.572Z
- **Config key:** `dailyReport`

### Polia (Fields)

| ID | Názov | Typ | Poznámka |
|----|-------|-----|----------|
| 10 | Dátum | date | Hlavný dátum záznamu |
| 11 | Dochádzka | entries | Link na Dochádzka |
| 14 | Záznam prác | entries | Link na Záznam prác |
| 12 | Kniha jázd | entries | Link na Kniha jázd |
| 13 | Pokladňa | entries | Link na Pokladňa |
| 15 | Popis | richtext | Textový popis |
| 0 | Debug_Log | richtext | Systémové |
| 1 | Error_Log | richtext | Systémové |
| 2 | info | richtext | Systémové |
| 3 | ID | int | role: name |
| 6 | zapísal | user | |
| 4 | dátum zápisu | date | |
| 7 | upravil | user | |
| 5 | dátum úpravy | date | |
| 8 | farba záznamu | color | |
| 9 | farba pozadia | color | |

### Prístup cez MementoConfig

```javascript
// V Memento Database skriptoch
var config = MementoConfig.getConfig();

// Názov knižnice
var libraryName = config.libraries.dailyReport; // "Denný report"

// ID knižnice
var libraryId = config.libraryIds.dailyReport; // "Tt4pxN4xQ"

// Polia
var dateField = config.fields.dailyReport.date; // "Dátum"
var attendanceField = config.fields.dailyReport.attendance; // "Dochádzka"
var workRecordField = config.fields.dailyReport.workRecord; // "Záznam prác"
var rideLogField = config.fields.dailyReport.rideLog; // "Kniha jázd"
var cashBookField = config.fields.dailyReport.cashBook; // "Pokladňa"
var descriptionField = config.fields.dailyReport.description; // "Popis"
```

## Troubleshooting

### Problem: 401 Unauthorized

**Symptóm:**
```
requests.exceptions.HTTPError: 401 Client Error: Unauthorized
```

**Možné príčiny:**
1. Token nie je v URL parametri (najčastejšie!)
2. Nesprávny API kľúč
3. Vypršal API kľúč
4. Čítate starý .env súbor

**Riešenie:**
```bash
# Overenie aktuálneho kľúča
echo $MEMENTO_API_KEY

# Nastavenie správneho kľúča
export MEMENTO_API_KEY=hx7GjATH8FtqljeQeoU24Oy495oCGi

# Test cez curl
curl "https://api.mementodatabase.com/v1/libraries?token=$MEMENTO_API_KEY" | python3 -m json.tool
```

### Problem: Číta starý API kľúč

**Príčina:** Python-dotenv cache alebo nesprávna cesta k .env

**Riešenie:**
```bash
# 1. Export v shell
export MEMENTO_API_KEY=hx7GjATH8FtqljeQeoU24Oy495oCGi
python3 script.py

# 2. Explicitná cesta v kóde
load_dotenv('/home/rasto/memento-claude/config/.env')

# 3. Skontroluj ktorý .env sa načítava
python3 -c "from dotenv import load_dotenv, find_dotenv; print(find_dotenv())"
```

## Príklady použitia

### Získať všetky knižnice a nájsť konkrétnu

```python
from memento_api_simple import MementoAPI

api = MementoAPI()

# Všetky knižnice
libraries = api.get_libraries()
for lib in libraries:
    print(f"{lib['name']:40s} - {lib['id']}")

# Konkrétna knižnica
daily_report = api.find_library_by_name("Denný report")
if daily_report:
    print(f"Našiel som: {daily_report['id']}")
    api.print_library_structure(daily_report['id'])
```

### Vytvoriť nový záznam v Denný report

```python
from memento_api_simple import MementoAPI
from datetime import datetime

api = MementoAPI()

# Získať mapu polí
fields_map = api.get_fields_map('Tt4pxN4xQ')
print("Dostupné polia:", fields_map)

# Vytvoriť nový entry
today = datetime.now().strftime('%Y-%m-%d')
fields = {
    fields_map['Dátum']: today,
    fields_map['Popis']: "Testovací záznam z Python API"
}

new_entry = api.create_entry('Tt4pxN4xQ', fields)
print(f"Vytvorený entry ID: {new_entry.get('id')}")
```

### Export dát z knižnice

```python
from memento_api_simple import MementoAPI
import json

api = MementoAPI()

# Získať všetky entries (po dávkach kvôli limitu)
all_entries = []
offset = 0
limit = 100

while True:
    entries = api.get_entries('Tt4pxN4xQ', limit=limit, offset=offset)
    if not entries:
        break
    all_entries.extend(entries)
    offset += limit

# Uložiť do JSON
with open('denny_report_export.json', 'w', encoding='utf-8') as f:
    json.dump(all_entries, f, ensure_ascii=False, indent=2)

print(f"Exportovaných {len(all_entries)} záznamov")
```

## Best Practices

1. **Vždy používaj token v URL parametri**, nie v hlavičke
2. **Používaj export pre API key** namiesto hardcoded hodnôt
3. **Kontroluj rate limiting** (10 requests/min pre Memento Cloud API)
4. **Loguj všetky API requesty** pre debugging
5. **Používaj .env súbory** pre konfiguráciu, nikdy necommituj API keys
6. **Testuj najprv cez curl** pred písaním Python kódu
7. **Používaj field IDs** nie field names pri vytváraní/úprave entries

## Ďalšie zdroje

- **API Dokumentácia:** https://mementodatabase.docs.apiary.io/
- **MementoConfig:** `/home/rasto/memento-claude/core/MementoConfig7.js`
- **Python utilities:** `/home/rasto/memento-claude/python-utilities/`
- **Environment config:** `/home/rasto/memento-claude/config/.env`

---

**Posledná aktualizácia:** 2025-10-03
**Verzia MementoConfig:** 7.0.8
