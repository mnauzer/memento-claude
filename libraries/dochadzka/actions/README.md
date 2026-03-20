# Dochádzka - Actions

**Adresár:** `libraries/dochadzka/actions/`
**Účel:** Manuálne action buttony pre knižnicu Dochádzka

---

## 📋 Dostupné Actions

| Script | Verzia | Riadky | Popis |
|--------|--------|--------|-------|
| **recalculate.js** | 1.0.0 | 15 | Prepočítať s detailným výsledkom |
| **validate.js** | 1.0.0 | 11 | Validácia bez prepočtu |
| **debug.js** | 1.0.0 | 16 | Zobraziť Debug/Error logy |
| **summary.js** | 1.0.0 | 18 | Rýchly súhrn záznamu |

---

## 🚀 Ako použiť v Memento Database

### 1. Pridaj JS knižnice (Shared Scripts)

**Nastavenia → Automations → Scripts → Shared**

Pridaj potrebné moduly (pozri hlavičku každého action scriptu)

### 2. Vytvor Action Button

**Nastavenia → Automations → Scripts → Actions**

1. Create Action
2. Názov: napr. "Prepočítať", "Validovať", "Debug"
3. **Pridaj JS knižnice** (pozri hlavičku scriptu)
4. **Skopíruj kód** z príslušného súboru
5. Save

---

## 🔄 recalculate.js

**Názov:** Prepočítať
**JS Knižnice:** Dochadzka, MementoUtils

**Funkcie:**
- ✅ Manuálny prepočet dochádzky
- ✅ Detailný výsledok v dialógu
- ✅ Zobrazí hodiny, mzdy, počet pracovníkov
- ✅ Info o vytvorených/aktualizovaných záväzkoch

**Kedy použiť:**
- Potrebuješ prepočítať existujúci záznam
- Chceš vidieť detailný výsledok
- Testovanie prepočtu

---

## ✓ validate.js

**Názov:** Validovať
**JS Knižnice:** Dochadzka

**Funkcie:**
- ✅ Validácia povinných polí
- ✅ Bez prepočtu (rýchle)
- ✅ Zobrazí všetky chyby naraz

**Kedy použiť:**
- Rýchla kontrola pred uložením
- Overenie, či sú všetky polia vyplnené
- Debugging validačných problémov

---

## 🐛 debug.js

**Názov:** Zobraziť Debug
**JS Knižnice:** (žiadne)

**Funkcie:**
- ✅ Zobrazí Debug_Log pole
- ✅ Zobrazí Error_Log pole
- ✅ Formátované v dialógu

**Kedy použiť:**
- Troubleshooting problémov
- Kontrola priebehu prepočtu
- Hľadanie chýb

---

## 📊 summary.js

**Názov:** Súhrn
**JS Knižnice:** (žiadne)

**Funkcie:**
- ✅ Rýchly prehľad záznamu
- ✅ Dátum, čas, hodiny, mzdy
- ✅ Počet pracovníkov
- ✅ Formátované s ikonami

**Kedy použiť:**
- Rýchly prehľad bez otvárania polí
- Prezentácia dát
- Kontrola výsledkov

---

## 💡 Odporúčané Actions pre produkciu

### Minimálny set:
1. **recalculate.js** - Pre prepočet existujúcich záznamov
2. **debug.js** - Pre troubleshooting

### Rozšírený set:
1. **recalculate.js** - Prepočet
2. **validate.js** - Validácia
3. **debug.js** - Debug
4. **summary.js** - Súhrn

### Pre mobile:
- **summary.js** - Najužitočnejší na mobile (žiadne dependencies)
- **debug.js** - Troubleshooting

---

## 🐛 Troubleshooting

### "Dochadzka is not defined"
- ✅ Pridaj `Dochadzka` do JS knižníc action scriptu

### "MementoUtils is not defined"
- ✅ Pridaj `MementoUtils` do JS knižníc

### Action button sa nezobrazuje
- ✅ Overeď, že action je enabled
- ✅ Refresh aplikácie

---

## 📚 Dokumentácia

- **Module API:** `modules/docs/Dochadzka.md`
- **Triggers:** `triggers/README.md`
- **Main README:** `README.md`
