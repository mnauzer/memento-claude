---
description: Spusti týždenný GTD review — štatistiky, stale tasky, odporúčania, aktualizuj WEEKLY_REVIEW.md
---

Spusti kompletný týždenný GTD review procesom. Naplánuj každý piatok alebo v nedeľu večer.

## Krok 1: Zber štatistík

Prehľadaj všetky TODO.md a COMPLETED.md súbory a zozbieraj:

**Dokončené tento týždeň** (COMPLETED.md — záznamy posledných 7 dní):
- Počet dokončených taskov
- Počet zrušených taskov
- Velocity = dokončené / 7 dní

**Aktuálny stav** (všetky TODO.md):
- Open, In Progress, Blocked, Stale (>7 dní bez aktivity)
- Počet P1, P2, P3
- Per-library breakdown

## Krok 2: Identifikuj stale tasky

Stale = Open/Blocked task starší ako 7 dní. Pre každý stale task:
- Stále relevantný? → odporúč pridanie do sprintu
- Nízka priorita? → odporúč presun do BACKLOG.md
- Čaká na niečo? → odporúč označenie ako Blocked

## Krok 3: Generuj report

Ulož do `docs/planning/WEEKLY_REVIEW.md`:

```markdown
# Týždenný Review — Týždeň NN, YYYY

**Dátum:** YYYY-MM-DD
**Obdobie:** YYYY-MM-DD až YYYY-MM-DD

## Štatistiky

| Metrika | Hodnota |
|---------|---------|
| Dokončené | 8 taskov |
| Zrušené | 1 task |
| Velocity | 1.1 task/deň |
| Completion rate | 89% |
| Open teraz | 12 taskov |
| Stale (>7d) | 3 tasky |
| P1 open | 2 tasky |

## Dokončené tento týždeň
- ✅ TODO-20260318-001 — Refactor MementoTime.js
- ✅ TODO-20260319-003 — GPS validácia súradníc

## Stale tasky (vyžadujú pozornosť)
- ⚠️ TODO-20260314-002 [P3] dochadzka — 8 dní starý → odporúčam BACKLOG
- ⚠️ TODO-20260313-005 [P2] zakazky — 9 dní starý → prioritizuj alebo zruš

## Odporúčania pre ďalší týždeň
1. [P1] TODO-20260321-001 — Validácia TIME polí (urgentné)
2. [P1] TODO-20260320-008 — Opraviť výpočet mzdy
3. [P2] TODO-20260319-005 — Refactor Doch.Calc.Main.js
...

## Akcie
- [ ] Presunúť TODO-20260314-002 do BACKLOG.md
- [ ] Začať TODO-20260321-001 v pondelok
```

## Krok 4: Commitni

```
git commit -m "todo: weekly review Week NN YYYY - [X] completed, [Y] open"
```

## Krok 5: Interaktívne akcie

Opýtaj sa užívateľa:
- "Chceš presunúť stale P3 tasky do BACKLOG.md?" → vykonaj ak áno
- "Chceš nastaviť priority pre ďalší týždeň?" → pomôž vybrať top 6 taskov
