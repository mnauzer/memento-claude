---
description: Vygeneruj nový Memento Database script podľa naming konvencie a šablóny
---

Potrebujem vytvoriť nový Memento Database script. Postupuj nasledovne:

## Krok 1: Zisti požiadavky

Ak ich užívateľ neposkytol, opýtaj sa na:
- **Knižnica** - pre ktorú knižnicu (napr. Dochádzka, Zákazky, Pokladňa...)
- **Typ scriptu** - Calc / Action / Trigger / BulkAction / Button / Notif
- **Funkčnosť** - čo má script robiť (validácia, výpočet, notifikácia...)
- **Polia** - aké polia budú potrebné

## Krok 2: Over štruktúru knižnice cez MCP

Pred kódovaním VŽDY over aktuálnu štruktúru knižnice:
- Zoznam polí s presnými názvami a typmi
- Library ID
- Vzťahy (linkToEntry) na iné knižnice

Použiť MCP nástroje ak sú dostupné, inak upozorniť užívateľa aby overil polia ručne.

## Krok 3: Vygeneruj script

Postupuj podľa `templates/Template-Script.js` a týchto pravidiel:

**Naming convention:** `[Skratka].[Typ].[Názov].js`
- Dochádzka → Doch, Zákazky → Zak, Pokladňa → Pokl, Zamestnanec → Zam
- Príklad: `Doch.Calc.Main.js`, `Zak.Action.SendNotification.js`

**Povinné časti scriptu:**
1. Hlavička (knižnica, názov, typ, verzia, závislosti)
2. Module initialization — import MementoUtils
3. Script config — `utils.createScriptConfig()`
4. Dependency validation — `utils.checkDependencies()`
5. Input validation — povinné polia
6. Main logic — business logika
7. Cleanup & logging — Debug_Log, Error_Log, info polia
8. Error handling — try/catch s logovaním

**Kritické pravidlá:**
- NIKDY nepoužívaj hardcoded názvy polí — vždy `config.fields.{library}.{field}`
- Používaj safe accessors: `utils.safeGetField(entry, fieldName, default)`
- Pre dlhé správy: `dialog()` nie `message()` (message zobrazuje len 2 riadky)
- MementoTelegram importuj priamo: `var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;`

## Krok 4: Aktualizuj dokumentáciu

Po vytvorení scriptu:
- Pridaj záznam do `PROJECT_MAP.md` (príslušná sekcia, verzia, účel)
- Aktualizuj timestamp a počet súborov v PROJECT_MAP.md
- Ak nová skratka knižnice → pridaj do `MEMENTO_NAMING_CONVENTION.md`

## Výstup

1. Kompletný kód scriptu pripravený na skopírovanie do Memento Database
2. Presný názov súboru podľa konvencie
3. Zoznam závislostí (aké core moduly musia byť načítané pred týmto scriptom)
4. Stručný popis použitia
