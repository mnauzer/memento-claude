---
description: Vygeneruj nový Memento Database script alebo modul podľa naming konvencie a šablóny
---

Použi sub-agenta `memento-programming` na vygenerovanie nového Memento Database scriptu alebo reusable modulu.

Agent dostane tieto informácie od užívateľa (ak chýbajú, opýtaj sa):
- **Knižnica** — pre ktorú knižnicu (napr. Dochádzka, Zákazky, Pokladňa...)
- **Typ** — Calc / Action / Trigger / BulkAction / Notif / alebo Reusable Module
- **Funkčnosť** — čo má script robiť
- **Polia** — aké polia budú potrebné (ak sú známe)

Agent automaticky:
1. Overí štruktúru knižnice (MCP alebo MementoConfig.js)
2. Vygeneruje script podľa Template-Script.js v9.0.0
3. Aplikuje všetky kritické fixy (TIME timezone, LinkToEntry, lib().title...)
4. Pridá kompletný logging, error handling, dependency check
5. Navrhne aktualizáciu PROJECT_MAP.md
