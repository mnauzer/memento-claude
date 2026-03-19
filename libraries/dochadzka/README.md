# Dochádzka - Attendance Scripts

**Library:** Dochádzka (Attendance)
**Purpose:** Automated attendance calculation, wage computation, and daily report integration

## 🆕 Doch.Calc.v9.js (RECOMMENDED)

**Version:** 9.0.0 | **Status:** ✅ Production Ready

Modern wrapper script that uses the reusable `Dochadzka` module.

**Usage:**
```javascript
// Called automatically on Before Save trigger
Dochadzka.calculateAttendance(entry(), {
    settings: {
        roundToQuarterHour: true,
        roundDirection: "nearest"
    }
});
```

**Features:**
- ✅ Uses reusable module (no code duplication)
- ✅ Automatic work time calculation
- ✅ Employee wage computation
- ✅ Obligation management
- ✅ Daily report integration
- ✅ Date coloring

**Dependencies:**
- modules/Dochadzka.js (v1.0.1+)
- MementoUtils (v8.1+)

## Module: Dochadzka.js

**Location:** `modules/Dochadzka.js`
**Version:** 1.0.1

**Public API:**
- `calculateAttendance(entry, options)` - Main calculation
- `validateEntry(entry, options)` - Validation only

**Returns:**
```javascript
{
    success: boolean,
    isDayOff: boolean,
    data: {
        workHours: number,
        totalHours: number,
        totalWages: number,
        employeeCount: number
    }
}
```

## Migration: v8.2 → v9.0

1. Import `modules/Dochadzka.js`
2. Change trigger to `Doch.Calc.v9.js`
3. Test with sample record

## Troubleshooting

### "Chýba modul Dochadzka"
Import `modules/Dochadzka.js` in Settings → Scripts

### Load Order
```
1. MementoConfig.js
2. MementoCore.js  
3. MementoUtils.js
4. Dochadzka.js      ← Module FIRST
5. Doch.Calc.v9.js   ← Wrapper SECOND
```
