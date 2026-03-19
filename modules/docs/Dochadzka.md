# Dochádzka (Attendance) - Module Documentation

**Module:** `modules/Dochadzka.js`
**Version:** 0.1.0
**Status:** Initial | **Priority:** High | **Existing Scripts:** 12
**Last Updated:** 2026-03-19

---

## Library Overview

### Purpose

Dochádzka (Attendance) tracks employee work hours, calculates wages, and manages payment obligations. It is the primary system for recording when employees arrive and depart, automatically calculating:

- Work hours with 15-minute time rounding
- Break time (30 min after 6 hours)
- Wages based on hourly rates
- Payment obligations for payroll

### Key Responsibilities

- **Primary:** Track employee attendance (arrival/departure times)
- **Secondary:** Calculate work hours, wages, and obligations
- **Data Management:** Daily attendance records linked to employees

---

## Memento Database Structure

### Field Structure

| Field | Slovak Name | Type | Description |
|-------|-------------|------|-------------|
| date | Dátum | date | Attendance date |
| employee | Zamestnanec | linkToEntry | Link to employee |
| arrivalTime | Príchod | time | Arrival time (rounded) |
| departureTime | Odchod | time | Departure time (rounded) |
| workedHours | Odpracované hodiny | double | Net hours (after break) |
| breakTime | Prestávka | integer | Break in minutes |
| wage | Mzda | currency | Calculated wage |
| hourlyRate | Hodinová sadzba | currency | Employee's rate |
| dailyReport | Denný report | linkToEntry | Daily report |
| obligation | Záväzok | linkToEntry | Payment obligation |

---

## Module API

### `calculateAttendance(entry, options)`

Calculate work hours with time rounding and break application.

**Status:** 🚧 Placeholder - Extract from Doch.Calc.Main.js

### `calculateWage(entry, options)`

Calculate wage for attendance entry.

**Status:** 🚧 Placeholder

### `updateDailyReport(entry, options)`

Update linked daily report with attendance data.

**Status:** 🚧 Placeholder

---

## Business Rules

### 15-Minute Time Rounding

- Arrival: Round DOWN to previous 15-min mark
- Departure: Round UP to next 15-min mark
- Example: 7:07 → 7:00, 15:47 → 16:00

### Mandatory Break After 6 Hours

- If hours > 6: Subtract 30-minute break
- Slovak Labor Code § 91 requirement

---

## Integration

**Linked Libraries:**
- Zamestnanec (Employees) - Employee reference, hourly rate
- Denný report (Daily Report) - Daily aggregation
- Záväzky (Obligations) - Payment obligation

---

## Migration Plan

**Scripts to Extract:**
1. Doch.Calc.Main.js (~250 lines) → calculateAttendance()
2. Doch.Calc.Universal.js (~200 lines) → calculateWage()
3. Doch.Update.DailyReport.js (~70 lines) → updateDailyReport()

---

**Status:** 🟡 Initial | **Priority:** 🔴 HIGH
