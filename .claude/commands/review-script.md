---
description: Skontroluj Memento script voči best practices checklistu a navrhni opravy
---

Použi sub-agenta `memento-programming` na review Memento Database scriptu.

Poskytni agentovi kód scriptu (priamo v správe alebo ako cestu k súboru). Agent skontroluje:

**Kritické (🔴):**
- Hardcoded názvy polí (musia byť cez MementoConfig)
- TIME polia bez timezone fixu (rok 1970 → lokálny čas)
- lib().title() volaný ako metóda (je to property!)
- LinkToEntry iterácia pomocou Array metód (nie sú true Array)
- MementoTelegram pristupovaný cez utils (circular dep!)
- message() pre dlhé správy (zobrazí len 2 riadky)

**Varovania (🟡):**
- Chýbajúci dependency check
- Chýbajúci try/catch
- Chýbajúce čistenie logov
- Naming convention porušenie

**Odporúčania (🟢):**
- Zlepšenia loggingu, error handlingu, štruktúry

Agent vráti konkrétne opravy s ukážkami správneho kódu.
