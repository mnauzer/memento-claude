# 📚 Kompletný zoznam polí v databázových súboroch (`mlt2`)

Nasleduje prehľad všetkých dostupných polí z každého priloženého súboru, rozdelený do kapitol podľa jednotlivých databázových knižníc. U každej položky je uvedený typ poľa, účel, možné hodnoty a špecifické parametre.

---

## 1. 📘 Dochadzka.mlt2 – **Dochádzka**

| Pole | Typ | Účel / Popis | Parametre |
|------|-----|---------------|-----------|
| Dátum | ft_date | Dátum príchodu/odchodu | dd.MM.yy, 1900–2100, jazyk: sk |
| Príchod / Odchod | ft_time_interval | Čas príchodu a odchodu | Zaokrúhľovanie, úpravy, špeciálne editovanie |
| Zamestnanci | ft_lib_entry | Prepojenie na zamestnancov | Atribúty: odpracované, hodinovka, príplatok atď. |
| Práce / Jazdy | ft_lib_entry | Prepojenie na knižnice | Typ: prepojenie |
| Záväzky | ft_boolean | Má záväzky? | Áno / Nie |
| Počet pracovníkov | ft_int | Sumár | jednotka: os, readonly |
| Pracovná doba / Odpracované / Na zákazkách / Prestoje | ft_real | Časové hodnoty | jednotka: HOUR, rôzne agregácie |
| Mzdové náklady | ft_money | Náklady celkom | jednotka: EUR, agregácia, readonly |
| keys | ft_tags | Tagovanie | — |
| info | ft_string | Voľný popis | — |
| Notifikácie | ft_boolean | Individuálne notifikácie | Áno / Nie |
| ID | ft_int | Interné ID | Auto, readonly |
| farba záznamu / pozadia | ft_color | Vizualizácia | Výber farby |
| zapísal / upravil | ft_user | Autor / Úpravca | — |
| dátum zápisu / úpravy | ft_date_time | Timestamps | — |
| view | ft_radiobutton | Typ pohľadu | hodnota: JSON |
| Debug_Log / Error_Log / Debug_Fields | ft_string | Diagnostika | — |

---

## 2. 📗 ASISTANTO-API.mlt2 – **Záznam práce**

| Pole | Typ | Účel / Popis | Parametre |
|------|-----|---------------|-----------|
| Dátum | ft_date | Dátum vykonania práce | dd.MM.yy |
| Zákazka | ft_lib_entry | Link na zákazku | — |
| Od – Do | ft_time_interval | Interval práce | Zaokrúhľovanie na 15 min. |
| Zamestnanci | ft_lib_entry | Prepojenie | Atribúty: odpracované, hodinovka |
| HZS | ft_lib_entry | Hodinová sadzba | Atribúty: cena |
| Výkaz prác | ft_lib_entry | Link | Nepriame pole |
| Vykonané práce | ft_string | Textový popis | — |
| Počet pracovníkov | ft_int | Sumár | jednotka: os |
| Pracovná doba / Odpracované | ft_real | Hodiny | jednotka: HOUR |
| Mzdové náklady / Suma HZS | ft_money / ft_real | Výpočty | jednotka: EUR |
| info | ft_string | Poznámka | — |
| ID | ft_int | Interné ID | Auto, readonly |
| farba záznamu / pozadia | ft_color | Vzhľad | — |
| zapísal / upravil | ft_user | Autor / Úpravca | — |
| dátum zápisu / úpravy | ft_date | Dátumy | — |
| view | ft_radiobutton | Typ pohľadu | — |
| Debug/Error/Debug Fields | ft_string | Diagnostika | — |

---

## 3. 🛠️ ASISTANTO-Defaults.mlt2 – **Firemné defaulty a notifikácie**

| Pole | Typ | Účel / Popis | Parametre |
|------|-----|---------------|-----------|
| Dátum | ft_date | Dátum nastavenia | mesiac/rok |
| Identifikačné údaje | ft_string | Firma, adresa, IČO, DIČ | — |
| Účtovný rok | ft_int | Rok | — |
| Povoliť Telegram správy | ft_boolean | Aktivácia | Áno / Nie |
| Predvolená TG skupina | ft_lib_entry | Prepojenie | — |
| Pracovný čas od / do | ft_time_interval | Nastavenie | — |
| Víkendové správy | ft_boolean | Označenie | Áno / Nie |
| Debug mód | ft_boolean | Aktivácia debugu | — |
| API Key, Bot | ft_psw / ft_string | Telegram API | — |
| Oneskorenie notifikácie | ft_int | V minútach | — |
| Štatistiky / Financie | ft_boolean | Reporting | Áno / Nie |
| Dochádzka ID | ft_string / ft_lib_entry | Prepojenie | — |
| Individuálne / Skupinové | ft_boolean | Typ notifikácie | — |

---

## 4. 🔔 ASISTANTO-Notifications.mlt2 – **Notifikácie & Správy**

| Pole | Typ | Účel / Popis | Parametre |
|------|-----|---------------|-----------|
| Status / Priorita | ft_str_list | Stav a urgentnosť | Farebné |
| Typ / Zdroj správy | ft_str_list | Kategórie | — |
| Formátovanie | ft_str_list | Text/Markdown/HTML | — |
| info | ft_string | Diagnostika | — |
| Adresát / Skupina / Zákazka | ft_lib_entry / ft_str_list | Prepojenia | — |
| Správa | ft_string | Text správy | — |
| Príloha | ft_file | Upload | — |
| Logy | ft_string | Debug / Chyby | — |
| Chat / Thread ID | ft_string | Telegram info | — |
| Posledná správa / chyba | ft_date_time / ft_string | Timestamps | — |
| Počet správ / Retry Count | ft_int | Limit | — |

---

## 5. 💬 ASISTANTO-Telegram-Groups.mlt2 – **Telegram skupiny**

| Pole | Typ | Účel / Popis | Parametre |
|------|-----|---------------|-----------|
| Názov skupiny | ft_string | Názov | — |
| Typ skupiny | ft_str_list | Všeobecná / HR / Zákazka | — |
| Chat ID / Thread ID | ft_string | ID skupiny / témy | — |
| Má tému | ft_boolean | Téma priradená? | Áno / Nie |
| Popis | ft_rich_text | Detaily | — |
| Povoliť notifikácie | ft_boolean | Aktivácia | — |
| Pracovný čas | ft_time_interval | Interval | — |
| Víkend povolený | ft_boolean | Povolenie víkendu | — |
| Priorita správ | ft_str_list | Úroveň | — |
| Denný limit / Počet správ | ft_int | Limity | — |
| Tichá správa | ft_boolean | Bez notifikácie | — |
| Posledná chyba | ft_string | Diagnostika | — |

---

## 6. 🚗 Kniha-jazd.mlt2 – **Kniha jázd**

| Pole | Typ | Účel / Popis | Parametre |
|------|-----|---------------|-----------|
| Dátum | ft_date | Dátum jazdy | dd.MM.yy |
| Typ / Účel jazdy | ft_str_list | Firemná / Pracovná atď. | Farebné |
| Popis jazdy | ft_string | Voľný text | — |
| Vozidlo / Šofér / Posádka | ft_lib_entry | Prepojenie | — |
| Zákazky | ft_lib_entry | Prepojenie | — |
| Km / Čas jazdy | ft_real | Najazdené km, hodiny | jednotka: km / h |
| Štart / Cieľ / Zastávky | ft_lib_entry | Miesta | — |

---

## 7. 💰 Pokladna.mlt2 – **Pokladňa**

| Pole | Typ | Účel / Popis | Parametre |
|------|-----|---------------|-----------|
| Dátum | ft_date | Dátum pohybu | dd.MM.yy |
| Pohyb | ft_radiobutton | Príjem / Výdavok / PP | Farebné |
| Z / Do pokladne | ft_lib_entry | Miesto pohybu | — |
| Úhrada záväzku / pohľadávky | ft_boolean | Platby | — |
| Typ záväzku / poplatky | ft_str_list | Kategórie | — |
| Z preplatku vytvoriť | ft_radiobutton | Typ záznamu | — |
| Záväzky / pohľadávky | ft_lib_entry | Prepojenia | — |
| Účel výdaja | ft_str_list | Kategórie výdajov | — |
| Evidovať na zákazku | ft_boolean | Zaúčtovanie | — |
| Zákazka | ft_lib_entry | Prepojenie | — |
| Zamestnanec / Dodávateľ | ft_lib_entry | Príjemca | — |
| Stroj / Vozidlo | ft_lib_entry | Odkaz | — |

---

## 8. 📋 Zakazky.mlt2 – **Zákazky**

| Pole | Typ | Účel / Popis | Poznámky |
|------|-----|---------------|-----------|
| Stav / Stav platby | ft_str_list | Stavy | — |
| Typ práce | ft_str_list | Typ realizácie | — |
| Hodinovka / Ceny | ft_subheader / ft_radiobutton | Výpočty | — |
| Cenová ponuka | ft_lib_entry | Prepojenie | — |

---

## 9. 👷 Zamestnanci.mlt2 – **Zamestnanci**

| Pole | Typ | Účel / Popis | Parametre |
|------|-----|---------------|-----------|
| Meno / Priezvisko / Nick | ft_string | Základné info | Nick unikátny |
| Pozícia | ft_radiobutton | Pozícia zamestnanca | — |
| Obdobia | ft_str_list | Reporting | — |
| Odpracované / Jazdy / Na zákazkách | ft_real | Časové polia | jednotka: HOUR |
| Zarobené / Vyplatené / Prémie | ft_money | Finančné hodnoty | jednotka: EUR |
| Saldo / záväzky / pohľadávky | ft_money | Stav účtu | — |
| Hodinovka / mzda | ft_real / ft_money | Mzdové parametre | — |
| Správy posielať | ft_subheader | Nastavenie notifikácií | — |
| sms/email/telegram | ft_boolean/email | Aktivácia | — |
| Mobil | ft_phone | Telefónne číslo | Formát: +### ### ###### |
| info | ft_string | Poznámky | — |

---

## 📝 Poznámky k výkladu

- `ft_lib_entry`: multi-select pre viaceré odkazy, s dodatočnými atribútmi
- Agregované polia: `sum`, `count`, `avg` – vždy uvedený spôsob výpočtu
- Boolean: Áno/Nie (alebo viac, podľa kontextu knižnice)
- Farby: `ft_color` iba pre vizuálne účely
- Diagnostika (`debug`, `error`, `log`) je voliteľná, typicky readonly

---
