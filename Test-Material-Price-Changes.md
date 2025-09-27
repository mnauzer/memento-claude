# Test Scenáre pre Vylepšený Systém Manažmentu Cien Materiálu

## **Prehľad implementovaných zmien**

### **Nové funkcie:**
1. `detectAllPriceChanges()` - Rozšírená detekcia zmien
2. Upravená `calculateAndUpdateMaterialPrices()` - Podpora force recalculation
3. Manuálny script s `forceRecalculation: true`

---

## **Test Scenáre**

### **1. Test manuálnej akcie s nezmenou nákupnej ceny**
**Cieľ**: Overiť že sa cena prepočíta aj keď sa zmení len prirážka

**Postup**:
1. Nastaviť materiál s nákupnou cenou 10€ a prirážkou 20%
2. Spustiť manuálny script bez zmeny nákupnej ceny
3. **Očakávaný výsledok**: Cena sa prepočíta a aktualizuje

**Debug očakávané správy**:
```
🚀 [Materiál] - Vynútený prepočet (manuálna akcia)
🔍 [Materiál] - Manuálna akcia - vynútený prepočet
✅ Prepočet cien úspešne dokončený
```

### **2. Test automatického triggeru (príjemka materiálu)**
**Cieľ**: Overiť že automatické triggery stále fungují s prahmi

**Postup**:
1. Nastaviť materiál s kontrolou zmeny 5%
2. Zmeniť nákupnú cenu o 3% (pod prahom)
3. **Očakávaný výsledok**: Prepočet sa preskočí

**Debug očakávané správy**:
```
🔍 [Materiál] - Žiadne významné zmeny
🚫 [Materiál] - Prepočet ceny preskočený podľa nastavenia
```

### **3. Test automatického triggeru s prekročením prahu**
**Cieľ**: Overiť že prahy stále fungují pre automatické akcie

**Postup**:
1. Nastaviť materiál s kontrolou zmeny 5%
2. Zmeniť nákupnú cenu o 8% (nad prahom)
3. Nastaviť akciu "Prepočítať"
4. **Očakávaný výsledok**: Prepočet sa vykoná

**Debug očakávané správy**:
```
🔍 [Materiál] - Prepočet ceny bude vykonaný
⬆️🔄 [ikony v materiáli]
```

### **4. Test cenové histórie - aktualizácia v rovnaký deň**
**Cieľ**: Overiť že sa duplicitné záznamy nevytvárajú

**Postup**:
1. Spustiť manuálny prepočet materiálu
2. Spustiť ho znova v ten istý deň
3. **Očakávaný výsledok**: Aktualizuje existujúci záznam

**Debug očakávané správy**:
```
🔄 [Materiál] - Aktualizovaný cenový záznam v histórii
```

---

## **Kontrolné body pre overenie**

### **✅ Funkčné požiadavky**
- [ ] Manuálny script vždy prepočíta ceny
- [ ] Automatické triggery rešpektujú prahy
- [ ] Cenová história sa správne aktualizuje
- [ ] Ikony sa správne nastavujú

### **✅ Debug informácie**
- [ ] Jasné správy o dôvode rozhodnutia
- [ ] Rozlíšenie manuálnych vs automatických akcií
- [ ] Informácie o cenových zmenách

### **✅ Spätná kompatibilita**
- [ ] Existujúce triggery fungujú bez zmien
- [ ] API funguje s pôvodnými parametrami
- [ ] Žiadne nové chyby v štandardných scenároch

---

## **Riešenie identifikovaných problémov**

### **✅ Problém 1: Neprepočítava sa pri zmene len prirážky**
**Riešenie**: `forceRecalculation: true` v manuálnych akciách

### **✅ Problém 2: Veľa záznamov pri malých zmenách**
**Riešenie**: Prahy stále fungujú pre automatické triggery

### **✅ Problém 3: Manuálny script vytvára duplicáty**
**Riešenie**: `createOrUpdateMaterialPriceRecord` už správne funkčný

---

## **Poznámky pre vývojára**

1. **Monitoring**: Sledovať Debug_Log polia pre overenie správneho chovania
2. **Performance**: Nové funkcie minimálne ovplyvňujú výkon
3. **Bezpečnosť**: Všetky existujúce kontroly zostávajú aktívne