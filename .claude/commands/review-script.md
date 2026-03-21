---
description: Skontroluj Memento script voči best practices checklistu a navrhni opravy
---

Prečítaj a skontroluj poskytnutý Memento Database script. Ak užívateľ neposkytol kód, opýtaj sa naň alebo na cestu k súboru.

## Checklist kontroly

Vyhodnoť každú kategóriu a označ zistenia podľa závažnosti:
- 🔴 **Kritické** — script nebude fungovať alebo spôsobí dátovú chybu
- 🟡 **Varovanie** — potenciálny problém, odporúča sa opraviť
- 🟢 **Odporúčanie** — zlepšenie kvality a udržiavateľnosti

### 1. Naming Convention
- [ ] Názov súboru vo formáte `[Skratka].[Typ].[Názov].js`
- [ ] Správna skratka knižnice (Doch, Zak, Pokl, Mat, Knij, Zam...)
- [ ] Správny typ (Calc, Action, Trigger, BulkAction, Button, Notif)
- [ ] Verzia len v hlavičke, nie v názve súboru

### 2. Hlavička scriptu
- [ ] Vyplnená Knižnica, Názov, Typ, Verzia
- [ ] CHANGELOG sekcia s históriou zmien
- [ ] Zoznam závislostí (required modules)

### 3. MementoConfig — žiadne hardcoded názvy polí
- [ ] Všetky názvy polí cez `config.fields.{library}.{field}`
- [ ] Názvy knižníc cez `config.libraries.{library}`
- [ ] Ikony cez `config.icons.{icon}`

### 4. Dependency chain
- [ ] MementoUtils (alebo MementoCore) importovaný na začiatku
- [ ] `utils.checkDependencies()` pred hlavnou logikou
- [ ] MementoTelegram importovaný priamo (nie cez utils)
- [ ] Správne poradie load order (Config → Core → Utilities → Business → Utils)

### 5. Safe Field Access
- [ ] Používa `utils.safeGetField()` nie priamo `entry.field()`
- [ ] Defaultné hodnoty pre chýbajúce polia
- [ ] LinkToEntry cez `utils.safeGetLinks()`

### 6. Logging
- [ ] Debug logging: `utils.addDebug(entry, message, phase)`
- [ ] Error logging: `utils.addError(entry, message, context, error)`
- [ ] Info/výsledky: `utils.addInfo(entry, message, data, meta)`
- [ ] Staré logy vyčistené pred zápisom nových

### 7. User Communication
- [ ] `message()` len pre krátke 1-2 riadkové správy (zmizne po 2 sekundách)
- [ ] `dialog()` pre výsledky výpočtov, zoznamy, dlhé správy
- [ ] Texty v slovenčine

### 8. Error Handling
- [ ] Celá logika obalená v `try/catch`
- [ ] Chyby logované cez `utils.addError()`
- [ ] Zmysluplné chybové hlásenia pre užívateľa

### 9. Špeciálne opravy (Memento-specific)
- [ ] TIME polia: extrakcia lokálneho času z Date objektu (nie UTC)
- [ ] `lib().title` (property), nie `lib().name()` ani `lib().title()`
- [ ] Foreign keys: `entry.id`, nie `entry.field('ID')`
- [ ] LinkToEntry iterácia: `.length` + `[i]`, nie Array metódy

## Výstup správy

Štruktúruj výstup takto:

```
## Review: [NázovScriptu]

### 🔴 Kritické problémy
[zoznam s konkrétnou líniou kódu a navrhnutou opravou]

### 🟡 Varovania
[zoznam s vysvetlením a odporúčanou opravou]

### 🟢 Odporúčania
[zoznam dobrovoľných zlepšení]

### ✅ Celkové hodnotenie
[stručné zhrnutie: pripravený na deployment / potrebuje opravy]
```

Pre každý nález uveď:
1. Čo je problém (konkrétny kód)
2. Prečo je to problém
3. Ako to opraviť (ukážka správneho kódu)
