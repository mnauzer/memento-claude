# Sadzby zamestnancov

**Typ:** Historická knižnica sadzieb
**Účel:** Uchovávanie historických hodinových sadzieb zamestnancov s platnosťou podľa dátumu

---

## 📋 Očakávané Polia

| Pole | Typ | Popis |
|------|-----|-------|
| **Zamestnanec** | linkToEntry | Link na zamestnanca (Zamestnanci library) |
| **Sadzba** | double/currency | Hodinová sadzba (€/h) |
| **Platné od** | date | Od kedy sadzba platí |
| **Platné do** | date | Do kedy sadzba platí (optional) |

**Alternatívne názvy:**
- "Sadzba" môže byť aj "Hodinová sadzba"
- "Platné od" môže byť aj "Dátum"

---

## 🔧 Použitie v Scriptoch

### Zamestnanci Module (v1.5.0+)

**Funkcia:** `Zamestnanci.getCurrentHourlyRate(employeeEntry, utils)`

Táto funkcia:
1. Načíta všetky sadzby pre zamestnanca z tejto knižnice
2. Filtruje podľa aktuálneho dátumu (Platné od <= DNES <= Platné do)
3. Vráti aktuálnu platnú sadzbu

**Príklad štruktúry dát:**

```javascript
// Záznam v "Sadzby zamestnancov":
{
  Zamestnanec: [linkToEntry to Rasťo],
  Sadzba: 12.00,
  "Platné od": 2026-01-01,
  "Platné do": null  // prázdne = platí doteraz
}
```

---

## ⚙️ Verifikácia Polí

**TODO:** Overiť skutočné názvy polí cez Memento API

```bash
# V Memento Database:
# Prejdi do Nastavenia → Knižnice → Sadzby zamestnancov
# Skontroluj presné názvy polí

# Alebo cez API:
python get_library_structure.py "Sadzby zamestnancov"
```

**Po overení:**
1. Aktualizuj `fields.json` so skutočnými názvami
2. Ak sú názvy iné, aktualizuj `modules/Zamestnanci.js` funkciu `getCurrentHourlyRate()`

---

## 📊 Príklady Sadzieb

**Brigádnik s postupným zvyšovaním:**
```
Rasťo | 10 € | 01.01.2025 | 31.12.2025
Rasťo | 12 € | 01.01.2026 | (prázdne)
```

**Sezónna sadzba:**
```
Peter | 15 € | 01.06.2026 | 31.08.2026  (leto)
Peter | 12 € | 01.09.2026 | (prázdne)   (zvyšok roka)
```

---

## 🔗 Súvisiace Scripty

- **Zam.Trigger.OpeningCard.js** - Pri otvorení karty zamestnanca načíta aktuálnu sadzbu
- **modules/Zamestnanci.js** - `getCurrentHourlyRate()` a `updateCurrentHourlyRate()`

---

**Vytvorené:** 2026-03-21
**Status:** ⚠️ TEMPLATE - Potrebuje verifikáciu názvov polí
