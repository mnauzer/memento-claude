---
description: Zobraz zoznam TODO taskov s voliteľnými filtrami (priorita, status, knižnica)
---

Zobraz TODO tasky zo všetkých alebo konkrétnych TODO.md súborov.

## Parsovanie argumentov

Z textu po `/todo-list` extrahuj filtre:
- `--priority P1` / `--priority P2` / `--priority P3`
- `--status open` / `--status in-progress` / `--status blocked` / `--status done`
- `--library dochadzka` (alebo iný názov knižnice)

Bez filtrov: zobraz všetky open + in-progress tasky.

## Kde hľadať

Prehľadaj tieto súbory:
- `TODO.md` (global)
- `core/TODO.md`
- `modules/TODO.md`
- `libraries/*/TODO.md` (všetky knižnice)

## Výstupný formát

```
📋 TODO Prehľad  [filter ak aplikovaný]
════════════════════════════════════════

🔴 P1 — Urgentné
  TODO-20260321-003  [dochadzka]   Validácia TIME polí pri ukladaní
  TODO-20260320-007  [global]      Aktualizovať MementoConfig

🟡 In Progress
  TODO-20260319-002  [zakazky]     Refactor Zak.Calc.Main.js

🔴 P2 — Otvorené
  TODO-20260321-001  [kniha-jazd]  GPS validácia súradníc
  TODO-20260318-009  [material]    Bulk update cien

🔵 Blocked
  TODO-20260317-004  [pokladna]    Platobný modul  ← čaká na TODO-20260320-007

────────────────────────────────────────
Celkom: 5 taskov  |  P1: 2  |  Najstarší: 4 dni
```

## Štatistiky (vždy zobraz)

- Celkový počet zobrazených taskov
- Počet P1
- Vek najstaršieho tasku (today - created_date)

## Ak sú filtre bez výsledkov

Vypíš: `✅ Žiadne tasky pre zadaný filter.`

## Príklady

```
/todo-list
/todo-list --priority P1
/todo-list --library dochadzka
/todo-list --status blocked
/todo-list --priority P2 --status open
```
