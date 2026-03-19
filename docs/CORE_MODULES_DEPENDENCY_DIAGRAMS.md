# Core Modules - Dependency Diagrams and Visual Guide

**Version:** 1.0.0
**Date:** 2026-03-19
**Phase:** Phase 5 - Visual Documentation

---

## Overview

This document provides comprehensive visual diagrams for understanding the Memento Database core modules architecture (v8.0+).

**Use this guide for:**
- Understanding module dependencies
- Determining correct load order
- Visualizing what's aggregated in MementoUtils
- Planning script dependencies
- Debugging module loading issues

---

## 1. Complete Dependency Chain (v8.0+ Architecture)

### 4-Level Hierarchy

```
═══════════════════════════════════════════════════════════════════════════════
                    MEMENTO DATABASE CORE MODULES v8.0+
                    Phase 3/4 Complete (March 2026)
═══════════════════════════════════════════════════════════════════════════════

LEVEL 0: CONFIGURATION (No Dependencies)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌───────────────────────────────────────────────────┐                    │
│   │                                                   │                    │
│   │        MementoConfig v7.1.0                       │                    │
│   │        • Central configuration                    │                    │
│   │        • Field mappings                           │                    │
│   │        • Library metadata                         │                    │
│   │        • MODULE_INFO registry                     │                    │
│   │                                                   │                    │
│   └───────────────────────────────────────────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ depends on
                                    ▼
═══════════════════════════════════════════════════════════════════════════════

LEVEL 1: FOUNDATION (Depends on Config)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌───────────────────────────────────────────────────┐                    │
│   │                                                   │                    │
│   │        MementoCore v7.6.0                         │                    │
│   │        • Logging (addDebug, addError, addInfo)    │                    │
│   │        • Safe field access                        │                    │
│   │        • Validation utilities                     │                    │
│   │        • Icon management                          │                    │
│   │                                                   │                    │
│   └───────────────────────────────────────────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ depends on
                                    ▼
═══════════════════════════════════════════════════════════════════════════════

LEVEL 2: FOCUSED UTILITIES (Depends on Core/Config) 🆕 NEW in Phase 3
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐ │
│   │                     │  │                     │  │                    │ │
│   │  MementoTime 1.1    │  │  MementoDate 1.0    │  │  MementoValidation│ │
│   │  • 15min rounding   │  │  • Slovak calendar  │  │       1.0         │ │
│   │  • Work hours       │  │  • Holidays         │  │  • Field validation│ │
│   │  • Time formatting  │  │  • Workdays         │  │  • Type checking  │ │
│   │                     │  │                     │  │                    │ │
│   └─────────────────────┘  └─────────────────────┘  └────────────────────┘ │
│                                                                             │
│   ┌─────────────────────┐  ┌─────────────────────┐                         │
│   │                     │  │                     │                         │
│   │ MementoFormatting   │  │ MementoCalculations │                         │
│   │       1.0           │  │       1.0           │                         │
│   │  • Money: 1 250€    │  │  • Wages            │                         │
│   │  • Duration: 8:30   │  │  • Overtime         │                         │
│   │  • Phone, Date      │  │  • VAT, Profitability│                        │
│   │                     │  │                     │                         │
│   └─────────────────────┘  └─────────────────────┘                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ depends on
                                    ▼
═══════════════════════════════════════════════════════════════════════════════

LEVEL 3: BUSINESS LOGIC (Orchestrates Focused Utilities)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌───────────────────────────────────────────────────┐                    │
│   │                                                   │                    │
│   │        MementoBusiness v8.0.0  ♻️ REFACTORED     │                    │
│   │        • High-level workflows                     │                    │
│   │        • Employee processing                      │                    │
│   │        • Report generation                        │                    │
│   │        • Obligation management                    │                    │
│   │        • REDUCED: 3,942 → 1,050 lines (73%)      │                    │
│   │                                                   │                    │
│   └───────────────────────────────────────────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ depends on
                                    ▼
═══════════════════════════════════════════════════════════════════════════════

LEVEL 4: AGGREGATOR (Lazy-Loading Facade)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌───────────────────────────────────────────────────┐                    │
│   │                                                   │                    │
│   │        MementoUtils v8.1.0                        │                    │
│   │        • Single import point                      │                    │
│   │        • Lazy-loading all modules                 │                    │
│   │        • Dependency checking                      │                    │
│   │        • Backward compatibility facade            │                    │
│   │        • Access: utils.time, utils.date, etc.     │                    │
│   │                                                   │                    │
│   └───────────────────────────────────────────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

SEPARATE CHAINS (No Circular Dependencies)

┌─────────────────────────────────────┐
│  MementoTelegram v8.2.0             │
│  • Depends ONLY on MementoCore      │
│  • NOT in MementoUtils              │
│  • Import directly:                 │
│    var telegram = typeof            │
│    MementoTelegram !== 'undefined'  │
│    ? MementoTelegram : null;        │
└─────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  MementoAI 7.1  │  │  MementoGPS 1.1 │  │ MementoRecord   │
│  (AI services)  │  │  (GPS routing)  │  │  Tracking 1.1   │
└─────────────────┘  └─────────────────┘  └─────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```

---

## 2. Module Load Order in Memento Database

### Critical Order (Settings → Scripts)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    CORRECT LOAD ORDER IN MEMENTO                            │
│                                                                             │
│   Load these modules in Memento Database (Settings → Scripts) in this      │
│   exact order. Drag and drop to reorder if needed.                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

 1  ┌────────────────────────────────────────┐
    │  MementoConfig (v7.1+)                 │  ← FIRST (no dependencies)
    └────────────────────────────────────────┘

 2  ┌────────────────────────────────────────┐
    │  MementoCore (v7.6+)                   │  ← Foundation
    └────────────────────────────────────────┘

────────────── FOCUSED UTILITIES (any order within this group) ──────────────

 3  ┌────────────────────────────────────────┐
    │  MementoTime (v1.1+)                   │
    └────────────────────────────────────────┘

 4  ┌────────────────────────────────────────┐
    │  MementoDate (v1.0+)                   │
    └────────────────────────────────────────┘

 5  ┌────────────────────────────────────────┐
    │  MementoValidation (v1.0+)             │
    └────────────────────────────────────────┘

 6  ┌────────────────────────────────────────┐
    │  MementoFormatting (v1.0+)             │
    └────────────────────────────────────────┘

 7  ┌────────────────────────────────────────┐
    │  MementoCalculations (v1.0+)           │
    └────────────────────────────────────────┘

──────────────────────────────────────────────────────────────────────────────

 8  ┌────────────────────────────────────────┐
    │  MementoBusiness (v8.0+)               │  ← Depends on focused utilities
    └────────────────────────────────────────┘

 9  ┌────────────────────────────────────────┐
    │  MementoUtils (v8.1+)                  │  ← Aggregator (loads others)
    └────────────────────────────────────────┘

────────────── OPTIONAL MODULES (any order after Utils) ─────────────────────

10  ┌────────────────────────────────────────┐
    │  MementoAI (v7.1+)                     │
    └────────────────────────────────────────┘

11  ┌────────────────────────────────────────┐
    │  MementoGPS (v1.1+)                    │
    └────────────────────────────────────────┘

12  ┌────────────────────────────────────────┐
    │  MementoRecordTracking (v1.1+)         │
    └────────────────────────────────────────┘

13  ┌────────────────────────────────────────┐
    │  MementoIDConflictResolver (v1.1+)     │
    └────────────────────────────────────────┘

────────────── SEPARATE (circular dependency fix) ───────────────────────────

14  ┌────────────────────────────────────────┐
    │  MementoTelegram (v8.2+)               │  ← Import directly in scripts
    └────────────────────────────────────────┘   NOT via utils.telegram!

────────────── ON DEMAND (specialized) ──────────────────────────────────────

15  ┌────────────────────────────────────────┐
    │  MementoSync (v1.1+)                   │  ← PostgreSQL sync
    └────────────────────────────────────────┘

──────────────────────────────────────────────────────────────────────────────

16+ ┌────────────────────────────────────────┐
    │  Your Library Scripts                  │  ← LAST (depend on core)
    └────────────────────────────────────────┘

⚠️  WRONG ORDER CAUSES: "Module not loaded" errors, undefined function errors
```

---

## 3. MementoUtils Aggregation Map

### What's Aggregated vs What's Not

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    MEMENTOUTILS AGGREGATION MAP v8.1                        │
│                                                                             │
│   Single import: var utils = MementoUtils;                                 │
│   Access via: utils.time, utils.date, utils.validation, etc.               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

✅ AGGREGATED (accessible via utils.*)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   utils.config           →  MementoConfig v7.1                             │
│   utils.core             →  MementoCore v7.6                               │
│                                                                             │
│   utils.time             →  MementoTime v1.1  🆕                           │
│   utils.date             →  MementoDate v1.0  🆕                           │
│   utils.validation       →  MementoValidation v1.0  🆕                     │
│   utils.formatting       →  MementoFormatting v1.0  🆕                     │
│   utils.calculations     →  MementoCalculations v1.0  🆕                   │
│                                                                             │
│   utils.business         →  MementoBusiness v8.0                           │
│   utils.ai               →  MementoAI v7.1                                 │
│   utils.gps              →  MementoGPS v1.1                                │
│   utils.recordTracking   →  MementoRecordTracking v1.1                     │
│   utils.idConflictResolver → MementoIDConflictResolver v1.1                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

❌ NOT AGGREGATED (import directly)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   MementoTelegram v8.2   →  var telegram = typeof MementoTelegram !==      │
│                              'undefined' ? MementoTelegram : null;          │
│                                                                             │
│   Reason: Circular dependency (Telegram depends on Core, Utils tried       │
│           to aggregate Telegram → circular reference)                       │
│                                                                             │
│   MementoSync v1.1       →  var sync = typeof MementoSync !== 'undefined'  │
│                              ? MementoSync : null;                          │
│                                                                             │
│   Reason: Specialized module, rarely used, import on demand                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

⚠️ DEPRECATED (functionality moved)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   MementoVAT             →  Use utils.calculations.calculateVAT() instead  │
│   MementoAutoNumber      →  Use utils.business.generateNextNumber() instead│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Usage Flow Diagram

### Typical Script Flow with v8.0 Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    TYPICAL SCRIPT FLOW (v8.0+)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

START
  │
  │  1. IMPORT
  ▼
┌─────────────────────────────────────┐
│  var utils = MementoUtils;          │  ← Single import point
│  var currentEntry = entry();        │
└─────────────────────────────────────┘
  │
  │  2. CHECK DEPENDENCIES
  ▼
┌─────────────────────────────────────┐
│  var check =                        │
│    utils.checkAllDependencies();    │  ← Verify all modules loaded
│                                     │
│  if (!check.success) {              │
│    dialog("Error", ...);            │
│    cancel();                        │
│  }                                  │
└─────────────────────────────────────┘
  │
  │  3. VALIDATE INPUT DATA
  ▼
┌─────────────────────────────────────┐
│  var dateCheck =                    │
│    utils.validation.validateDate(   │  ← Use validation module
│      date, { required: true });     │
│                                     │
│  var timeCheck =                    │
│    utils.validation.validateTime(   │
│      time, { allowFuture: false }); │
│                                     │
│  var reqCheck =                     │
│    utils.validation.validateRequired│
│      (entry, ["Date", "Time"]);     │
└─────────────────────────────────────┘
  │
  │  4. PERFORM CALCULATIONS
  ▼
┌─────────────────────────────────────┐
│  // Time calculations               │
│  var rounded =                      │
│    utils.time.roundToQuarterHour(   │  ← Use time module
│      time, "nearest");              │
│                                     │
│  var workHours =                    │
│    utils.time.calculateHoursDiff(   │
│      start, end);                   │
│                                     │
│  // Business calculations           │
│  var wage =                         │
│    utils.calculations               │  ← Use calculations module
│      .calculateDailyWage(           │
│        hours, rate);                │
│                                     │
│  // Date checks                     │
│  var isWeekend =                    │
│    utils.date.isWeekend(date);      │  ← Use date module
│  var isHoliday =                    │
│    utils.date.isHoliday(date);      │
└─────────────────────────────────────┘
  │
  │  5. FORMAT RESULTS
  ▼
┌─────────────────────────────────────┐
│  var moneyStr =                     │
│    utils.formatting.formatMoney(    │  ← Use formatting module
│      wage);                         │
│                                     │
│  var durationStr =                  │
│    utils.formatting.formatDuration( │
│      hours);                        │
│                                     │
│  var dateStr =                      │
│    utils.formatting.formatDate(     │
│      date, "DD.MM.YYYY");           │
└─────────────────────────────────────┘
  │
  │  6. LOG & SAVE
  ▼
┌─────────────────────────────────────┐
│  utils.addDebug(entry,              │
│    "Hours: " + durationStr);        │  ← Use core logging
│                                     │
│  utils.safeSet(entry,               │
│    "Total Wage", wage);             │
│                                     │
│  utils.safeSet(entry, "info",       │
│    "Wage: " + moneyStr);            │
└─────────────────────────────────────┘
  │
  │  7. NOTIFICATIONS (optional)
  ▼
┌─────────────────────────────────────┐
│  var telegram = typeof              │
│    MementoTelegram !== 'undefined'  │  ← Import directly (NOT utils.telegram)
│    ? MementoTelegram : null;        │
│                                     │
│  if (telegram) {                    │
│    var notif =                      │
│      telegram.createTelegramMessage(│
│        entry, message);             │
│    telegram.sendNotificationEntry(  │
│      notif.notification);           │
│  }                                  │
└─────────────────────────────────────┘
  │
  ▼
END
```

---

## 5. Breaking Changes Summary (v7 → v8)

### What Changed and Why

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    BREAKING CHANGES: v7 → v8                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

1. MEMENTOBUSINESS SPLIT
   ┌────────────────────────────────────────────────────────┐
   │  BEFORE (v7): MementoBusiness had everything           │
   │  • 3,942 lines                                         │
   │  • Time, date, validation, formatting, calculations    │
   │  • Monolithic, hard to maintain                        │
   └────────────────────────────────────────────────────────┘
                           │
                           ▼ SPLIT INTO
   ┌────────────────────────────────────────────────────────┐
   │  AFTER (v8): 5 focused modules + refactored Business   │
   │  • MementoTime (370 lines)                             │
   │  • MementoDate (470 lines)                             │
   │  • MementoValidation (600 lines)                       │
   │  • MementoFormatting (550 lines)                       │
   │  • MementoCalculations (750 lines)                     │
   │  • MementoBusiness (1,050 lines) - workflows only      │
   └────────────────────────────────────────────────────────┘

   Migration: OLD still works via facade, NEW preferred
   utils.roundToQuarterHour() → utils.time.roundToQuarterHour()

────────────────────────────────────────────────────────────────────────────

2. MEMENTOTELEGRAM SEPARATION
   ┌────────────────────────────────────────────────────────┐
   │  BEFORE (v7): utils.telegram.sendMessage()             │
   │  • Circular dependency: Utils ↔ Telegram               │
   │  • Load order problems                                 │
   └────────────────────────────────────────────────────────┘
                           │
                           ▼ FIXED
   ┌────────────────────────────────────────────────────────┐
   │  AFTER (v8): Direct import                             │
   │  • var telegram = typeof MementoTelegram !==           │
   │    'undefined' ? MementoTelegram : null;               │
   │  • Telegram depends ONLY on Core (not Utils)           │
   │  • No circular dependency                              │
   └────────────────────────────────────────────────────────┘

   Migration: BREAKING - Must update all scripts using Telegram

────────────────────────────────────────────────────────────────────────────

3. MODULE_INFO STANDARD
   ┌────────────────────────────────────────────────────────┐
   │  NEW: All modules have MODULE_INFO metadata            │
   │  • name, version, author, description                  │
   │  • dependencies, provides, status                      │
   │  • Enables version checking                            │
   └────────────────────────────────────────────────────────┘

   Usage: utils.checkAllDependencies()

────────────────────────────────────────────────────────────────────────────

4. DEPENDENCY CHECKING
   ┌────────────────────────────────────────────────────────┐
   │  NEW: Comprehensive dependency validation              │
   │  • utils.checkAllDependencies()                        │
   │  • utils.checkDependencies(['time', 'formatting'])     │
   │  • Automatic version checking                          │
   │  • Helpful error messages                              │
   └────────────────────────────────────────────────────────┘
```

---

## 6. Troubleshooting Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MODULE LOADING TROUBLESHOOTING                           │
└─────────────────────────────────────────────────────────────────────────────┘

START: Script Error
  │
  ▼
❓ Error: "Module not loaded" or "undefined"?
  │
  ├─ YES ──────────────────────────────────────┐
  │                                            │
  ▼                                            ▼
Check load order                      Check module exists
  │                                            │
  ├─ Settings → Scripts                        ├─ Is file in core/?
  ├─ Drag Config to top                        ├─ Is file loaded in Memento?
  ├─ Core after Config                         ├─ Check spelling
  ├─ Focused utils after Core                  │
  ├─ Business after utils                      ▼
  ├─ Utils after Business                   Fix and reload
  │
  ▼
Fixed?
  │
  ├─ NO ───────────────────────────────────────┐
  │                                            │
  │                                            ▼
  │                                   Check version
  │                                            │
  │                                   utils.checkAllDependencies()
  │                                            │
  │                                   Update outdated modules
  │                                            │
  ▼                                            ▼
❓ Error: "utils.telegram is undefined"?         Fixed?
  │                                            │
  ├─ YES ─────────────────────────────────────┤
  │                                            │
  ▼                                            ▼
Phase 2 change                              SUCCESS! ✅
  │
  ├─ Import directly:
  │   var telegram = typeof MementoTelegram !== 'undefined'
  │   ? MementoTelegram : null;
  │
  ├─ NOT via utils.telegram
  │
  ▼
Fixed? ─────────────────────────────────────────────────────────── SUCCESS! ✅
```

---

## 7. Quick Reference Card

```
╔═════════════════════════════════════════════════════════════════════════════╗
║                    MEMENTO CORE MODULES QUICK REFERENCE                     ║
║                              v8.1.0 (Phase 3/4)                             ║
╚═════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│  IMPORT PATTERN                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  var utils = MementoUtils;                                                  │
│  var telegram = typeof MementoTelegram !== 'undefined' ?                    │
│                 MementoTelegram : null;                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  ACCESS PATTERNS                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  utils.config                  → Configuration                              │
│  utils.core.addDebug()         → Logging                                    │
│  utils.time.roundToQuarterHour()  → Time operations                         │
│  utils.date.isWeekend()        → Date operations                            │
│  utils.validation.validateTime() → Validation                               │
│  utils.formatting.formatMoney() → Formatting                                │
│  utils.calculations.calculateDailyWage() → Calculations                     │
│  utils.business.processEmployee() → Business workflows                      │
│  telegram.sendMessage()        → Telegram (direct import)                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DEPENDENCY CHECKING                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  var check = utils.checkAllDependencies();                                  │
│  if (!check.success) {                                                      │
│    dialog("Error", "Missing: " + check.missing.join(", "), "OK");          │
│    cancel();                                                                │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMON PATTERNS                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  // Time rounding                                                           │
│  var rounded = utils.time.roundToQuarterHour(time, "nearest");             │
│                                                                             │
│  // Work hours                                                              │
│  var hours = utils.time.calculateHoursDifference(start, end);              │
│                                                                             │
│  // Slovak calendar                                                         │
│  var isWeekend = utils.date.isWeekend(date);                               │
│  var isHoliday = utils.date.isHoliday(date);                               │
│                                                                             │
│  // Validation                                                              │
│  var result = utils.validation.validateRequired(entry, ["Date", "Time"]);  │
│                                                                             │
│  // Formatting                                                              │
│  var money = utils.formatting.formatMoney(1250);     // "1 250,00 €"       │
│  var duration = utils.formatting.formatDuration(8.5); // "8:30"            │
│                                                                             │
│  // Calculations                                                            │
│  var wage = utils.calculations.calculateDailyWage(hours, rate);            │
└─────────────────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════════════════╗
║  DOCUMENTATION LINKS                                                        ║
║  • CORE_MODULES_DOCUMENTATION.md - Complete API reference                  ║
║  • CORE_MODULES_MIGRATION_GUIDE.md - v7→v8 upgrade guide                   ║
║  • CORE_MODULES_AGGREGATION.md - What's in MementoUtils                    ║
║  • Template-Script.js v9.0.0 - Working example                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

---

## Additional Resources

**Complete Documentation:**
- `CORE_MODULES_DOCUMENTATION.md` - Full API reference for all 17 modules
- `CORE_MODULES_AGGREGATION.md` - Detailed MementoUtils aggregation guide
- `CORE_MODULES_MIGRATION_GUIDE.md` - v7→v8 migration with code examples
- `CORE_MODULES_QUICK_REFERENCE.md` - Quick lookup for common functions

**Getting Started:**
- `Template-Script.js` v9.0.0 - Complete working template
- `CLAUDE.md` - Project instructions
- `PROJECT_MAP.md` - Complete file listing

**Visual Guides:**
- This file - Dependency diagrams and visual guides

---

**Version History:**
- v1.0.0 (2026-03-19) - Initial creation (Phase 5 - Step 4)
