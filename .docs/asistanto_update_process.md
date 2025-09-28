# ASISTANTO.JSON Update Process - Dokumentácia

## Prehľad

Automatizovaný proces pre aktualizáciu `asistanto.json` dokumentácie podľa skutočného stavu Memento Database systému. Zabezpečuje, že dokumentácia knižníc a polí je vždy aktuálna a zodpovedá reálnemu stavu databázy.

## Komponenty systému

### 1. asistanto_updater.py
Hlavný Python script pre aktualizáciu dokumentácie.

**Features:**
- Automatická verifikácia stavu všetkých knižníc cez API
- Porovnanie súčasnej dokumentácie s reálnym stavom
- Automatické zálohovanie pred zmenami
- Generovanie detailných reportov zmien
- Optimalizované API volania s cache systémom
- Support pre dry-run režim

**Použitie:**
```bash
# Kompletná aktualizácia všetkých knižníc
python3 asistanto_updater.py

# Náhľad zmien bez aplikovania
python3 asistanto_updater.py --dry-run

# Aktualizácia konkrétnej knižnice
python3 asistanto_updater.py --library zNoMvrv8U

# S detailným reportom
python3 asistanto_updater.py --report
```

### 2. update_asistanto.sh
Bash wrapper script pre jednoduchšie spustenie.

**Použitie:**
```bash
# Kompletná aktualizácia
./update_asistanto.sh

# Dry run režim
./update_asistanto.sh dry-run

# Konkrétna knižnica
./update_asistanto.sh library zNoMvrv8U
```

### 3. Integrácia s existujúcimi komponentmi
- **field_verification_system.py** - Pre verifikáciu štruktúry polí
- **memento_api_client.py** - Pre API komunikáciu
- **MementoConfig7.js** - Pre synchronizáciu konfigurácie

## Architektúra procesu

### 1. AsistantoUpdater Class
```python
class AsistantoUpdater:
    def __init__(self, dry_run: bool = False)
    def create_backup() -> str
    def load_current_asistanto() -> Dict
    def verify_library_current_state(library_id: str) -> Dict
    def compare_library_states(current: Dict, verified: Dict) -> Dict
    def update_library_in_asistanto(data: Dict, lib_id: str, state: Dict) -> Dict
    def generate_change_report(changes: List[Dict]) -> str
```

### 2. Workflow procesu

#### Krok 1: Príprava
- Načítanie súčasného `asistanto.json`
- Vytvorenie záložného adresára
- Inicializácia API klienta a verification systému

#### Krok 2: Zber dát
- Získanie zoznamu všetkých knižníc
- Pre každú knižnicu:
  - Overenie cez API s využitím cache
  - Analýza štruktúry polí
  - Získanie metadát (revision, size, modified)

#### Krok 3: Porovnanie
- Porovnanie súčasnej dokumentácie s reálnym stavom
- Identifikácia zmien v:
  - Metadatách knižnice
  - Štruktúre polí (pridané/odobrané/modifikované)
  - Konfigurácii

#### Krok 4: Aktualizácia
- Vytvorenie zálohy (ak nie dry-run)
- Aplikovanie zmien do `asistanto.json`
- Aktualizácia metadát (timestamp, analyzed_libraries)

#### Krok 5: Report
- Generovanie detailného reportu zmien
- Uloženie reportu do `.reports/` adresára
- Výpis súhrnu na konzolu

## Optimalizácie

### 1. Cache systém
- Cache API odpovedí na 1 hodinu
- Uloženie do `.cache/library_{id}.json`
- Minimalizácia API volani

### 2. Rate limiting
- 0.5 sekundy pauza medzi knižnicami
- Respektovanie API limitov

### 3. Backup stratégia
- Automatické zálohy s timestamp
- Uloženie do `.backups/asistanto/`
- Zachovanie histórie zmien

## Štruktúra zmien

### Change Object
```python
{
    'library_id': 'zNoMvrv8U',
    'has_changes': True,
    'metadata_changes': {
        'revision': {'old': 8650, 'new': 8658},
        'modified': {'old': '2025-09-26', 'new': '2025-09-28'}
    },
    'field_changes': {
        'added': ['novePole'],
        'removed': ['starePole'],
        'modified': {
            'existujucePole': {
                'old': {'type': 'text'},
                'new': {'type': 'text', 'required': true}
            }
        }
    },
    'summary': [
        'revision: 8650 → 8658',
        'Added fields: novePole',
        'Modified fields: existujucePole'
    ]
}
```

## Automatizácia

### 1. Cron job setup
```bash
# Denná aktualizácia o 2:00
0 2 * * * cd /home/rasto/memento-claude && ./update_asistanto.sh > /tmp/asistanto_update.log 2>&1
```

### 2. GitHub integrácia
```bash
# Po aktualizácii commitnúť zmeny
./update_asistanto.sh
git add asistanto.json .reports/
git commit -m "docs: automated asistanto.json update $(date +%Y-%m-%d)"
git push origin main
```

### 3. Telegram notifikácie
```python
# V asistanto_updater.py môžeme pridať
def send_telegram_summary(changes: List[Dict]):
    if any(change.get('has_changes') for change in changes):
        # Poslať notifikáciu o zmenách
        pass
```

## Error handling

### 1. API chyby
- Timeout handling s retry logikou
- Fallback na cache ak API nie je dostupné
- Detailné error logging

### 2. File operácie
- Backup pred každou zmenou
- Atomic write operácie
- Permission checking

### 3. Data integrity
- JSON validácia pred uložením
- Checksum verification
- Rollback mechanizmus

## Monitoring a reporty

### 1. Report štruktúra
```
ASISTANTO.JSON UPDATE REPORT
================================
Generated: 2025-09-28 15:30:45
Mode: LIVE UPDATE

Total libraries checked: 181
Libraries with changes: 5
Libraries up to date: 176

CHANGES DETECTED:
-----------------------

Library: zNoMvrv8U
  • revision: 8650 → 8658
  • Added fields: novePole
  • Modified fields: existujucePole
```

### 2. Metriky
- Počet skontrolovaných knižníc
- Počet knižníc so zmenami
- Typ zmien (metadata vs fields)
- Čas vykonania procesu

## Integrácia s MementoConfig7.js

### 1. Automatická synchronizácia
Po aktualizácii `asistanto.json` môžeme automaticky aktualizovať aj `MementoConfig7.js`:

```python
def sync_memento_config(asistanto_data: Dict):
    """Synchronizuje zmeny do MementoConfig7.js"""
    # Update field mappings
    # Update library configurations
    # Validate JavaScript syntax
```

### 2. Field mapping update
```javascript
// Automaticky generované mappings
fields: {
    attendance: {
        employeeField: "Zamestnanci",
        dateField: "Dátum",
        // ... aktualizované podľa asistanto.json
    }
}
```

## Budúce rozšírenia

### 1. Incremental updates
- Iba zmeny od poslednej aktualizácie
- Delta synchronizácia
- Čiastočné aktualizácie

### 2. Validation system
- Schema validation pre nové polia
- Business rule checking
- Data consistency validation

### 3. Collaboration features
- Multi-user sync support
- Conflict resolution
- Change approval workflow

### 4. Analytics
- Usage statistics
- Change frequency analysis
- Field usage tracking

## Použitie v praxi

### 1. Každodenná údržba
```bash
# Ranná kontrola stavu
./update_asistanto.sh dry-run

# Ak sú zmeny, aplikovať
./update_asistanto.sh
```

### 2. Pred vytváraním scriptov
```bash
# Overiť najnovší stav konkrétnej knižnice
./update_asistanto.sh library zNoMvrv8U

# Potom použiť aktuálne field names v scripte
```

### 3. Troubleshooting
```bash
# Zobraziť detailný report
python3 asistanto_updater.py --dry-run --report

# Kontrola konkrétnej knižnice
python3 asistanto_updater.py --library problematicka_kniznica --report
```

## Záver

Automatizovaný proces aktualizácie `asistanto.json` zabezpečuje:

- **Aktuálnosť dokumentácie** - Vždy zodpovedá reálnemu stavu
- **Minimálne API volania** - Optimalizované s cache systémom
- **Bezpečnosť** - Zálohy pred každou zmenou
- **Transparentnosť** - Detailné reporty všetkých zmien
- **Automatizáciu** - Možnosť scheduled updates
- **Integráciu** - Prepojenie s existujúcimi komponentami

Tento systém tvorí základ pre spoľahlivú údržbu dokumentácie Memento Database systému a zabezpečuje, že všetky scripty a konfigurácie pracujú s aktuálnymi údajmi.