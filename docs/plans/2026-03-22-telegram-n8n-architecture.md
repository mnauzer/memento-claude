# Plán: Telegram cez N8N — Implementácia

**Dátum:** 2026-03-22
**Status:** Pripravený na implementáciu
**Fázy:** 1 (Telegram), 2 (MementoSync/Postgres), 3 (AI asistent), 4 (Desktop app)

---

## Kontext a motivácia

Memento Database = **zber dát v teréne** (mobilná appka). Business logika, reporty,
notifikácie a integrácie sa presúvajú na server (reddwarf): N8N + PostgreSQL.

Terajšie Memento skripty (MementoTelegram, MementoAI, komplexná logika) sú prechodné
riešenie — budú sa postupne zjednodušovať. MementoSync zostáva a stáva sa kritickým.

---

## Celková architektúra (target state)

```
Memento (terén)  →  MementoSync  →  PostgreSQL (reddwarf)
                                         ↕
                                        N8N (business logika)
                                         ↕
                              Telegram / Desktop SPA / ďalšie služby
```

---

## Fáza 1: Telegram cez N8N

### Cieľ
Spoľahlivé Telegram notifikácie bez závislosti na MementoAI/MementoTelegram.
Inline keyboard s write-back do Mementa. Manažérska skupina s Topics.

### Predpoklady
- [ ] N8N beží na reddwarf (URL: https://n8n.asistanto.com alebo interná IP)
- [ ] `@KrajinkaAsistantoBot` token: (z ASISTANTO Defaults → "Telegram Bot API Key")
- [ ] Memento API token: `YobxmgbnZ1DTwxyJUIzCLgoAf2Qk0w`
- [ ] Manažérska Telegram skupina vytvorená a bot je člen

---

### Krok 1: Nastavenie N8N

#### 1.1 Credentials
```
Memento API:
  Typ: HTTP Query Auth
  Key: token
  Value: (z .env → MEMENTO_API_KEY)
  Base URL: https://api.mementodatabase.com/v1

Telegram Bot:
  Typ: Telegram API
  Token: (z ASISTANTO Defaults → "Telegram Bot API Key")
```

#### 1.2 Telegram webhook registrácia
N8N automaticky zaregistruje webhook pri použití Telegram Trigger nodu.
Alternatíva cez curl (ak treba manuálne):
```bash
curl "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -d "url=https://n8n.asistanto.com/webhook/telegram-bot"
```

---

### Krok 2: Manažérska skupina — Telegram Forum

Vytvoriť Telegram Supergroup s Topics (Forum):
```
Skupina: Krajinka Management
Topics (vlákna):
  ├── 📊 Denné reporty       → thread_id: ???
  ├── 🏗️ Zákazky             → thread_id: ???
  ├── 💰 Mzdy & Financie     → thread_id: ???
  └── ⚠️ Alerting            → thread_id: ???
```

**Ako zistiť thread_id:** Po vytvorení témy pošli správu do vlákna,
N8N Telegram Trigger zachytí `message.message_thread_id`.

Uložiť do N8N ako Environment variables alebo do ASISTANTO Defaults (Memento).

---

### Krok 3: N8N Flows

#### Flow A: MAIN ROUTER
```
Telegram Trigger (webhook)
  │
  ├─ update_type == "callback_query"  →  [CONFIRM flow]
  ├─ update_type == "message" && text  →  [ASSISTANT flow] (Fáza 3, zatiaľ: "Nerozumiem")
  └─ (ignoruj ostatné)

Webhook Trigger (z Mementa) POST /webhook/memento
  │
  ├─ type == "wage_report"        →  [NOTIFY: Wage Report]
  ├─ type == "attendance_summary" →  [NOTIFY: Attendance]
  └─ type == "order_update"       →  [NOTIFY: Order]
```

#### Flow B: NOTIFY — Wage Report
```
Webhook Trigger: POST /webhook/memento
  Payload: { type: "wage_report", entryId: "...", recipientTgId: "..." }
  │
  ├─ HTTP Request: GET /libraries/nWb00Nogf/entries/{entryId}
  │    (Zamestnanci entry — mzda, dochádzka, vyplatené, balance)
  │
  ├─ Code node: zostaví HTML správu (tabuľka v <pre> bloku)
  │
  ├─ Telegram node: sendMessage
  │    chat_id: recipientTgId
  │    parse_mode: HTML
  │    reply_markup: inline_keyboard:
  │      [✅ Potvrdzujem] [❌ Nesúhlasím]
  │      callback_data: "confirm_wage_{entryId}" / "reject_wage_{entryId}"
  │
  └─ Log do N8N execution log
```

#### Flow C: CONFIRM — Inline Keyboard Callback
```
Telegram Trigger: callback_query
  data: "confirm_wage_{entryId}" alebo "reject_wage_{entryId}"
  │
  ├─ Parse: action (confirm/reject), entryId, userId
  │
  ├─ HTTP Request: PATCH /libraries/nWb00Nogf/entries/{entryId}
  │    body: { fields: [{ name: "Potvrdenie mzdy", value: true/false }] }
  │    (+ "Potvrdil": meno/TgID, "Dátum potvrdenia": now)
  │
  ├─ Telegram node: answerCallbackQuery
  │    (odstráni loading spinner na mobile)
  │
  ├─ Telegram node: editMessageReplyMarkup
  │    (odstráni tlačidlá zo správy — zabraňuje dvojitému kliknutiu)
  │
  └─ Telegram node: sendMessage do manažérskej skupiny
       thread: Mzdy & Financie
       text: "✅ Rasťo Škubal potvrdil výkaz za Marec 2026"
```

#### Flow D: REPORT — Denný report (Schedule)
```
Cron Trigger: každý deň 18:00
  │
  ├─ HTTP Request: GET /libraries/{DennyReport}/entries
  │    filter: dátum == dnes
  │
  ├─ Code node: zostaví súhrn (zákazky, hodiny, príjmy)
  │
  └─ Telegram node: sendMessage
       chat_id: manažérska skupina chat_id
       message_thread_id: Denné reporty thread_id
       parse_mode: HTML
```

---

### Krok 4: Nové polia v Memento (Zamestnanci knižnica)

Pridať do knižnice **Zamestnanci**:

| Pole | Typ | Popis |
|------|-----|-------|
| `Potvrdenie mzdy` | Boolean | Zamestnanec potvrdil výkaz |
| `Dátum potvrdenia` | Date | Kedy potvrdil |
| `Potvrdenie poznámka` | Text | Prípadná poznámka / námietka |

> Po pridaní polí: aktualizovať `MementoConfig.js` → `config.fields.zamestnanci.*`

---

### Krok 5: Zjednodušenie Memento skriptov

Nahradiť v `modules/Zamestnanci.js` funkciu `sendReportToTelegram`:

**Pred (v1.22.0):** priamy `http()` volanie Telegram API
**Po:** jednoduchý webhook trigger do N8N

```javascript
// Nová implementácia sendReportToTelegram (v2.0.0):
sendReportToTelegram: function(employeeEntry, config, utils) {
    var n8nUrl = "https://n8n.asistanto.com/webhook/memento";
    var payload = {
        type: "wage_report",
        entryId: employeeEntry.id,
        recipientTgId: (employeeEntry.field("Telegram ID") || "").trim()
    };
    // Jednoduchý http() POST — žiadna závislosť na MementoAI/MementoTelegram
    var httpObj = http();
    httpObj.headers({ "Content-Type": "application/json" });
    var resp = httpObj.post(n8nUrl, JSON.stringify(payload));
    return resp.code === 200
        ? { success: true }
        : { success: false, error: "N8N webhook error: " + resp.code };
}
```

---

### Krok 6: Potvrdenie dochádzky (samostatný flow)

Podobný mechanizmus pre Dochádzku:

```javascript
// Nové tlačidlo v knižnici Dochádzka:
// "Zam.Action.ConfirmAttendance" → webhook do N8N
// N8N pošle zamestnancovi správu s detailom dňa + inline keyboard
// Callback zapíše "Potvrdenie dochádzky" = true do záznamu
```

Nové polia v **Dochádzka**:

| Pole | Typ | Popis |
|------|-----|-------|
| `Potvrdenie dochádzky` | Boolean | Zamestnanec potvrdil |
| `Dátum potvrdenia` | Date | Kedy |

---

### Testovací postup

1. N8N webhook test: `curl -X POST https://n8n.asistanto.com/webhook/memento -H "Content-Type: application/json" -d '{"type":"wage_report","entryId":"TEST","recipientTgId":"5309883029"}'`
2. Memento: stlač tlačidlo "Odoslať report" → skontroluj Telegram DM
3. Klikni ✅ v Telegram → skontroluj pole "Potvrdenie mzdy" v Memento
4. Skontroluj notifikáciu v manažérskej skupine
5. Schedule: manuálne spusti denný report flow v N8N

---

## Fáza 2: Adaptívny MementoSync → PostgreSQL

### Kľúčová požiadavka: Adaptívny sync
Systém musí automaticky detekovať zmeny v Memento štruktúre:
- Nové pole pridané → auto CREATE COLUMN v Postgres
- Pole premenované → detekcia + alert + migrácia
- Nová knižnica → auto CREATE TABLE
- Zmena typu poľa → alert (vyžaduje manuálnu migráciu)

**Implementačný princíp:**
```
N8N Schedule (každú noc) alebo pri každom syne:
  GET /libraries → porovnaj so schémou v postgres.memento_schema
  Diff → generuj ALTER TABLE / CREATE TABLE SQL
  Aplikuj zmeny → log do N8N
  Alert do manažérskej skupiny ak breaking change
```

PostgreSQL tabuľka `memento_schema`:
```sql
CREATE TABLE memento_schema (
  library_id TEXT,
  library_name TEXT,
  field_id INTEGER,
  field_name TEXT,
  field_type TEXT,
  pg_column TEXT,
  synced_at TIMESTAMP,
  PRIMARY KEY (library_id, field_id)
);
```

*Detailný plán Fázy 2 bude vypracovaný po dokončení Fázy 1.*

---

## Fáza 3: AI Asistent

*Po Fáze 2 — PostgreSQL je source of truth.*

- N8N: Telegram správa → intent detection (Claude API)
- SQL query na PostgreSQL
- Formátovaná odpoveď cez Telegram
- Kontext konverzácie (session v PostgreSQL)
- Bezpečnosť: overenie Telegram ID oproti Zamestnanci knižnici

*Detailný plán bude vypracovaný po dokončení Fázy 2.*

---

## Fáza 4: Desktop / Web SPA

*Dlhodobé. Po Fáze 2.*

- Tech stack TBD (Tauri / Electron / Web SPA)
- Priamo na PostgreSQL
- Fakturácia, rozpočty, sklady, rastliny
- PDF reporty a tlač

*Detailný plán bude vypracovaný samostatne.*

---

## Poznámky k prevádzke

- Systém sa vyvíja **za pochodu v reálnej prevádzke**
- Každá zmena musí byť spätne kompatibilná alebo s migračným skriptom
- N8N execution log je primárny debugging nástroj
- Memento Error_Log zostáva pre Memento-side chyby
- PostgreSQL audit log pre všetky zmeny dát
