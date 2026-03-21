---
description: Vytvor denný plán podľa Ivy Lee metódy — vyber top 6 taskov a naplánuj časové bloky
---

Vytvor denný pracovný plán podľa Ivy Lee metódy (6 najdôležitejších taskov).

## Krok 1: Zozbieraj kandidátov

Prehľadaj všetky TODO.md — zozbieraj všetky Open + In Progress tasky, zoradené:
1. P1 tasky (podľa veku — najstaršie prvé)
2. P2 tasky In Progress
3. P2 tasky Open (podľa veku)
4. P3 tasky (len ak žiadne P1/P2)

## Krok 2: Vyber top 6

Navrhni 6 taskov. Uprednostni:
- P1 tasky vždy
- In Progress pred Open (dokončiť rozrobenú prácu)
- Staršie tasky pred novými rovnakej priority
- Tasky bez závislostí pred blokovanými

## Krok 3: Vygeneruj plán

Zobraz a ulož do `docs/planning/DAILY_PLAN.md`:

```markdown
# Denný plán — YYYY-MM-DD (Pondelok)

**Vytvorený:** YYYY-MM-DD HH:MM
**Metóda:** Ivy Lee (6 taskov, sekvenčne)

## Top 6 taskov (v poradí dôležitosti)

### 1. [P1] Validácia TIME polí pri ukladaní
**TODO:** TODO-20260321-001 | **Knižnica:** dochadzka | **Odhad:** 2h
**Čas:** 08:00 – 10:00
Popis: Opraviť timezone bug pri ukladaní TIME polí.

### 2. [P1] Opraviť výpočet mzdy
**TODO:** TODO-20260320-008 | **Knižnica:** dochadzka | **Odhad:** 1h
**Čas:** 10:00 – 11:00

### 3. [P2] Refactor Doch.Calc.Main.js
**TODO:** TODO-20260319-005 | **Knižnica:** dochadzka | **Odhad:** 3h
**Čas:** 11:00 – 14:00

### 4. [P2] GPS validácia súradníc
**TODO:** TODO-20260321-003 | **Knižnica:** kniha-jazd | **Odhad:** 2h
**Čas:** 14:00 – 16:00

### 5. [P2] Aktualizovať MementoConfig
**TODO:** TODO-20260320-007 | **Knižnica:** core | **Odhad:** 1h
**Čas:** 16:00 – 17:00

### 6. [P2] Bulk update cien materiálu
**TODO:** TODO-20260318-009 | **Knižnica:** material | **Odhad:** 1h
**Čas:** 17:00 – 18:00

---

## Pravidlá (Ivy Lee)
1. Pracuj na úlohe #1 kým nie je hotová
2. Potom prejdi na #2, #3, ...
3. Nedokončené prenesie do zajtrajška

## End-of-day review
- [ ] #1 dokončená?
- [ ] #2 dokončená?
- [ ] #3 dokončená?
- [ ] #4 dokončená?
- [ ] #5 dokončená?
- [ ] #6 dokončená?

**Zajtra:** Nedokončené tasky pridaj na začiatok zajtrajšieho plánu.
```

## Krok 4: Commitni

```
git commit -m "todo: daily plan YYYY-MM-DD - [X] tasks planned"
```

## Krok 5: Opýtaj sa

"Súhlasíš s týmto poradím? Chceš niečo zmeniť alebo pridať?"
