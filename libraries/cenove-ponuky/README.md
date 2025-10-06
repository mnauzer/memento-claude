# Cenové ponuky - Scripty

## Prehľad

Tento adresár obsahuje scripty pre prácu s cenovými ponukami v systéme Memento.

## Knižnice

### 1. Cenové ponuky (ID: 90RmdjWuk)
Hlavná knižnica cenových ponúk obsahujúca kompletné ponuky pre zákazníkov.

**Kľúčové polia:**
- Číslo, Názov, Popis
- Stav cenovej ponuky
- Typ cenovej ponuky (Hodinovka, Položky, Externá)
- Miesto realizácie
- Účtovanie dopravy
- Diely (link na Cenové ponuky Diely)
- Finančné súčty (Celkom, DPH, Cena celkom s DPH)

### 2. Cenové ponuky Diely (ID: nCAgQkfvK)
Jednotlivé časti/diely cenové ponuky rozdelené podľa kategórií.

**Kategórie položiek:**
- **Materiál** (knižnica: Materiál)
  - Atribúty: množstvo, cena, cena celkom
  - Ceny z histórie: linksFrom → ceny materiálu

- **Práce** (knižnica: Cenník prác)
  - Atribúty: množstvo, cena, cena celkom
  - Ceny z histórie: linksFrom → ceny prác

- **Subdodávky** (knižnica: Materiál)
  - Atribúty: množstvo, cena, cena celkom
  - Ceny z histórie: linksFrom → ceny materiálu

- **Stroje** (knižnica: Cenník prác)
  - Atribúty: množstvo, cena, cena celkom
  - Ceny z histórie: linksFrom → ceny prác

- **Doprava** (knižnica: Cenník prác)
  - Atribúty: množstvo, cena, cena celkom
  - Ceny z histórie: linksFrom → ceny prác

**Súčtové polia:**
- Materiál (suma za materiál)
- Práce (suma za práce)
- Ostatné/Subdodavky (suma za subdodávky)
- Doprava (suma za dopravu)
- Celkom (celková suma)

## Scripty

### CP.Diely.Calculate.js

**Účel:** Hlavný prepočtový script pre knižnicu "Cenové ponuky Diely"

**Funkcie:**
1. **Automatické doplnenie cien** - Ak cena položky nie je zadaná, script ju vyhľadá v histórii cien podľa dátumu cenovej ponuky
2. **Výpočet súčtov** - Pre každú položku vypočíta: `cena celkom = množstvo × cena`
3. **Výpočet kategórií** - Spočíta položky v každej kategórii a zapíše do príslušných polí
4. **Celková suma** - Vypočíta a zapíše celkovú sumu cenovej ponuky

**Trigger nastavenia:**
- **Typ triggeru:** onChange
- **Polia:** Materiál, Práce, Subdodávky, Stroje, Doprava, Dátum
- **Podmienka:** Vždy (bez podmienok)

**Postup hľadania cien:**

| Kategória | Knižnica položiek | Knižnica histórie cien | Pole v histórii |
|-----------|------------------|----------------------|----------------|
| Materiál | Materiál | ceny materiálu | sellPrice (pc) |
| Práce | Cenník prác | ceny prác | price |
| Subdodávky | Materiál | ceny materiálu | sellPrice (pc) |
| Stroje | Cenník prác | ceny prác | price |
| Doprava | Cenník prác | ceny prác | price |

**Logika výberu ceny:**
1. Ak je cena v atribúte položky vyplnená → použije sa táto cena
2. Ak cena nie je vyplnená → vyhľadá sa v histórii cien:
   - Nájdu sa všetky ceny z linksFrom
   - Vyberú sa ceny platné k dátumu cenovej ponuky (validFrom <= dátum)
   - Použije sa najnovšia platná cena
3. Ak cena nie je nájdená v histórii → použije sa aktuálna cena z položky (ak existuje)
4. Ak cena nie je nikde → použije sa 0

**Výstup scriptu:**
```
💰 SÚHRN CENOVEJ PONUKY DIELY:
  • Materiál:     XXX.XX €
  • Práce:        XXX.XX €
  • Subdodávky:   XXX.XX €
  • Stroje:       XXX.XX €
  • Doprava:      XXX.XX €
  ------------------------------------------------
  • CELKOM:       XXXX.XX €
```

**Dependencies:**
- MementoCore7.js
- MementoConfig7.js
- MementoBusiness7.js

**Použité funkce z MementoBusiness:**
- `business.findValidWorkPrice(workEntry, date)` - Pre Práce, Stroje, Dopravu
- `findValidMaterialPrice(materialEntry, date)` - Pre Materiál, Subdodávky (vlastná funkcia v scripte)

**Debugging:**
Script zapisuje detailný log do Debug_Log poľa:
- Spracovanie jednotlivých kategórií
- Nájdené ceny v histórii
- Výpočty pre každú položku
- Finálne súčty

**Verzia:** 1.0
**Dátum:** 2025-10-06
**Autor:** ASISTANTO

## Inštalácia scriptu

1. Otvor knižnicu "Cenové ponuky Diely" v Memento Database
2. Prejdi do nastavení knižnice → Scripts
3. Vytvor nový trigger script
4. Skopíruj obsah súboru `CP.Diely.Calculate.js`
5. Nastav trigger:
   - Type: **onChange**
   - Fields: Materiál, Práce, Subdodávky, Stroje, Doprava, Dátum
   - Condition: (žiadna podmienka)
6. Ulož a aktivuj trigger

## Testovanie

1. Vytvor nový záznam v knižnici "Cenové ponuky Diely"
2. Zadaj dátum
3. Pridaj položky do kategórie Materiál (alebo inej):
   - Vyber materiál z knižnice
   - Zadaj množstvo
   - Nechaj cenu prázdnu (alebo zadaj vlastnú)
4. Script by mal automaticky:
   - Doplniť cenu z histórie (ak nie je zadaná)
   - Vypočítať cenu celkom
   - Aktualizovať súčet kategórie
   - Aktualizovať celkovú sumu

5. Skontroluj Debug_Log pre detailný priebeh výpočtu

## Poznámky

- Script predpokladá, že knižnice histórie cien (ceny materiálu, ceny prác) existujú a sú správne nastavené v MementoConfig7.js
- Pre správne fungovanie je potrebná verzia MementoConfig7.js >= 7.0.25
- Script používa moment.js pre prácu s dátumami
- Všetky finančné výpočty sú zaokrúhlené na 2 desatinné miesta

## Budúce vylepšenia

- [ ] Podpora pre DPH výpočty
- [ ] Podpora pre zľavy a prirážky
- [ ] Automatické generovanie textovej ponuky
- [ ] Export do PDF
- [ ] Kopírovanie položiek z inej ponuky
