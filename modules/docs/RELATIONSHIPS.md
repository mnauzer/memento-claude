# Memento Database - Library Relationships

**Last Updated:** 2026-03-19 23:00
**Purpose:** Visual reference for how Memento libraries interact and depend on each other

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Library Dependencies](#library-dependencies)
4. [Core Module Dependencies](#core-module-dependencies)
5. [LinkToEntry Relationships](#linktoentry-relationships)

---

## System Architecture

The Memento Database system follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                       MASTER DATA LAYER                          │
│  (Reference data - relatively static)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Zamestnanci    Miesta    Partneri   Dodávatelia   Klienti    │
│  (Employees)   (Places)  (Partners)   (Suppliers)  (Clients)   │
│                                                                  │
│  Vozidlá      Mechanizácia   Materiál   Cenník prác   Účty    │
│  (Vehicles)   (Machinery)   (Inventory) (Price List) (Accounts)│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                             ↓ ↓ ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSACTION LAYER                             │
│  (Daily operations - high volume)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dochádzka  ──┐                                                 │
│  (Attendance)  │                                                 │
│                ├──→  Denný report                               │
│  Záznam prác ─┤      (Daily Report)                             │
│  (Work Rec.)   │                                                 │
│                │                                                 │
│  Kniha jázd ──┘                                                 │
│  (Ride Log)                                                      │
│                                                                  │
│  Pokladňa ────→  Záväzky/Pohľadávky                            │
│  (Cash Book)     (Obligations/Claims)                            │
│                                                                  │
│  Cenové ponuky ──→  Zákazky                                     │
│  (Price Quotes)     (Orders)                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                             ↓ ↓ ↓
┌─────────────────────────────────────────────────────────────────┐
│                      OUTPUT LAYER                                │
│  (Reports & Documents - aggregated data)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Denný report   Výkaz prác    Vyúčtovania   Faktúry           │
│  (Daily Report) (Work Report) (Settlements) (Invoices)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Master Data → Transactions → Outputs

```
┌─────────────┐
│ Zamestnanci │ ─────┐
│ (Employees) │      │
└─────────────┘      │
                      ├───→ ┌─────────────┐
┌─────────────┐      │      │ Dochádzka   │
│   Miesta    │ ─────┤      │ (Attendance)│
│  (Places)   │      │      └──────┬──────┘
└─────────────┘      │             │
                      │             │
┌─────────────┐      │             ├───→ ┌──────────────┐
│   Zákazky   │ ─────┘             │     │ Denný report │
│  (Orders)   │                    │     │(Daily Report)│
└─────────────┘                    │     └──────────────┘
                                    │
                                    ├───→ ┌──────────────┐
                                    │     │ Výkaz prác   │
                                    │     │(Work Report) │
                                    │     └──────────────┘
                                    │
                                    └───→ ┌──────────────┐
                                          │ Vyúčtovania  │
                                          │(Settlements) │
                                          └──────────────┘
```

### Quote-to-Order Workflow

```
┌─────────────────┐
│  Cenové ponuky  │
│  (Price Quotes) │
└────────┬────────┘
         │
         │ createOrder()
         ↓
┌─────────────────┐      ┌─────────────────┐
│    Zákazky      │ ───→ │  Vyúčtovania    │
│    (Orders)     │      │  (Settlements)  │
└─────────────────┘      └─────────────────┘
         │
         │ createInvoice()
         ↓
┌─────────────────┐
│    Faktúry      │
│   (Invoices)    │
└─────────────────┘
```

### Attendance & Payment Flow

```
┌─────────────────┐      ┌─────────────────┐
│   Dochádzka     │ ───→ │    Záväzky      │
│  (Attendance)   │      │  (Obligations)  │
└─────────────────┘      └────────┬────────┘
                                   │
                                   │ payObligations()
                                   ↓
                         ┌─────────────────┐
                         │   Pokladňa      │
                         │  (Cash Book)    │
                         └─────────────────┘
```

---

## Library Dependencies

### High-Dependency Libraries (Referenced by Many)

These libraries are frequently linked to by other libraries:

| Library | Linked By | Purpose |
|---------|-----------|---------|
| **Zamestnanci** (Employees) | Dochádzka, Záznam prác, Kniha jázd | Employee reference |
| **Miesta** (Places) | Kniha jázd, Záznam prác, Zákazky | Location reference |
| **Klienti** (Clients) | Cenové ponuky, Zákazky, Vyúčtovania | Client reference |
| **Zákazky** (Orders) | Vyúčtovania, Záznam prác | Order reference |
| **Denný report** (Daily Report) | Dochádzka, Záznam prác, Kniha jázd, Pokladňa | Daily aggregation |

### LinkToEntry Relationships

**Format:** `Library` → `Linked Library` (Field Name)

#### Transaction Libraries

**Dochádzka (Attendance):**
- → Zamestnanci (Zamestnanec) - Which employee
- → Denný report (Denný report) - Daily aggregation
- → Záväzky (Záväzok) - Payment obligation

**Záznam prác (Work Records):**
- → Zamestnanci (Zamestnanci) - Crew (multi-select)
- → Zákazky (Zákazka) - Related order
- → Miesta (Miesto) - Work location
- → Denný report (Denný report) - Daily aggregation

**Kniha jázd (Ride Log):**
- → Vozidlá (Vozidlo) - Which vehicle
- → Zamestnanci (Vodič) - Driver
- → Zamestnanci (Posádka) - Crew (multi-select)
- → Miesta (Miesto od) - Start location
- → Miesta (Miesto do) - End location
- → Denný report (Denný report) - Daily aggregation

**Pokladňa (Cash Book):**
- → Účty (Účet) - Which account
- → Partneri (Partner) - Related partner
- → Záväzky (Záväzky) - Obligations paid (multi-select)
- → Denný report (Denný report) - Daily aggregation

**Cenové ponuky (Price Quotes):**
- → Klienti (Klient) - Client
- → Zákazky (Zákazka) - Created order (back-link)

**Cenové ponuky - Diely (Quote Parts):**
- → Cenové ponuky (Cenová ponuka) - Parent quote
- → Materiál (Materiál) - Material reference (optional)

**Zákazky (Orders):**
- → Klienti (Klient) - Client
- → Cenové ponuky (Cenová ponuka) - Source quote (optional)
- → Vyúčtovania (Vyúčtovanie) - Settlement (back-link)

**Zákazky - Diely (Order Parts):**
- → Zákazky (Zákazka) - Parent order
- → Materiál (Materiál) - Material reference (optional)

**Vyúčtovania (Settlements):**
- → Klienti (Klient) - Client
- → Zákazky (Zákazky) - Orders (multi-select)
- → Záznam prác (Záznamy prác) - Work records (multi-select)

#### Master Data Libraries

**Materiál (Inventory):**
- → Dodávatelia (Dodávateľ) - Supplier

**Účty (Accounts):**
- → Partneri (Partner) - Account owner (optional)

---

## Core Module Dependencies

All library modules depend on core modules. Here's the dependency chain:

```
MementoConfig7.js (Configuration)
    ↓
MementoCore7.js (Logging, validation)
    ↓
MementoUtils7.js (Aggregator - lazy loading)
    ↓
┌───────────────────────────────────────────────┐
│  Specialized Core Modules (Optional)          │
├───────────────────────────────────────────────┤
│  MementoBusiness7.js - Business logic         │
│  MementoVAT.js - VAT calculations             │
│  MementoTime.js - Time rounding               │
│  MementoGPS.js - GPS routing                  │
│  MementoTelegram8.js - Notifications          │
│  MementoAI7.js - AI integration               │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│  Shared Utility Modules                       │
├───────────────────────────────────────────────┤
│  DailyReportModule - Daily report updates     │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│  Library-Specific Modules                     │
├───────────────────────────────────────────────┤
│  Dochadzka, CenovePonuky, Material, etc.      │
└───────────────────────────────────────────────┘
```

### Module Dependencies by Library

| Library Module | Depends On |
|----------------|------------|
| **Dochadzka** | MementoUtils, MementoConfig, MementoTime, MementoBusiness, DailyReportModule |
| **CenovePonuky** | MementoUtils, MementoConfig, MementoVAT, MementoBusiness |
| **Material** | MementoUtils, MementoConfig, MementoVAT, MementoBusiness |
| **Pokladna** | MementoUtils, MementoConfig, MementoVAT, MementoBusiness, DailyReportModule |
| **Zakazky** | MementoUtils, MementoConfig, MementoVAT, MementoBusiness, MementoAutoNumber |
| **ZaznamPrac** | MementoUtils, MementoConfig, MementoTime, DailyReportModule |
| **KnihaJazd** | MementoUtils, MementoConfig, MementoTime, MementoGPS, DailyReportModule |
| **Zamestnanci** | MementoUtils, MementoConfig, MementoBusiness |
| **Miesta** | MementoUtils, MementoConfig, MementoGPS |
| **Vyuctovani** | MementoUtils, MementoConfig, MementoVAT, MementoBusiness |
| **Others** | MementoUtils, MementoConfig (minimum) |

---

## Field Type Patterns

### Common Field Types by Library

**Master Data Libraries:**
- Core fields: Názov (text), Aktívny (checkbox)
- Contact fields: Telefón, Email, Adresa (text)
- Business fields: IČO, DIČ (text)

**Transaction Libraries:**
- Core fields: Dátum (date), Číslo (integer)
- Amount fields: Suma, Suma s DPH, Suma bez DPH (currency)
- Status fields: Status (singleChoice)
- Link fields: Multiple linkToEntry fields

**Calculation Libraries:**
- Time fields: Čas od, Čas do (time)
- Duration fields: Hodiny, Minúty (double)
- Rate fields: Hodinová sadzba (currency)
- Result fields: Calculated values (various types)

---

## Integration Points

### Daily Report Integration

Four libraries update Daily Report:

```
Dochádzka ──┐
Záznam prác ├──→ DailyReportModule.updateLinkedDailyReports()
Kniha jázd ─┤
Pokladňa ───┘
```

**Common Pattern:**
```javascript
DailyReportModule.updateLinkedDailyReports(entry(), {
    utils: MementoUtils,
    field: "Denný report",
    libraryName: "Dochádzka"
});
```

### VAT Calculation Integration

Three libraries use VAT calculations:

```
CenovePonuky ──┐
Material ───────├──→ MementoVAT.calculateVAT()
Pokladna ──────┘
```

**Common Pattern:**
```javascript
var result = MementoVAT.calculateVAT(entry(), {
    fields: {
        isVat: "s DPH",
        sum: "Suma",
        sumTotal: "Suma s DPH"
    }
});
```

### Time Rounding Integration

Three libraries use time rounding:

```
Dochádzka ──┐
ZaznamPrac ─├──→ MementoTime.roundToQuarterHour()
KnihaJazd ──┘
```

**Common Pattern:**
```javascript
var rounded = MementoTime.roundToQuarterHour(time, "nearest");
```

---

## Business Logic Flow

### Attendance → Obligation → Payment Flow

```
1. Dochádzka.calculateAttendance()
   ↓
   Calculate hours, wage
   ↓
2. Dochádzka.manageObligation()
   ↓
   Create/update Záväzok entry
   ↓
3. Pokladna.payObligations()
   ↓
   Distribute payment, mark obligations paid
   ↓
4. Update Denný report
```

### Quote → Order → Settlement → Invoice Flow

```
1. CenovePonuky.calculateQuote()
   ↓
   Calculate quote totals
   ↓
2. CenovePonuky.createOrder()
   ↓
   Create Zákazka from quote
   ↓
3. Zakazky.calculateOrder()
   ↓
   Recalculate order totals
   ↓
4. Vyuctovani.calculateSettlement()
   ↓
   Aggregate orders, create settlement
   ↓
5. Vyuctovani.createInvoice()
   ↓
   Generate invoice
```

---

## Module Communication Patterns

### Direct Module Calls

Module A calls Module B directly:

```javascript
// In Dochadzka module
function updateDailyReport(entry, options) {
    return DailyReportModule.updateLinkedDailyReports(entry, config);
}
```

### Shared Utility Pattern

Multiple modules call shared utility:

```javascript
// In multiple modules
var rounded = MementoTime.roundToQuarterHour(time, mode);
var vat = MementoVAT.calculateVAT(entry, config);
```

### Entry Linking Pattern

Module creates entry in another library:

```javascript
// In CenovePonuky module
function createOrder(entry, options) {
    // Create new entry in Zákazky library
    var orderLib = lib("Zákazky");
    var orderEntry = orderLib.create({ /* data */ });
    return orderEntry;
}
```

---

## Future Enhancements

### Planned Integration Points

1. **Payroll Integration** - Zamestnanci ← Dochádzka aggregations
2. **Inventory Management** - Material ← Zákazky - Diely consumption tracking
3. **Financial Reporting** - Ucty ← Pokladňa reconciliation
4. **Client Analytics** - Klienti ← Vyúčtovania revenue tracking
5. **Vehicle Maintenance** - Vozidlá ← Kniha jázd maintenance scheduling

---

**Document Version:** 1.0
**Created:** 2026-03-19
**Author:** ASISTANTO
**Status:** 🟢 Complete
