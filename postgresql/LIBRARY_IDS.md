# Memento Library IDs Reference

Generated: 2026-03-18

## Master Data Libraries (Target for Sync)

| Library Name | ID | Status | Notes |
|--------------|----|---------| ------|
| **Zamestnanci** (Employees) | `nWb00Nogf` | ✅ READY | Master data - sync FIRST |
| **Miesta** (Places) | `mVadrV6p2` | ✅ READY | Has 1 entry |
| **Klienti** (Clients) | `rh7YHaVRM` | ✅ READY | |
| **Dodávatelia** (Suppliers) | `3FSQN0reH` | ✅ READY | |
| **Partneri** (Partners) | `NffZSLRKU` | ✅ READY | |
| **Adresy** (Addresses) | ❌ NOT FOUND | ⚠️ MISSING | Library doesn't exist in API response |

## Already Synced Libraries

| Library Name | ID | Status | Notes |
|--------------|----|---------| ------|
| **Dochádzka** (Attendance) | `zNoMvrv8U` | 🔄 NEEDS FIX | Correct ID found! Update sync script |
| **Zamestnanci Semiramis** | `qU4Br5hU6` | ⚠️ WRONG | Script was syncing wrong library! |
| **Záznam prác** (Work Records) | `ArdaPo5TU` | 🔄 PENDING | Needs TIME field fix |

## ⚠️ CRITICAL DISCOVERY: Wrong Library Was Being Synced!

**Problem:** The sync script (`Dochadzka.BulkAction.SyncToPostgreSQL.js`) was using ID `qU4Br5hU6`, which is actually **"Zamestnanci Semiramis"**, NOT "Dochádzka"!

**Correct Library IDs:**
- ✅ **Dochádzka (Main)** - ID: `zNoMvrv8U` - 40,926,540 entries
  - Fields: Dátum, Príchod, Odchod, Zamestnanci, Počet pracovníkov, Pracovná doba, Odpracované, Mzdové náklady, etc.
- ❌ **Zamestnanci Semiramis** - ID: `qU4Br5hU6` - 2,806 entries
  - Fields: Meno, Priezvisko, Nick, Pozícia, Hodinovka, etc. (NO Príchod/Odchod!)

**Other Dochádzka Libraries (historical):**
- Dochádzka Semiramis - ID: `5ez6J8sJr` - 1,996 entries
- Dochádzka 2019 - ID: `FGxx369FV` - 363,200 entries
- Dochádzka 2020 - ID: `6c9NiSCCf` - 50,828 entries

**Resolution:** Update sync script to use correct ID `zNoMvrv8U` and update field mappings based on actual Dochádzka structure.

## Sync Order (Based on Dependencies)

**Phase 1: Master Data (No Dependencies)**
1. Zamestnanci (Employees) - `nWb00Nogf`
2. Klienti (Clients) - `rh7YHaVRM`
3. Dodávatelia (Suppliers) - `3FSQN0reH`
4. Partneri (Partners) - `NffZSLRKU`
5. Miesta (Places) - `mVadrV6p2`

**Phase 2: Transactional Data (Depends on Master Data)**
- Dochádzka (Attendance) - references Zamestnanci ✅ DONE
- Záznam prác (Work Records) - references Zamestnanci, Zákazky
- Kniha jázd (Ride Log) - references Zamestnanci, Zákazky, Vozidlá
- Pokladňa (Cash Book) - references Zákazky, Dodávatelia, Klienti

## Libraries with TIME Fields (Require v3.5 Fix)

- ✅ Dochádzka (Attendance) - Príchod, Odchod
- ⚠️ Záznam prác (Work Records) - Čas od, Čas do
- ⚠️ Kniha jázd (Ride Log) - Čas od, Čas do

**Critical:** All TIME-type fields must use the Date object extraction method from Dochadzka.BulkAction.SyncToPostgreSQL.js v3.5.

## Notes on Missing Libraries

- **Adresy (Addresses)**: No library found with "adres" in name. May be:
  - Part of another library (embedded in Miesta?)
  - Named differently
  - Not yet created
  - User should confirm if this library exists

## API Information

- **Base URL:** https://api.mementodatabase.com/v1
- **Authentication:** Query parameter `?token=xxx` (NOT headers)
- **Current Token:** YobxmgbnZ1DTwxyJUIzCLgoAf2Qk0w
- **Total Libraries:** 182 (includes backups, deleted, Semiramis variants)
