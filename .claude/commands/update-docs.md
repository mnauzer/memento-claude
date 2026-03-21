---
description: Aktualizuj PROJECT_MAP.md a ďalšiu dokumentáciu po zmenách súborov
---

Aktualizuj projektovú dokumentáciu po vykonaných zmenách súborov.

## Krok 1: Zisti zmenené súbory

Ak užívateľ neuviedol konkrétne zmeny, spusti:
```bash
git status
git diff --name-only HEAD
```

Identifikuj:
- Nové súbory (pridané)
- Premenované/presunuté súbory
- Zmazané súbory
- Súbory so zmenenou verziou

## Krok 2: Aktualizuj PROJECT_MAP.md

Prečítaj aktuálny `PROJECT_MAP.md` a vykonaj zmeny:

**Pre nový súbor:** Pridaj záznam do príslušnej sekcie:
- Core moduly → sekcia "Core Modules"
- Library scripty → sekcia príslušnej knižnice
- Utils → sekcia "Utilities"
- Docs → sekcia "Documentation"

**Formát záznamu:**
```
| NázovSúboru.js | v1.0 | Stručný popis účelu |
```

**Vždy aktualizuj:**
- Timestamp: `**Posledná aktualizácia:** YYYY-MM-DD HH:MM`
- Celkový počet súborov (ak sa zmenil)

## Krok 3: Skontroluj ďalšiu dokumentáciu

Podľa typu zmeny skontroluj či treba aktualizovať:

| Zmena | Dokument | Čo aktualizovať |
|-------|----------|-----------------|
| Nová skratka knižnice | `MEMENTO_NAMING_CONVENTION.md` | Tabuľka skratiek |
| Nová knižnica/adresár | `CLAUDE.md` Navigation Guide | Tabuľka knižníc |
| Nový core modul | `docs/CORE_MODULES_DOCUMENTATION.md` | API dokumentácia |
| Nová core funkcia | `docs/CORE_MODULES_QUICK_REFERENCE.md` | Quick reference |
| Zmena závislostí | `CLAUDE.md` | Dependency chain |

## Krok 4: Potvrď zmeny

Vypíš stručný súhrn vykonaných aktualizácií dokumentácie:
```
✅ PROJECT_MAP.md — pridaný záznam: [súbor] v sekcii [sekcia]
✅ Timestamp aktualizovaný: [dátum]
✅ Počet súborov: [starý] → [nový]
[ďalšie aktualizácie ak relevantné]
```
