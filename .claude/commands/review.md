---
description: Zobraz prehľad TODO taskov pre konkrétnu knižnicu alebo celý projekt s odporúčaniami
---

Prehľad TODO taskov pre knižnicu alebo celý projekt.

## Parsovanie argumentov

Z textu po `/review` extrahuj:
- Názov knižnice (napr. `dochadzka`, `zakazky`, `kniha-jazd`) → review konkrétnej knižnice
- `global` → review globálnych taskov (TODO.md)
- Bez argumentu → prehľad VŠETKÝCH knižníc

## Výstupný formát

```
📊 Review: Dochádzka
════════════════════════════════════════

🔴 Otvorené (3)
  TODO-20260321-001  [P1]  Validácia TIME polí           (1 deň)
  TODO-20260319-005  [P2]  Refactor Doch.Calc.Main.js    (3 dni)
  TODO-20260315-002  [P2]  Pridať podporu pre přesčasy   (7 dní) ⚠️ Stale

🟡 In Progress (1)
  TODO-20260320-008  [P1]  Opraviť výpočet mzdy

🔵 Blocked (1)
  TODO-20260318-003  [P2]  Telegram notifikácie  ← čaká na TODO-20260320-007

────────────────────────────────────────
Štatistiky:
  Celkom open: 3  |  P1: 1  |  Stale (>7d): 1
  Najstarší task: 7 dní (TODO-20260315-002)

💡 Odporúčania:
  ⚠️ 1 stale task — zvažuj presunutie do BACKLOG.md
  ✅ P1 tasky sú aktuálne (< 3 dni)
```

## Pre review všetkých knižníc (bez argumentu)

Zobraz súhrnnú tabuľku:

```
📊 Celkový prehľad projektu
════════════════════════════════════════

Knižnica          Open  P1  In Progress  Blocked  Stale
──────────────────────────────────────────────────────
Global               2   1            0        0      0
Dochádzka            3   1            1        1      1
Zákazky              1   0            1        0      0
Kniha jázd           0   0            0        0      0
Core                 2   1            0        0      1
──────────────────────────────────────────────────────
CELKOM               8   3            2        1      2

⚠️ Pozornosť: 3 P1 tasky, 2 stale tasky
```

## Detekcia stale taskov

Task je **stale** ak:
- Status je "Open" alebo "Blocked"
- Created dátum je starší ako 7 dní

## Odporúčania (generuj automaticky)

- Ak stale P3 tasky → "Zvažuj presun do BACKLOG.md"
- Ak >5 P1 taskov → "Príliš veľa P1 — niektoré by mali byť P2"
- Ak P1 task je starší ako 3 dni → "Urgentný task čaká — prioritizuj!"
- Ak žiadne P1 → "✅ Žiadne urgentné tasky"

## Príklady

```
/review
/review dochadzka
/review global
/review zakazky
```
