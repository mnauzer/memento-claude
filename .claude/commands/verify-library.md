---
description: Over štruktúru Memento knižnice cez MCP pred kódovaním scriptu
---

Použi sub-agenta `memento-programming` na overenie štruktúry Memento knižnice.

Poskytni agentovi názov knižnice (napr. "Dochádzka", "Zákazky", "Pokladňa").

Agent:
1. Získa aktuálnu štruktúru cez MCP (`memento_get_library_structure`) ak je dostupné
2. Porovná s mapovaním v `core/MementoConfig.js`
3. Identifikuje nezhodné, chýbajúce alebo nové polia
4. Vráti tabuľku polí: názov, typ, MementoConfig kľúč, status
5. Navrhne aktualizáciu MementoConfig ak sú rozdiely

**Výstup:**
- Zoznam všetkých polí s typmi
- Upozornenia na nezhodné názvy (case-sensitive!)
- Potvrdenie: bezpečné kódovanie / potrebné aktualizovať Config
