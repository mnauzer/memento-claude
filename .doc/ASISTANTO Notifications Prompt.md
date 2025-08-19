*CIEĽ*
Vytvor kompletný JavaScript trigger script pre knižnicu "ASISTANTO Notifikácie" v Memento Database, ktorý automaticky spracuje nové záznamy a odošle Telegram správy na základe konfigurácie polí v zázname.

*KONTEXT SYSTÉMU*
Pracuješ s centralizovaným notification systémom, kde:

ASISTANTO Notifikácie = centrálny hub pre všetky správy

ASISTANTO Telegram Groups = konfiguračná knižnica skupín s nastaveniami

Rôzne zdrojové knižnice (Zamestnanci, Zákazky, Klienti, Partneri) obsahují cieľové údaje

Každý záznam notifikácie má pole "Adresát" ktoré určuje typ cieľa

ŠTRUKTÚRA KNIŽNICE ASISTANTO NOTIFIKÁCIE
Hlavné polia:
javascript
// Klasifikačné polia
"Typ správy": Single Select ["Dochádzka", "Záznam prác", "Kniha jázd", "ToDo", "Manuálna", "Systémová"]
"Zdroj správy": Single Select ["Automatická", "Manuálna", "Naplánovaná"]  
"Status": Single Select ["PENDING", "SENT", "FAILED", "CANCELLED", "SCHEDULED"]
"Priorita správ": Single Select

// Obsah
"Správa": Memo // Hlavný text správy
"Predmet": Text 
"Príloha": Súbor
"Formátovanie": Single Select ["Obyčajný text", "Markdown", "HTML"]

// KĽÚČOVÉ POLE - určuje typ cieľa
"Adresát": Single Select ["Zamestnanec", "Klient", "Partner", "Skupina", "Skupina-Téma"]

// Cieľové prepojenia (LinkToEntry polia)
"Skupina/Téma": Link to Entry → ASISTANTO Telegram Groups
"Zamestnanec": Link to Entry → Zamestnanci
"Zákazky": Link to Entry → Zákazky  
"Klienti": Link to Entry → Klienti
"Partneri": Link to Entry → Partneri

// Časovanie
"Opakovať": Single Select ["Nie", "Každý deň", "Každý týždeň"]

// Response tracking
"Message ID": Text // Telegram message_id po odoslaní
"Debug_Log": Text
"Error_Log": Text
BUSINESS LOGIC POŽIADAVKY
1. TRIGGER PODMIENKY:
Spúšťa sa len pri vytvorení nového záznamu (CREATING trigger)

Spracováva len záznamy so Status = "PENDING"

Ignoruje záznamy s iným statusom

2. ADRESÁT-BASED ROUTING:
A) Adresát = "Zamestnanec":
javascript
// Logika:
- Kontroluj pole "Zamestnanec" (Link to Entry)
- Pre každý záznam zamestnanca:
  - Získaj "Telegram ID" 
  - Skontroluj či je povolené posielanie (checkbox "telegram")
  - Ak áno, pošli individuálnu správu
B) Adresát = "Skupina":
javascript
// Logika:
- Kontroluj pole "Skupina/Téma" (Link to Entry → ASISTANTO Telegram Groups)
- Získaj z ASISTANTO Telegram Groups záznamu:
  - "ID Skupiny" (Telegram skupiny ID)
  - Všetky nastavenia (pracovný čas, povoliť notifikácie, atď.)
  - Synchronizuj nastavenia s aktuálnym záznamom
- Pošli správu do skupiny
C) Adresát = "Skupina-Téma":
javascript
// Logika:
- Rovnako ako "Skupina" + navyše:
- Získaj z ASISTANTO Telegram Groups záznamu:
  - "ID Témy"
- Pošli správu do konkrétnej témy v skupine
D) Adresát = "Zákazka":
javascript
// Logika:
- Kontroluj pole "Zákazka" (Link to Entry → Zákazky)
- Pre každý záznam zákazky:
  - Získaj "Telegram skupina" (Link to Entry → ASISTANTO Telegram Groups, pole "Telegram skupina")
  - Synchronizuj nastavenia z tejto skupiny
  - Pošli správu do zákazka-špecifickej skupiny/témy
E) Adresát = "Klient" / "Partner":
javascript
// Logika:
- Kontroluj pole "Klienti" alebo "Partneri" 
- Pre každý záznam:
  - Získaj "Telegram ID" alebo ekvivalent
  - Pošli individuálnu správu
3. SYNCHRONIZÁCIA NASTAVENÍ:
Pre každý cieľ načítaj z ASISTANTO Telegram Groups:

javascript
// Nastavenia na synchronizáciu:
- "Povoliť notifikácie" (Boolean)
- "Pracovný čas od" / "Pracovný čas do" (Time)
- "Víkend povolený" (Boolean)  
- "Priorita správ" (Single Select)
- "Denný limit správ" (Integer)
- "Tichá správa" (Boolean)
4. TELEGRAM API INTEGRÁCIA:
javascript
// Použij MementoUtils, ak nie je dostupný vypísať error a message o nedostupnosti a ukončiť script
- sendTelegramMessage(options) kde options obsahuje:
  - chatId: string
  - text: string (z poľa "Správa")  
  - parse_mode: string (podľa "Formátovanie")
  - message_thread_id: number (pre témy)
  - disable_notification: boolean (ak "Tichá správa")

// Po úspešnom odoslaní:
- Ulož message_id do poľa "Message ID"
- Nastav Status = "SENT"
- Zaznamenaj čas odoslania

// Pri chybe:
- Nastav Status = "FAILED"  
- Zaznamenaj chybu do "Error_Log"
IMPLEMENTAČNÉ POŽIADAVKY
1. ERROR HANDLING:
Kompletný try-catch pre všetky operácie

Detailné logovanie do Debug_Log a Error_Log polí

Graceful fallback pri nedostupných knižniciach

Validácia všetkých required polí pred odoslaním

2. PERFORMANCE:
Optimalizované načítavanie LinkToEntry záznamov

Batch processing pri viacerých adresátoch

Timeout handling pre API volania

3. BUSINESS RULES:
Rešpektuj pracovný čas a víkend nastavenia

Implementuj denný limit správ

Podporuj retry mechanizmus pri zlyhaniach

Zachovaj audit trail všetkých operácií

4. CODE STRUCTURE:
javascript
// Očakávaná štruktúra:
function main() {
  // 1. Inicializácia a validácia
  // 2. Určenie typu adresáta  
  // 3. Získanie cieľových údajov
  // 4. Synchronizácia nastavení
  // 5. Odoslanie správ
  // 6. Update statusu a logovanie
}

// Helper funkcie:
function determineTargetType(entry)
function getTargetData(entry, targetType)  
function syncSettingsFromGroup(groupEntry)
function sendToTelegram(targetData, message, settings)
function updateNotificationStatus(entry, status, messageId, error)
VÝSTUP
Očakávam kompletný, production-ready JavaScript kód ktorý:

Funguje ako CREATING trigger v knižnici ASISTANTO Notifikácie

Implementuje všetky business rules špecifikované vyššie

Obsahuje robustné error handling a logging

Je optimalizovaný pre výkon v Memento Database prostredí

Má jasnú dokumentáciu a komentáre v kóde

Kód musí byť modulárny, testovateľný a ľahko udržiavateľný pre budúce rozšírenia systému.