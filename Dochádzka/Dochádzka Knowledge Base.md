*Dochádzka Knowledge Base*

Polia:
    zamestnanci: "Zamestnanci", linkToEntry záznamy v knižnici Zamestnanci
        - atribúty:
        "odpracované" - vypočítava script
        "hodinovka" - zisťuje script, aktuálna hodinová sadzba zamestnanca k dátumu Dátum
        "+príplatok (€/h)" - vypĺňa užívateľ
        "+prémia (€)" - vypĺňa užívateľ
        "-pokuta (€)" - vypĺňa užívateľ
        "denná mzda" - vypočítava script, "denná mzda" = ("odpracované" * "hodinovka") + ("opracované" * "+príplatok (€/h)") + "+prémia (€)" - "-pokuta (€)"
        "poznámka" - vypĺňa užívateľ

    "Dátum" - zadáva užívateľ
    "Príchod" - zadáva užívateľ, script zaokrúľuje na 15min
    "Odchod" - zadáva užívateľ, script zaokrúľuje na 15min
    "Pracovná doba" - vypočítava script, "Pracovná doba" = "Odchod" - "Príchod", výsledok v hodinách desiatkovej sústavy (6,75h)
    "Odpracované" - vypočítava script, "Odpracované" = "Pracovná doba" * počet zamestnancov (záznamov) v poli Zamestnanci
    "Počet pracovníkov" - vypočítava script počet zamestnancov (záznamov) v poli Zamestnanci
    "Mzdové náklady" - vypočítava script, spočíta hodnotu atribútu "denná mzda" každého záznamu zamestnanca v poli Zamestnanci
    "Záväzky" - checkbox, vypočítava script, ak sa úspešne vytvorili záväzky pre každého zamestnanca v poli Zamestnanci, označiť true
    "info" - zapisuje script
    "Debug_Log" - zapisuje script
    "Error_Log" - zapisuje script

Prepojené knižnice (linksFrom):
    "sadzby zamestnancov" - záznamy v poli Zamestnanci, zisťuje sa aktuálna hodinová sadzba entry().field("Zamestnanci")[i].linksFrom("sadzby zamestnancov", "Zamestnanec")
    "Záväzky" - linksFrom("Záväzky","Dochádzka") - mal by byť vytvorený záväzok pre každého zamestnanca v poli Zamestnanci, ak je označiť checkbox Záväzky true
Popis