# Dizajn: Validácia názvov polí pri vývoji

**Dátum:** 2026-03-21
**Stav:** Implementované

## Motivácia

V Memento Database je názov poľa zároveň label aj "premenná" — niet labels oddelenej od interného kľúča.
To spôsobuje tri typy tichých chýb:

1. **Preklep v kóde** — `"Degug_log"` namiesto `"Debug_Log"` → `entry.field()` vráti null bez chyby
2. **Premenovanie v Memento** — pole sa premenuje v UI, kód zostane starý → tichá chyba
3. **Konflikt s oddeľovačom** — pasívny prvok `"--- Dochádzka ---"` a pole s rovnakým názvom → script nerozlíši

## Zvolené riešenie: Pre-deploy Python validátor

Python skript `python-utilities/validate_fields.py` beží **pri vývoji**, nie v Memento.

**Výhody:**
- Nulová réžia v Memento runtime
- Porovnáva oproti `fields.json` (zdroj pravdy z API)
- Fuzzy matching navrhuje opravy preklepov
- Automaticky spúšťaný cez Claude Code hook po každom `Write`/`Edit`

## Konvencia v moduloch

Každý modul deklaruje svoju knižnicu v `MODULE_INFO`:

```javascript
var MODULE_INFO = {
    name: "Zamestnanci",
    version: "1.8.0",
    library: "zamestnanci",                    // → libraries/zamestnanci/fields.json
    externalLibraries: ["sadzby-zamestnancov"] // → libraries/sadzby-zamestnancov/fields.json
};
```

- `library` — primárna knižnica modulu (alebo `null` pre utility moduly)
- `externalLibraries` — cudzie knižnice ku ktorým modul pristupuje

## Konvencia FIELDS / EXTERNAL konštánt

```javascript
var FIELDS = {
    hourlyRate: "Aktuálna hodinovka",  // ID:42 — primárna knižnica
    workedTime: "Odpracované"          // ID:31
};

var EXTERNAL = {
    telegramBotApiKey: "Telegram Bot API Key"  // ID:16 — asistanto-defaults
};
```

- `FIELDS` — polia primárnej knižnice
- `EXTERNAL` — polia externých knižníc

## Ako funguje validátor

```
validate_fields.py
  ↓ Nájde všetky moduly s library: "xxx" v MODULE_INFO
  ↓ Extrahuje string hodnoty z FIELDS / EXTERNAL blokov (regex)
  ↓ Načíta libraries/{library}/fields.json
  ↓ Porovná každý string: je v fields.json?
  ↓ Ak nie → hlási chybu + navrhne fuzzy match opravu
```

**Príklad výstupu:**
```
✅ modules/Zamestnanci.js  [zamestnanci]
❌ modules/SomeModule.js  [dochadzka]
   ❌ FIELDS['debugLog'] = "Degug_Log" — nie je v dochadzka/fields.json
      → Možno: "Debug_Log"?

Skontrolovaných: 2  |  Preskočených: 14
Chýb:     1
✅ Všetky polia OK / ❌ VALIDÁCIA ZLYHALA
```

## Integrácia s Claude Code

Hook v `.claude/settings.local.json` spúšťa validátor po každom `Write` alebo `Edit`:

```json
{
  "matcher": "Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "python 'X:/claude/projects/memento-claude/python-utilities/validate_fields.py'"
  }]
}
```

Ak validátor nájde chybu → výstup sa zobrazí Claude Code → oprava ešte pred ďalším krokom.

## Workflow pre pridanie nového modulu

1. Vytvor `libraries/{kniznica}/fields.json` (ak neexistuje) pomocou API
2. Definuj `FIELDS` konštantu s hodnotami z `fields.json`
3. Nastav `library: "{kniznica}"` v `MODULE_INFO`
4. Validátor automaticky overí pri Write/Edit

## Workflow pri premenovanie poľa v Memento

1. Premenuj pole v Memento UI
2. Spusti API skript na obnovu `fields.json`:
   ```bash
   python python-utilities/generate_library_fields.py "{názov knižnice}"
   ```
3. Validátor nahlási chybu v starých FIELDS konštantách
4. Oprav konštantu → validátor potvrdí OK

## Súbory

| Súbor | Účel |
|-------|------|
| `python-utilities/validate_fields.py` | Validačný skript |
| `libraries/*/fields.json` | Zdroj pravdy (z API) |
| `.claude/settings.local.json` | Hook konfigurácia |
| `modules/Zamestnanci.js` | Referenčná implementácia (FIELDS + MODULE_INFO.library) |
