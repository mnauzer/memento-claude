# Dochádzka - Triggers

**Adresár:** `libraries/dochadzka/triggers/`
**Účel:** Automatické event scripty pre knižnicu Dochádzka

---

## 📋 Dostupné Triggers

| Script | Udalosť | Fáza | Verzia | Riadky | Popis |
|--------|---------|------|--------|--------|-------|
| **beforeSave.js** | Aktualizácia záznamu | Pred uložením záznamu | 1.0.0 | 8 | Automatický prepočet pri uložení |
| **beforeSave-minimal.js** | Aktualizácia záznamu | Pred uložením záznamu | 1.0.0 | 6 | Minimálna verzia (najkratšia) |
| **beforeDelete.js** | Odstraňovanie záznamu | Pred uložením záznamu | 1.0.0 | 20 | Cleanup záväzkov pred zmazaním |

---

## 🚀 Ako použiť v Memento Database

### 1. Pridaj JS knižnice (Shared Scripts)

**Nastavenia → Automations → Scripts → Shared**

Pridaj tieto moduly (v tomto poradí):
```
1. MementoConfig
2. MementoCore
3. MementoUtils
4. Dochadzka      ← Library module
```

### 2. Vytvor Trigger Script

**Nastavenia → Automations → Scripts → Triggers**

1. Vyber **Udalosť** (napr. "Aktualizácia záznamu" alebo "Odstraňovanie záznamu")
2. Vyber **Fáza** (napr. "Pred uložením záznamu")
3. Create Script
4. **Pridaj JS knižnice** (tlačidlo vpravo hore - pozri hlavičku scriptu)
5. **Skopíruj kód** z príslušného súboru
6. Save

---

## 📝 Before Save Triggers

### beforeSave.js (Štandardný)

**Udalosť:** Aktualizácia záznamu
**Fáza:** Pred uložením záznamu
**JS Knižnice:** Dochadzka, MementoUtils

**Funkcie:**
- ✅ Automatický prepočet odpracovaných hodín
- ✅ Výpočet mzdových nákladov
- ✅ Vytvorenie/aktualizácia záväzkov
- ✅ Integrácia s Denný report
- ✅ Farebné označenie dátumu

**Kedy použiť:** Štandardné použitie pre produkciu

---

### beforeSave-minimal.js (Minimálny)

**Udalosť:** Aktualizácia záznamu
**Fáza:** Pred uložením záznamu
**JS Knižnice:** Dochadzka, MementoUtils

**Funkcie:**
- ✅ Rovnaké ako beforeSave.js
- ✅ Len 6 riadkov kódu
- ✅ Optimalizované pre mobile

**Kedy použiť:** Keď potrebuješ minimálny kód (mobile typing)

---

## 🗑️ Before Delete Triggers

### beforeDelete.js

**Udalosť:** Odstraňovanie záznamu
**Fáza:** Pred uložením záznamu
**JS Knižnice:** MementoUtils

**Funkcie:**
- ✅ Automatické zmazanie súvisiacich záväzkov
- ✅ Aktualizácia Denný report
- ✅ Cleanup pred odstránením záznamu

**Kedy použiť:** Vždy! Zabezpečí čistotu databázy

---

## 🔧 Load Order (KRITICKÉ!)

V Memento Database Settings → Scripts musí byť toto poradie:

```
1. MementoConfig.js     ← Config FIRST
2. MementoCore.js       ← Core utilities
3. MementoUtils.js      ← Aggregator
4. Dochadzka.js         ← Library module
5. [Trigger Script]     ← Tvoj trigger LAST
```

Ak nie je správne poradie → "Dochadzka is not defined" error

---

## 🐛 Troubleshooting

### "Dochadzka is not defined"
- ✅ Skontroluj, či je `Dochadzka` pridaný v JS knižniciach triggeru
- ✅ Overeď load order v Shared Scripts

### "MementoUtils is not defined"
- ✅ Pridaj `MementoUtils` do JS knižníc triggeru

### Prepočet nefunguje správne
- ✅ Skontroluj Debug_Log pole v zázname
- ✅ Skontroluj Error_Log pole
- ✅ Overeď, že sú vyplnené povinné polia (Dátum, Príchod, Odchod, Zamestnanci)

### Trigger sa nespustí
- ✅ Overeď, že trigger má správnu **Udalosť** a **Fáza**
- ✅ Skontroluj, či nie je vypnutý (disabled)

---

## 💡 Tips

### Výber správneho triggeru

- **Produkcia:** `beforeSave.js` - plná funkcionalita
- **Mobile:** `beforeSave-minimal.js` - minimálny kód
- **Cleanup:** `beforeDelete.js` - vždy odporúčané

### Testovanie

1. Vytvor testovací záznam
2. Vyplň povinné polia
3. Ulož
4. Skontroluj Debug_Log pre detailný priebeh
5. Overeň výsledky (Odpracované, Mzdové náklady)

---

## 📚 Dokumentácia

- **Module API:** `modules/docs/Dochadzka.md`
- **Actions:** `actions/README.md`
- **Main README:** `README.md`
