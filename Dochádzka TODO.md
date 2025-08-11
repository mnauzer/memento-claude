* Dochádzka:
-* Scripty - 
	-** Prepočítať záznam
	- Polia:
	Príchod - zaokrúhliť na 15min
	Odchod - zaokrúhliť na 15min
	Počet pracovníkov: počet záznamov v poli Zamestnanci
	Pracovná doba: Odchod - Príchod, v hodinách (desiatková sústava napríklad 7,75)
	Doplnenie a výpočty atribútov objektov zamestnancov v poli Zamestnanci:
	- odpracované: Pracovná doba
	- hodinovka: zistiť aktuálnu hodinovú sadzbu ku dňu v poli Dátum z knižnice Zamestnanci (objekt Zamestnanec v poli Zamestnanci -> linksFrom("sadzby zamestnancov","Zamestnanec")
	- denná mzda: "denná mzda" = ("odpracované" * "hodinovka") + ("odpracované" * "+príplatok (€/h)") + "+prémia (€)" - "-pokuta (€)"
	Odpracované: Počet pracovníkov * Pracovná doba, v hodinách (desiatková sústava napríklad 7,75)
	Mzdové náklady: súčet atribútu "denná mzda" z každého záznamu (objektu) v poli Zamestnanci
    Vyplniť pole info: informácie ako vznikol záznam a ako boli prepočítané jeho hodnoty - pozri "Dochádzka Knowledge base.md"
    Zaznamenať štandardný Debug a Error log, vždy vymazať staré údaje pred novým záznamom

	-** Sync záväzky
	vytvoriť nové záznamy v Záväzky pre každého zamestnanca v poli Zamestnanci ak neexistujú
	ak existujú - upraviť v záväzkoch pole Suma a pole Zostatok (Suma - Zaplatené), 
	ak je Zostatok > 0, nastaviť stav na Čiastočne uhradené
	ak je Zostatok = 0 nastaviť stav na Neuhradené
	nastaviť polia: 
		- Zamestnanec - objekt záznamu zamestnanca
		- Typ - Mzda
		- Veriteľ - Zamestnanec
		- Popis: vzor: "Mzda zamestnanca Nick (Priezvisko) za deň dátum"



