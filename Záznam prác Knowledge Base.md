*Záznam prác Knowledge Base*
currentEntry:
Polia:
    "Dátum" - zadáva užívateľ
    "Zákazka" - linkToEntry záznamy v knižnici "Zákazky"
    "Od" - zadáva užívateľ, script zaokrúľuje na 15min
    "Dp" - zadáva užívateľ, script zaokrúľuje na 15min
    "Zamestnanci" - linkToEntry záznamy v knižnici Zamestnanci
        - atribúty:
        "odpracované" - vypočítava script
        "hodinovka" - zisťuje script, aktuálna hodinová sadzba zamestnanca k dátumu Dátum
        "mzdové náklady" - vypočítava script, "mzdové náklady" = ("odpracované" * "hodinovka")"
    "Hodinová zúčtovacia sadzba" - zadá užívateľ alebo sa vyberie automaticky scriptom
        - atribút: "cena"
    "Vykonané práce" - zadá užívateľ, popis prác vykonaných na zákazke
    "Pracovná doba" - vypočítava script, "Pracovná doba" = "Odchod" - "Príchod", výsledok v hodinách desiatkovej sústavy (6,75h)
    "Odpracované" - vypočítava script, "Odpracované" = "Pracovná doba" * počet zamestnancov (záznamov) v poli Zamestnanci
    "Počet pracovníkov" - vypočítava script počet zamestnancov (záznamov) v poli Zamestnanci
    "Mzdové náklady" - vypočítava script, spočíta hodnotu atribútu "mzdové náklady" každého záznamu zamestnanca v poli Zamestnanci
    "Suma HZS" - vypočíta sa automaticky scriptom, "Suma HZS" = "Odpracované" * atribút "cena" záznamu v poli "Hodinová zúčtovacia sadzba"
    "info" - zapisuje script
    "Debug_Log" - zapisuje script
    "Error_Log" - zapisuje script

Prepojené knižnice (linksFrom):
    "sadzby zamestnancov" - záznamy v poli Zamestnanci, zisťuje sa aktuálna hodinová sadzba entry().field("Zamestnanci")[i].linksFrom("sadzby zamestnancov", "Zamestnanec")
    "Hodinová zúčtovacia sadzba" - linkToEntry do knižnice "ASISTANTO Defaults", v tomto zázname pole linkToEntry do knižnice "Cenník prác", zistiť poslednú aktuálnu cenu linksFrom z knižnice "ceny prác", túto cenu doplniť do poľa "Cena" v zázname knižnice "Cenník prác". Ak záznam v knižnici "Cenník prác" nemá záznamy linksFrom v knižnici "ceny prác", použije sa cena v poli "Cena" tohto záznamu

    Nový záznam (currentEntry) v knižnici "Záznam prác" zisťuje zo záznamu poľa "Zákazka" existenciu linksFrom záznamu z knižnice "Výkaz prác", ak existuje, vytvorí (pridá) spätný link na tento currentEntry záznam v poli "Práce HZS", atribúty tohto linku vyplní následovne:
        - "vykonané práce" - currentEntry pole "Vykonané práce"
        - "počet hodín" - currentEntry pole "Odpracované"
        - "účtovaná sadzba" - currentEntry pole "Hodinová zúčtovacia sadzba" atribút "cena"
        - "cena celkom" - "cena celkom" = "počet hodín" * "účtovaná sadzba"