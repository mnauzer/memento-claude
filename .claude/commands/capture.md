---
description: Zachyť nový TODO task do správneho TODO.md súboru s automatickým ID a git commitom
---

Zachyť nový TODO task. Ak argumenty nie sú poskytnuté, opýtaj sa na ne.

## Vstupné informácie (z argumentov alebo interaktívne)

Zisti tieto údaje:
- **Popis úlohy** — čo treba urobiť (konkrétne a akčné)
- **Knižnica** — ktorej oblasti sa to týka (alebo "global" / "core" / "modules")
- **Priorita** — P1 (urgent+dôležité) / P2 (dôležité, default) / P3 (nice-to-have)
- **Kategória** — Feature / Bug / Refactor / Documentation / Infrastructure

## Mapovanie knižníc na adresáre

| Užívateľ hovorí | Adresár | Súbor |
|---|---|---|
| global, projekt, cross-cutting | (root) | `TODO.md` |
| core, jadro | `core/` | `core/TODO.md` |
| modules, moduly | `modules/` | `modules/TODO.md` |
| dochadzka, dochádzka, attendance | `libraries/dochadzka/` | `libraries/dochadzka/TODO.md` |
| kniha-jazd, kniha jázd | `libraries/kniha-jazd/` | `libraries/kniha-jazd/TODO.md` |
| material, materiál | `libraries/material/` | `libraries/material/TODO.md` |
| pokladna, pokladňa | `libraries/pokladna/` | `libraries/pokladna/TODO.md` |
| zamestnanci, zamestnanec | `libraries/zamestnanci/` | `libraries/zamestnanci/TODO.md` |
| zakazky, zákazky | `libraries/zakazky/` | `libraries/zakazky/TODO.md` |
| zaznam-prac, záznam prác | `libraries/zaznam-prac/` | `libraries/zaznam-prac/TODO.md` |
| denny-report, denný report | `libraries/denny-report/` | `libraries/denny-report/TODO.md` |
| cenove-ponuky, cenové ponuky | `libraries/cenove-ponuky/` | `libraries/cenove-ponuky/TODO.md` |
| miesta | `libraries/miesta/` | `libraries/miesta/TODO.md` |

## Generovanie ID

Formát: `TODO-YYYYMMDD-NNN` (dnešný dátum + sekvenčné číslo)

1. Prečítaj všetky TODO.md súbory — nájdi najvyšší NNN pre dnešný dátum
2. Inkrement: ak TODO-20260321-002 existuje → nové ID je TODO-20260321-003
3. Ak dnes žiadne TODO → začni od 001

## Formát záznamu

```markdown
## [P2] Popis úlohy (TODO-YYYYMMDD-NNN)

**Status:** 🔴 Open
**Priority:** P2 (Medium)
**Category:** Feature
**Library:** dochadzka
**Created:** YYYY-MM-DD HH:MM

### Description
Konkrétny popis čo treba urobiť.

### Acceptance Criteria
- [ ] Kritérium 1
- [ ] Kritérium 2

---
```

## Auto-detekcia priority

- Zmieni P1 ak užívateľ spomína: "urgentné", "kritické", "blokuje", "deadline", "bug"
- Zmení P3 ak hovorí: "nice to have", "budúcnosť", "možno", "nápad"
- Default: P2

## Po vytvorení

1. Pridaj záznam do správneho TODO.md (zachovaj existujúce záznamy)
2. Ak súbor neexistuje — vytvor ho so základnou hlavičkou
3. Commitni: `git commit -m "todo: add TODO-YYYYMMDD-NNN - [krátky popis]"`
4. Potvrď užívateľovi: ID, súbor, priorita

## Príklady spustenia

```
/capture Dochádzka: Pridať validáciu TIME polí pri ukladaní
/capture global: Aktualizovať MementoConfig pre nové polia zákaziek P1
/capture Bug: GPS súradnice sa neukladajú v Kniha jázd
```
