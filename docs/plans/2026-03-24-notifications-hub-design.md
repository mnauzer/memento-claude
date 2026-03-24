# Notifications Hub — Architektúra a dizajn

**Dátum:** 2026-03-24
**Status:** Dizajn schválený, pripravený na implementáciu
**Autor:** Claude Code + Rasťo

---

## 1. Problém a motivácia

### Súčasné problémy

1. **TG mazanie správ pri delete**: BeforeDelete (synchronný) vie čítať polia ale nemôže volať http(). AfterDelete (asynchrónny) vie volať http() ale entry je už v koši — polia nečitateľné. Aktuálny workaround cez ASISTANTO Logs je krehký.

2. **Nespoľahlivé triggery**: Memento triggery (AfterSave, scheduled time) fungujú len keď je app aktívna na telefóne. Cross-library triggery (záznam vytvorený scriptom v inej knižnici) nefungujú spoľahlivo.

3. **Rate limity**: Priame http() volania z Mementa nemajú retry logiku. API 429 = stratená správa.

4. **Roztrúsená logika**: TG operácie sú rozhádzané po rôznych triggeroch a knižniciach. Žiadny centrálny bod.

### Riešenie

**Notifications Hub** = centrálna queue knižnica v Memento + N8N ako serverový procesor.

---

## 2. Celková architektúra

```
┌─────────────────────────────────────────────────────┐
│                  MEMENTO DATABASE                     │
│                                                       │
│  Dochádzka ──┐                                       │
│  Pokladňa ───┤── create() ──→ NOTIFICATIONS ◄──┐    │
│  Podpisy ────┤                  (hub/queue)     │    │
│  Denný rep. ─┤                     │            │    │
│  Zákazky ────┘                     │         PATCH   │
│                                    │         (status)│
└────────────────────────────────────┼────────────┼────┘
                                     │            │
                              Memento API         │
                              (poll každé 2min)   │
                                     │            │
┌────────────────────────────────────┼────────────┼────┐
│                    N8N             │            │    │
│                                    ▼            │    │
│  ┌─────────┐   ┌──────────┐   ┌────────┐      │    │
│  │  CRON   │──→│ GET Čaká │──→│ SWITCH │      │    │
│  │ 2 min   │   │ entries  │   │  typ   │      │    │
│  └─────────┘   └──────────┘   └───┬────┘      │    │
│                                    │           │    │
│                    ┌───────┬───────┼───────┐   │    │
│                    ▼       ▼       ▼       ▼   │    │
│                  SEND    EDIT   DELETE   STATUS │    │
│                   │       │       │       │    │    │
│                   ▼       ▼       ▼       ▼   │    │
│               ┌──────────────────────────────┐│    │
│               │     TELEGRAM BOT API         ││    │
│               └──────────────────────────────┘│    │
│                          │                     │    │
│                    UPDATE Notification ─────────┘    │
│                    (Status, Message ID, retry)       │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  TELEGRAM   │
                    │  (správy)   │
                    └─────────────┘
```

### Princípy

1. **Memento skripty** len vytvárajú záznamy v Notifications — žiadne HTTP volania
2. **N8N** je jediný kto komunikuje s Telegram API
3. **N8N** zapisuje výsledky späť do Mementa (Notification status + zdrojový záznam)
4. **Callbacks** (potvrdenia) prichádzajú cez N8N webhook → update Notification + zdrojový záznam
5. **Šablóny** z knižnice TG Šablóny — zmena textu bez zmeny kódu

---

## 3. Typy operácií

### Choice pole "Typ operácie" v Notifications

| Hodnota | Kedy sa použije | TG API endpoint |
|---------|----------------|-----------------|
| `SEND` | Nová správa (potvrdenie, report) | `sendMessage` |
| `EDIT` | Update existujúcej správy (zákazky, denný report) | `editMessageText` |
| `DELETE` | Mazanie TG správy (pri delete záznamu) | `deleteMessage` |
| `STATUS_UPDATE` | Callback od zamestnanca → update zdroja | žiadny TG call, len PATCH |

### Kedy použiť EDIT vs DELETE+SEND

| Kontext | Operácia | Dôvod |
|---------|----------|-------|
| Denný report update | `EDIT` | Správa zostane na mieste v kanáli |
| Zákazka update | `EDIT` | Stabilná pozícia, prehľadné |
| Odmietnutá dochádzka → nová správa | `DELETE` + `SEND` | Zamestnanec vidí novú notifikáciu |
| Opravený podpis | `DELETE` + `SEND` | Zamestnanec vidí nový request |

---

## 4. Notifications — polia

### Existujúce polia (overené cez MCP)

| Pole | ID | Typ | Stav |
|------|-----|-----|------|
| Status | - | Choice | ✅ Existuje — rozšíriť o "Potvrdené", "Odmietnuté" |
| Chat ID | 2 | Text | ✅ |
| Message ID | 3 | Text | ✅ |
| Thread ID | 10 | Text | ✅ |
| Retry Count | - | Number | ✅ |
| Retry After | - | Number | ✅ |
| Next Retry At | - | DateTime | ✅ |
| Zdrojová knižnica | - | Text | ✅ |
| Zdrojový ID | - | Text | ✅ |

### Nové / na overenie

| Pole | Typ | Účel |
|------|-----|------|
| **Typ operácie** | Choice: SEND, EDIT, DELETE, STATUS_UPDATE | **NOVÉ** — čo má N8N spraviť |
| **Šablóna** | Text | Názov šablóny z TG Šablóny |
| **Dáta** | Text (long) | JSON s dátami pre šablónu |
| **Inline Keyboard** | Text (long) | JSON s tlačidlami |
| **Callback Data** | Text | Dáta pre callback identifikáciu |
| **Text** | Text (long) | Priamy text (ak bez šablóny) |

### Životný cyklus záznamu

```
SEND:    Čaká → [N8N sendMessage] → Odoslané (+ Message ID)
                                   → Zlyhalo → retry → Odoslané | Chyba

EDIT:    Čaká → [N8N editMessage] → Odoslané

DELETE:  Čaká → [N8N deleteMessage] → Odoslané → (trash)

CALLBACK → Potvrdené / Odmietnuté
```

---

## 5. Vzory použitia

### Vzor 1: Potvrdenie (Dochádzka / Pokladňa → zamestnanec)

```
1. AfterSave trigger v zdrojovej knižnici
2. Prečíta dáta, nájde Telegram ID zamestnanca
3. Vytvorí Notification:
     Typ=SEND, Chat ID, Šablóna, Dáta (JSON), Keyboard
     Zdroj: knižnica + entryId, Status: Čaká
4. N8N poll (do 2 min):
     - Načíta šablónu z TG Šablóny
     - Vyplní dátami → finálny text
     - sendMessage → Telegram
     - Update: Status=Odoslané, Message ID
5. Zamestnanec klikne "✅ Súhlasím":
     - TG callback → N8N webhook
     - Update Notification: Potvrdené
     - PATCH zdrojový záznam: Stav=Potvrdená
6. Zamestnanec klikne "❌ Nesúhlasím":
     - Update Notification: Odmietnuté
     - PATCH zdrojový záznam: Stav=Odmietnutá
     - Vytvorí NOVÚ Notification SEND → manažér (eskalácia)
       Šablóna: "odmietnutie_eskalacia"
       Keyboard: [{text:"📝 Opravím", data:"ACK_REJECT"}]
7. Manažér opraví záznam v Memento:
     - AfterSave: DELETE stará správa + SEND nová zamestnancovi
```

### Vzor 2: Živý report (Denný report / Zákazky → TG kanál)

```
1. AfterSave trigger v zdrojovej knižnici
2. Skontroluje: existuje TG Správa ID v zázname?
     ÁNO → Notification Typ=EDIT, Message ID=existujúce
     NIE → Notification Typ=SEND
3. Šablóna + dáta → N8N spracuje
4. N8N po SEND uloží Message ID späť do zdrojového záznamu
5. Pri ďalšej zmene → EDIT s rovnakým Message ID
```

### Vzor 3: TG mazanie (delete podpisu)

```
1. BeforeDelete trigger:
     - Prečíta chatId, messageId, followupId (funguje v sync triggeri)
     - Vytvorí Notification Typ=DELETE pre každý messageId
     - Žiadny http(), žiadny AfterDelete, žiadny ASISTANTO Logs hack
2. N8N poll:
     - deleteMessage → Telegram
     - Update Status=Odoslané
     - Trash Notification záznam
```

---

## 6. N8N Flows

### Flow 1: Notification Processor (Cron 2 min)

```
CRON 2min
  → GET Notifications (Status="Čaká" + Retry Count < 3)
  → Loop cez záznamy
    → SWITCH (Typ operácie)
      → SEND:
          1. GET šablónu z TG Šablóny (Template Resolver)
          2. Vyplň placeholdery dátami
          3. sendMessage (TG API)
          4. PATCH Notification: Status=Odoslané, Message ID
          5. PATCH zdrojový záznam (ak treba — napr. Message ID)
      → EDIT:
          1. GET šablónu + vyplň dáta
          2. editMessageText (TG API)
          3. PATCH Notification: Status=Odoslané
      → DELETE:
          1. deleteMessage (TG API)
          2. PATCH Notification: Status=Odoslané
          3. Trash Notification (cleanup)
    → AK CHYBA:
          Retry Count++
          Status = Zlyhalo (alebo Chyba ak Retry ≥ 3)
```

### Flow 2: Callback Handler (Webhook — rozšírenie existujúceho)

```
TG Callback Webhook
  → Parse callback_data: "ACTION|LIBRARY|ENTRY_ID"
  → Nájdi Notification podľa Message ID
  → SWITCH (ACTION)
    → CONFIRM:
        1. PATCH Notification: Status=Potvrdené
        2. PATCH zdrojový záznam: Stav=Potvrdená
        3. answerCallbackQuery: "✅ Ďakujem"
    → REJECT:
        1. PATCH Notification: Status=Odmietnuté
        2. PATCH zdrojový záznam: Stav=Odmietnutá
        3. Vytvor novú Notification SEND → manažér (eskalácia)
        4. answerCallbackQuery: "❌ Odoslané administrátorovi"
    → ACK_REJECT:
        1. PATCH eskalačná Notification: Status=Acknowledged
        2. answerCallbackQuery: "📝 Prijaté"
```

### Flow 3: Template Resolver (Sub-workflow)

```
Vstup: šablóna_id, dáta (JSON)
  → GET šablónu z TG Šablóny (Memento API)
  → Nahraď {{placeholdery}} dátami
  → Výstup: hotový text správy
```

---

## 7. Memento skripty — zmeny

### Univerzálna helper funkcia

```javascript
function createNotification(params) {
    var notifLib = libByName("Notifications");
    var n = notifLib.create({});
    n.set("Typ operácie", params.typ);
    n.set("Chat ID", String(params.chatId));
    n.set("Šablóna", params.sablona || "");
    n.set("Dáta", params.data || "");
    n.set("Text", params.text || "");
    n.set("Message ID", params.messageId || "");
    n.set("Inline Keyboard", params.keyboard || "");
    n.set("Zdrojová knižnica", params.zdroj || "");
    n.set("Zdrojový ID", params.zdrojId || "");
    n.set("Status", "Čaká");
    return n;
}
```

### Čo sa zruší

| Súčasný komponent | Akcia |
|--------------------|-------|
| `Podp.Trigger.AfterDelete.js` | ZRUŠIŤ — N8N robí DELETE |
| ASISTANTO Logs hack (PENDING_TG_DELETE) | ZRUŠIŤ — Notifications je queue |
| `MementoSign.deleteMessage()` v triggeroch | ZRUŠIŤ — N8N volá TG API |
| Priame `http()` volania v triggeroch | ZRUŠIŤ — všetko cez Notification |

### Čo sa zjednoduší

| Skript | Zmena |
|--------|-------|
| `Podp.Trigger.BeforeDelete.js` | Ochrana + createNotification(DELETE) |
| Podpisy odosielanie | createNotification(SEND) namiesto MementoSign |
| Dochádzka notifikácie | createNotification(SEND) s potvrdením |
| Pokladňa notifikácie | createNotification(SEND) s potvrdením |
| Denný report | createNotification(SEND/EDIT) |
| Zákazky report | createNotification(SEND/EDIT) |

---

## 8. Retry logika

Jednoduchá — 3 pokusy, bez exponential backoff (desiatky správ denne):

```
Pokus 1: Zlyhalo → Retry Count = 1, Status = Zlyhalo
Pokus 2: Zlyhalo → Retry Count = 2, Status = Zlyhalo
Pokus 3: Zlyhalo → Retry Count = 3, Status = Chyba (permanentné)
```

N8N pri každom poll spracuje záznamy kde:
- `Status = "Čaká"` ALEBO
- `Status = "Zlyhalo"` AND `Retry Count < 3`

---

## 9. Konfiguračné konštanty

```
MEMENTO_TOKEN:         YobxmgbnZ1DTwxyJUIzCLgoAf2Qk0w
BOT_TOKEN:             (z ASISTANTO API knižnice)
NOTIFICATIONS_LIB_ID:  mRERW8SrY
POLL_INTERVAL:         2 minúty
MAX_RETRIES:           3
MANAGEMENT_CHANNEL_ID: (TBD — TG kanál pre management)
```

---

## 10. Výhody oproti súčasnému stavu

| Aspekt | Predtým | Teraz |
|--------|---------|-------|
| TG mazanie | BeforeDelete→Logs→AfterDelete hack | BeforeDelete→Notification→N8N |
| http() v sync triggeri | Nefunguje (InternalError) | Nepotrebné |
| Spoľahlivosť | Závisí od telefónu | N8N 24/7 na serveri |
| Retry | Žiadny | Automatický (3 pokusy) |
| Audit trail | Žiadny | Každá operácia = Notification záznam |
| Zmena textu správy | Zmena kódu | Zmena šablóny |
| Pridanie knižnice | Nový TG kód | Len createNotification() |
| Komplexnosť skriptov | 50+ riadkov TG logiky | 5 riadkov |
