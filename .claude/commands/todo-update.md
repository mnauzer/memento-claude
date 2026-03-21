---
description: Aktualizuj polia existujúceho TODO tasku (priorita, status, odhad, deadline)
---

Aktualizuj existujúci TODO task podľa zadaného ID a polí.

## Parsovanie argumentov

Z textu po `/todo-update` extrahuj:
- **ID** — povinné, formát `TODO-YYYYMMDD-NNN`
- `--priority P1/P2/P3` — zmena priority
- `--status open/in-progress/blocked/done/cancelled` — zmena statusu
- `--estimate 3h / 2d` — časový odhad
- `--due YYYY-MM-DD` — deadline
- `--category Feature/Bug/Refactor/Documentation/Infrastructure`

## Postup

1. **Nájdi TODO** — prehľadaj všetky `TODO.md` súbory, nájdi blok s daným ID
2. **Ak nenájdené** → `❌ TODO-ID nenájdené. Skontroluj ID cez /todo-list.`
3. **Aktualizuj** príslušné polia v markdown bloku
4. **Aktualizuj timestamp** — pridaj/uprav riadok `**Updated:** YYYY-MM-DD HH:MM`
5. **Ulož súbor**
6. **Commitni** — `git commit -m "todo: update TODO-YYYYMMDD-NNN - [čo sa zmenilo]"`
7. **Potvrď** zmeny užívateľovi

## Status → ikona mapovanie

| Status | Ikona |
|--------|-------|
| open | 🔴 Open |
| in-progress | 🟡 In Progress |
| blocked | 🔵 Blocked |
| done | 🟢 Done |
| cancelled | ⚫ Cancelled |

## Potvrdenie

```
✅ TODO-20260321-001 aktualizovaný

Zmeny:
  Priority:  P2 → P1
  Status:    Open → In Progress
  Estimate:  (nový) 3h

Súbor: libraries/dochadzka/TODO.md
```

## Príklady

```
/todo-update TODO-20260321-001 --priority P1
/todo-update TODO-20260321-001 --status in-progress
/todo-update TODO-20260321-001 --estimate 5h --due 2026-03-25
/todo-update TODO-20260321-001 --priority P1 --status in-progress --estimate 3h
```
