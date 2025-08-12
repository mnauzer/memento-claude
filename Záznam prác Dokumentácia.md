# 📘 Dokumentácia knižnice **Záznam prác**

## 1️⃣ Účel knižnice
Knižnica **Záznam prác** uchováva denné pracovné záznamy na zákazkách.  
Je prepojená s inými knižnicami (Zákazky, Zamestnanci, sadzby, HZS, Výkaz prác, Cenové ponuky, Cenník prác) a časť polí sa vypočítava automaticky skriptom.

---

## 2️⃣ Polia záznamu (*currentEntry*)

| Pole | Typ | Zadáva | Vypočítava | Popis / Výpočet |
|------|-----|--------|------------|-----------------|
| **Dátum** | Date | Užívateľ |  | Dátum vykonania prác |
| **Zákazka** | Link to Entry → _Zákazky_ | Užívateľ |  | Väzba na konkrétnu zákazku |
| **Od** | Time | Užívateľ | Script | Script zaokrúhľuje na 15 minút |
| **Do** | Time | Užívateľ | Script | Script zaokrúhľuje na 15 minút |
| **Zamestnanci** | Link to Entry → _Zamestnanci_ | Užívateľ |  | Pre každého zamestnanca script rieši atribúty: |
|  ┣ **odpracované** (atribút) | Number |  | Script | Odpracovaný čas na zákazke |
|  ┣ **hodinovka** (atribút) | Number |  | Script | Aktuálna hodinová sadzba k dátumu **Dátum** |
|  ┗ **mzdové náklady** (atribút) | Number |  | Script | `odpracované × hodinovka` |
| **Hodinová zúčtovacia sadzba** | Link to Entry → _ASISTANTO Defaults / Cenník prác_ | Užívateľ / Script |  | Má atribút **cena** |
| **Vykonané práce** | Text | Užívateľ |  | Popis vykonaných prác |
| **Pracovná doba** | Number (h) |  | Script | = `Do` − `Od` (desatinné hodiny, napr. 6.75) |
| **Odpracované** | Number (h) |  | Script | = `Pracovná doba × počet zamestnancov` |
| **Počet pracovníkov** | Number |  | Script | Počet záznamov v poli **Zamestnanci** |
| **Mzdové náklady** | Number (€) |  | Script | Súčet atribútov *mzdové náklady* všetkých zamestnancov |
| **Suma HZS** | Number (€) |  | Script | = `Odpracované × cena` (atribút z **Hodinová zúčtovacia sadzba**) |
| **info** | Text (multiline) | – | Script | Informačné hlášky |
| **Debug_Log** | Text (multiline) | – | Script | Debug logy scriptu |
| **Error_Log** | Text (multiline) | – | Script | Záznam chýb scriptu |

---

## 3️⃣ Prepojené knižnice a väzby

### 3.1 Zamestnanci → sadzby zamestnancov
Script pre každého zamestnanca v poli **Zamestnanci** zisťuje aktuálnu sadzbu:
entry().field("Zamestnanci")[i]
.linksFrom("sadzby zamestnancov", "Zamestnanec")

text
Vyberie poslednú platnú sadzbu k dátumu **Dátum**.

### 3.2 Hodinová zúčtovacia sadzba → Cenník prác
- **Hodinová zúčtovacia sadzba** je *LinkToEntry* do _ASISTANTO Defaults_, ktorá sa ďalej linkuje do **Cenníka prác**.
- Aktuálna cena sa zisťuje cez `linksFrom` do knižnice **ceny prác**:
  - Ak existujú záznamy, vyberie sa posledná platná cena a zapíše sa do poľa **Cena** v **Cenníku prác**.
  - Ak záznamy neexistujú, použije sa hodnota **Cena** z **Cenníka prác**.

---

## 4️⃣ Väzby na „Výkaz prác“

Pri novom zázname **Záznam prác** sa kontroluje existencia záznamu vo **Výkaz prác** takto:
Kontroluje sa zázname zákazky v poli Zákazka linksFrom prepojenie z knižnice Výkaz prác na tento záznam(objekt). Prepojenie zákazka[0].linksFrom("Výkaz prác", "Zákazka")

### 4.1 Ak výkaz existuje
- Ak existuje:
  - Do poľa **Práce HZS** vo výkaze sa pridá link na nový záznam.
  - Atribúty linku:
    - **vykonané práce** = `Vykonané práce`
    - **počet hodín** = `Odpracované`
    - **účtovaná sadzba** = atribút **cena** z poľa **Hodinová zúčtovacia sadzba**
    - **cena celkom** = `počet hodín × účtovaná sadzba`

### 4.2 Ak výkaz neexistuje
- Script vytvorí nový výkaz s poľami:
  - **Dátum** = ako v aktuálnom zázname
  - **Identifikátor**
  - **Popis**
  - **Typ výkazu** = z poľa v zákazke (`Položky` alebo `Hodinovka`)
  - **Ceny počítať** = `"Z cenovej ponuky"`
  - **Cenová ponuka** = link z poľa `Cenová ponuka` v zákazke
  - **Vydané** = `"Zákazka"`
  - **Zákazka** = link na zákazku z aktuálneho záznamu

---

## 5️⃣ Vzorce / výpočty v skripte

1. **Zaokrúhlenie „Od“ a „Do“** na 15 minút.
2. **Pracovná doba** = `Do` − `Od` (v hodinách, desatinný formát)
3. **Odpracované** = `Pracovná doba × počet zamestnancov`
4. **Počet pracovníkov** = počet záznamov v poli **Zamestnanci**
5. **Mzdové náklady (atribút)** = `odpracované × hodinovka`
6. **Mzdové náklady (pole)** = súčet atribútu *mzdové náklady* všetkých zamestnancov
7. **Suma HZS** = `Odpracované × cena` (HZS)

---

## 6️⃣ Logovanie

- **Debug_Log** — priebeh scriptu
- **Error_Log** — chyby pri spracovaní
- **info** — stručný status operácie, výsledky

---

## 7️⃣ Tok spracovania nového záznamu

1. Užívateľ vyplní **Dátum**, **Zákazka**, **Od**, **Do**, **Zamestnanci**, voliteľne **HZS**, **Vykonané práce**.
2. Script:
    1. Zaokrúhli „Od“ a „Do“ na 15 min.
    2. Vypočíta „Pracovná doba“.
    3. Dopolní atribúty zamestnancov: *odpracované*, *hodinovka*, *mzdové náklady*.
    4. Spočíta celkové „Odpracované“, „Počet pracovníkov“, „Mzdové náklady“.
    5. Zistí aktuálnu cenu HZS a vypočíta „Suma HZS“.
    6. Napojí alebo vytvorí „Výkaz prác“.
    7. Zapíše záznamy do `info`, `Debug_Log`, `Error_Log`
    