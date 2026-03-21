---
description: Označ TODO task ako dokončený, archivuj ho do COMPLETED.md a commitni do gitu
---

Dokončenie TODO tasku — aktualizuje status, presunie do archívu, skontroluje závislosti.

## Vstup

Z textu po `/complete` extrahuj TODO ID (formát `TODO-YYYYMMDD-NNN`).
Ak ID chýba: `❌ Zadaj ID tasku. Príklad: /complete TODO-20260321-001`

## Postup

### 1. Nájdi TODO
Prehľadaj všetky `TODO.md` súbory. Ak nenájdené → chybová správa.

### 2. Aktualizuj status v pôvodnom súbore
Zmeň:
```
**Status:** 🔴 Open
→
**Status:** 🟢 Done
**Completed:** YYYY-MM-DD HH:MM
```

### 3. Presuň do COMPLETED.md
Pridaj celý blok (od `## [P...]` po `---`) do `docs/planning/COMPLETED.md`.
Zachovaj chronologické poradie (novšie hore).

### 4. Vymaž z pôvodného TODO.md
Odstráň celý blok tasku (od `## [P...]` po `---`).

### 5. Skontroluj závislosti
Prehľadaj všetky TODO.md — nájdi tasky kde `Depends on: [dokončené ID]`.
Ak nájdené → informuj užívateľa: `⚠️ TODO-X čakal na tento task — skontroluj či môžeš začať.`

### 6. Commitni
```
git commit -m "todo: complete TODO-YYYYMMDD-NNN - [krátky popis tasku]"
```

### 7. Potvrdenie

```
✅ TODO-20260321-001 dokončený!

Task: Validácia TIME polí pri ukladaní
Knižnica: dochadzka
Archivovaný: docs/planning/COMPLETED.md

⚠️ Odblokovaný task: TODO-20260320-008 (čakal na tento)
```

## Príklad

```
/complete TODO-20260321-001
/complete TODO-20260320-007
```
