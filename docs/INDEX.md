# Memento Database - Dokumentácia Index

**Projekt:** memento-claude
**Posledná aktualizácia:** 2026-03-18

---

## 📚 Core Dokumentácia

### [CORE_MODULES_DOCUMENTATION.md](./CORE_MODULES_DOCUMENTATION.md)
**Komplexná dokumentácia všetkých core modulov** (~95 KB)

Obsahuje:
- Úvod a architektúra
- Dependency chain
- Detailné API pre každý modul (10 modulov)
- Best practices
- Príklady použitia
- Typické script patterns

**Moduly:**
1. MementoConfig.js - Centralizovaná konfigurácia
2. MementoCore.js - Základné utility
3. MementoUtils.js - Agregátor (lazy loading)
4. MementoBusiness7.js - Business logika
5. MementoAI7.js - AI integrácia
6. MementoTelegram8.js - Telegram Bot API
7. MementoGPS.js - GPS routing
8. MementoRecordTracking.js - Record tracking
9. MementoIDConflictResolver.js - ID konflikt resolver
10. MementoAutoNumber.js - Auto-generovanie čísel

---

### [CORE_MODULES_QUICK_REFERENCE.md](./CORE_MODULES_QUICK_REFERENCE.md)
**Rýchly referenčný sprievodca** (~15 KB)

Obsahuje:
- Import patterns
- Najpoužívanejšie funkcie
- Code snippets
- Kritické poznámky
- Typický script pattern
- Cheat sheet pre všetky moduly

**Ideálne pre:**
- Rýchle vyhľadávanie funkcií
- Copy-paste code snippets
- Pripomenutie syntaxe
- Quick lookup počas vývoja

---

## 📁 Projektová Dokumentácia

### [MEMENTO_PROJECT_STRUCTURE.md](../MEMENTO_PROJECT_STRUCTURE.md)
Organizácia projektu, knižnice, dependency chain

**Obsahuje:**
- Organizácia adresárov
- Popis knižníc (dochadzka, kniha-jazd, material, atď.)
- Súvislosti medzi knižnicami
- Naming convention overview

---

### [MEMENTO_NAMING_CONVENTION.md](../MEMENTO_NAMING_CONVENTION.md)
Konvencie pomenovania scriptov a súborov

**Formát:** `[Library].[Type].[Name].js`

**Typy:**
- Calc - Calculation engine
- Trigger - Event handlers
- Action - Manual operations
- BulkAction - Batch operations
- Button - UI button handlers
- Notif - Notifications

---

### [MEMENTO_API_ACCESS.md](../MEMENTO_API_ACCESS.md)
Python API utilities a Memento Database REST API

**Obsahuje:**
- Python setup
- Environment variables
- API endpoints
- Rate limits
- Field type mappings

---

## ✅ TODO/Planning System

### [TODO_SYSTEM_GUIDE.md](./TODO_SYSTEM_GUIDE.md)
**Kompletný sprievodca TODO/plánovacím systémom** (~45 KB)

Obsahuje:
- GTD (Getting Things Done) workflow
- 7 príkazov (/capture, /list, /update, /complete, /review, /weekly-review, /daily-plan)
- Priority system (P1/P2/P3)
- TODO item format
- Library mapping
- Best practices
- Metrics & tracking
- Integration s memento-file-organizer

**Ideálne pre:**
- Zachytávanie úloh počas práce
- Organizácia taskov podľa knižníc
- Týždenné review (Friday/Sunday)
- Denné plánovanie (Ivy Lee method)

**Skill:** memento-todo v1.0.0 (auto-aktivácia)

---

## 🔒 Security Dokumentácia

### [SECURITY.md](../SECURITY.md)
Security policy a vulnerability reporting

### [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md)
Security checklist pre code review

### [SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md)
Audit report a findings

---

## 📖 Changelog

### CHANGELOG-MementoConfig.md
Verzia history pre MementoConfig modul (v samostatnom súbore)

---

## 🗂️ Štruktúra Dokumentácie

```
memento-claude/
├── docs/
│   ├── INDEX.md (tento súbor)
│   ├── CORE_MODULES_DOCUMENTATION.md (komplexná)
│   ├── CORE_MODULES_QUICK_REFERENCE.md (quick ref)
│   ├── TODO_SYSTEM_GUIDE.md (TODO/planning system)
│   ├── CHANGELOG-MementoConfig.md
│   └── planning/
│       ├── COMPLETED.md (archív dokončených TODOs)
│       ├── WEEKLY_REVIEW.md (týždenné review template)
│       ├── PRIORITIES.md (aktuálne priority)
│       └── DAILY_PLAN.md (denný plán - Ivy Lee)
│
├── TODO.md (globálne TODOs)
├── BACKLOG.md (low-priority backlog)
├── CLAUDE.md (project instructions)
├── README.md (project overview)
├── MEMENTO_PROJECT_STRUCTURE.md
├── MEMENTO_NAMING_CONVENTION.md
├── MEMENTO_API_ACCESS.md
├── SECURITY.md
├── SECURITY_CHECKLIST.md
└── SECURITY_AUDIT_REPORT.md
```

---

## 🚀 Quick Start

### Pre nový script:

1. **Prečítaj:** [CORE_MODULES_QUICK_REFERENCE.md](./CORE_MODULES_QUICK_REFERENCE.md) - Typický script pattern
2. **Skontroluj:** [MEMENTO_NAMING_CONVENTION.md](../MEMENTO_NAMING_CONVENTION.md) - Názov súboru
3. **Použij:** Template-Script.js ako základ
4. **Importuj:** `var utils = MementoUtils;`
5. **Referuj:** QUICK_REFERENCE pre funkcie

### Pre úpravu existujúceho scriptu:

1. **Nájdi:** Príslušný modul v [MEMENTO_PROJECT_STRUCTURE.md](../MEMENTO_PROJECT_STRUCTURE.md)
2. **Skontroluj:** Závislosti v dependency chain
3. **Referuj:** [CORE_MODULES_DOCUMENTATION.md](./CORE_MODULES_DOCUMENTATION.md) pre detailné API
4. **Otestuj:** V Memento Database

### Pre prácu s API:

1. **Setup:** [MEMENTO_API_ACCESS.md](../MEMENTO_API_ACCESS.md)
2. **Python:** `memento_api_simple.py`
3. **Environment:** `.env` súbor s API kľúčom

### Pre task management:

1. **Prečítaj:** [TODO_SYSTEM_GUIDE.md](./TODO_SYSTEM_GUIDE.md)
2. **Capture TODO:** `pridaj todo pre [library]: [description]`
3. **Review:** `/review [library]`
4. **Weekly Review:** `/weekly-review` (každý piatok/nedeľu)
5. **Daily Plan:** `/daily-plan` (každé ráno)

---

## 📝 Dokumentačné Štandardy

### Formát Script Headers:

```javascript
/**
 * Knižnica:    [Library Name]
 * Názov:       [Script Name]
 * Typ:         [Type] ([Trigger Type])
 * Verzia:      X.Y.Z
 * Dátum:       YYYY-MM-DD
 * Autor:       [Author]
 * Závislosť:   [Dependencies]
 */
```

### Version Numbering:

- **Major (X):** Breaking changes, API zmeny
- **Minor (Y):** Nové funkcie, backwards compatible
- **Patch (Z):** Bug fixes, malé úpravy

### Changelog Format:

```javascript
// CHANGELOG vX.Y:
//    - Added: Nová funkcionalita
//    - Changed: Zmeny v existujúcom API
//    - Fixed: Opravy chýb
//    - Removed: Odstránené funkcie
```

---

## 🔍 Vyhľadávanie

### Chcem nájsť:

| Čo? | Kde? |
|-----|------|
| **Funkciu pre výpočet hodín** | QUICK_REFERENCE → MementoBusiness → calculateWorkHours |
| **Ako poslať Telegram správu** | QUICK_REFERENCE → MementoTelegram → sendTelegramMessage |
| **Názov poľa "Dátum" v Dochádzke** | QUICK_REFERENCE → MementoConfig → fields.attendance.date |
| **Dependency chain modulov** | DOCUMENTATION → Architektúra a Závislosti |
| **Príklady scriptov** | DOCUMENTATION → Príklady Použitia |
| **Naming convention** | MEMENTO_NAMING_CONVENTION.md |
| **API endpoints** | MEMENTO_API_ACCESS.md |
| **Security checklist** | SECURITY_CHECKLIST.md |
| **TODO system príkazy** | TODO_SYSTEM_GUIDE.md → Commands Reference |
| **Ako zachytiť úlohu** | TODO_SYSTEM_GUIDE.md → Quick Start |

---

## 🆘 Troubleshooting

### Časté problémy:

**1. "MementoConfig is not defined"**
- Skontroluj, či je MementoConfig.js načítaný pred tvojim scriptom
- Dependency chain: Config → Core → ostatné

**2. "Field not found" chyba**
- Používaj `safeGet()` namiesto priameho `field()`
- Skontroluj názov poľa v MementoConfig

**3. "Telegram message not sent"**
- Skontroluj Bot Token v ASISTANTO Defaults
- Skontroluj Chat ID formát (negative pre skupiny)
- Pozri Error_Log pole

**4. "GPS routing failed"**
- OSRM API môže byť nedostupný (rate limit)
- Skontroluj GPS súradnice (extractGPSFromPlace)
- Pozri metoda field v response ("OSRM" vs "none")

**5. "ID conflict detected"**
- Použij MementoIDConflictResolver v team verzii
- Automaticky vyrieši konflikty (maxID + 1)

---

## 📞 Kontakt a Support

- **GitHub Issues:** https://github.com/anthropics/claude-code/issues (pre Claude Code feedback)
- **Documentation Issues:** Vytvor issue v projekte
- **Security Issues:** Pozri SECURITY.md

---

**Verzia indexu:** 1.1.0
**Posledná aktualizácia:** 2026-03-21
**Changelog:** Pridaný TODO/Planning System (TODO_SYSTEM_GUIDE.md, memento-todo skill)
