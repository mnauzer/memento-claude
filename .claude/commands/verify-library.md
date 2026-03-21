---
description: Over štruktúru Memento knižnice cez MCP pred kódovaním scriptu
---

Over aktuálnu štruktúru zadanej Memento Database knižnice pred začatím kódovania.

## Krok 1: Identifikuj knižnicu

Ak užívateľ neposkytol názov knižnice, opýtaj sa: "Pre ktorú knižnicu chceš overiť štruktúru?"

## Krok 2: Získaj štruktúru cez MCP

Použi dostupné MCP nástroje na získanie:
- Presné názvy všetkých polí (case-sensitive, vrátane slovenských znakov)
- Typy polí (TEXT, NUMBER, DATE, TIME, LINKTOENTRY, CHECKBOX, ...)
- Library ID
- Vzťahy (linkToEntry) — na ktoré knižnice odkazujú polia

Ak MCP nie je dostupný, upozorni užívateľa:
> ⚠️ MCP nie je dostupný. Overte polia manuálne v Memento Database alebo cez `python memento_api_simple.py --library "[Názov]" --structure`

## Krok 3: Porovnaj s MementoConfig

Prečítaj `core/MementoConfig.js` a porovnaj sekciu `fields.{library}`:
- Označí polia ktoré sú v MementoConfig ale nie v aktuálnej štruktúre (zastaraté)
- Označí polia ktoré sú v knižnici ale chýbajú v MementoConfig (nové/nedokumentované)
- Upozorni na nezhodné názvy (napr. preklepy, zmenené mená)

## Krok 4: Výstup

Vráť štruktúrovaný prehľad:

```
## Knižnica: [Názov knižnice]
**Library ID:** [ID]
**Overené:** [dátum a čas]

### Polia
| Názov poľa | Typ | MementoConfig kľúč | Status |
|-----------|-----|-------------------|--------|
| Dátum | DATE | fields.attendance.date | ✅ OK |
| Zamestnanec | LINKTOENTRY | fields.attendance.employee | ✅ OK |
| Nové pole | TEXT | — | ⚠️ Chýba v Config |

### Zistenia
[zoznam nezhodov ak existujú]

### Záver
✅ Knižnica overená — bezpečné kódovanie
ALEBO
⚠️ Pred kódovaním aktualizuj MementoConfig o chýbajúce polia
```

## Krok 5: Ak sú nezhodné polia

Navrhni aktualizáciu `core/MementoConfig.js` — pridaj chýbajúce polia do príslušnej sekcie `fields.{library}` s popisným kľúčom podľa existujúceho vzoru.
