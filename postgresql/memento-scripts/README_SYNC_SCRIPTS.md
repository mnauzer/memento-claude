# Memento → PostgreSQL Sync Scripts

## Prehľad

Tri skripty pre synchronizáciu medzi Memento Database a PostgreSQL:

### 1. Universal.BulkAction.SyncToPostgreSQL.js
**Účel:** Syncuje **aktívne záznamy** z Memento do PostgreSQL

**Použitie:**
- Spusti ako Bulk Action v knižnici
- Syncuje LEN aktívne záznamy (nie kôš!)
- Status v PostgreSQL: `active`

**Kedy použiť:**
- Prvotná synchronizácia celej knižnice
- Pravidelný re-sync aktívnych záznamov
- Po vytvorení/úprave záznamov v Memento

**Príklad:**
```
Partneri: 10 aktívnych záznamov, 4 v koši
→ Syncuje 10 aktívnych
→ 4 v koši sa NEsyncujú
```

---

### 2. Universal.BulkAction.SyncTrashToPostgreSQL.js
**Účel:** Označí záznamy z **koša** ako deleted v PostgreSQL

**Použitie:**
- Spusti ako Bulk Action v knižnici
- Syncuje LEN záznamy v koši
- Status v PostgreSQL: `deleted`

**Kedy použiť:**
- Po presunutí záznamov do koša v Memento
- Chceš označiť záznamy ako vymazané v PostgreSQL
- Záznamy ostanú v PostgreSQL (soft delete)

**Príklad:**
```
Partneri: 10 aktívnych, 4 v koši
→ Syncuje 4 záznamy z koša
→ Označí ich ako status='deleted' v PostgreSQL
→ Záznamy ostávajú v databáze (nie sú permanentne vymazané)
```

---

### 3. Universal.Trigger.DeleteToPostgreSQL.js
**Účel:** **Permanentne vymaže** záznam z PostgreSQL pri vymazaní z koša

**Použitie:**
- Nastav ako **After Delete trigger** v každej knižnici
- Automaticky sa spustí pri permanentnom vymazaní
- Volá DELETE API endpoint

**Kedy použiť:**
- Automaticky - nastaví sa raz ako trigger
- Pri permanentnom vymazaní z koša v Memento
- Vymaže záznam aj z PostgreSQL (hard delete)

**Inštalácia:**
1. Choď do knižnice (napr. Partneri)
2. Settings → Triggers → Add Trigger
3. Type: **After Delete**
4. Paste tento script
5. Save

**Príklad flow:**
```
1. Záznam v Memento (aktívny) → PostgreSQL (status='active')
2. Presun do koša → Spusti SyncTrashToPostgreSQL → PostgreSQL (status='deleted')
3. Vymaž z koša → After Delete trigger → VYMAŽE z PostgreSQL
```

---

## Workflow

### Normálny workflow:
1. **Vytvorenie/úprava záznamov** → Spusti `SyncToPostgreSQL.js`
2. **Presun do koša** → Spusti `SyncTrashToPostgreSQL.js` (voliteľné)
3. **Permanentné vymazanie** → After Delete trigger automaticky vymaže z PostgreSQL

### Prvotná synchronizácia:
1. Spusti `SyncToPostgreSQL.js` v každej knižnici → Syncuje všetky aktívne záznamy
2. (Voliteľne) Spusti `SyncTrashToPostgreSQL.js` → Syncuje kôš ako deleted
3. Nastav `DeleteToPostgreSQL.js` trigger v každej knižnici → Automatická synchronizácia delete

---

## Stavy záznamov

| Stav v Memento | PostgreSQL status | Ako sa tam dostal |
|----------------|-------------------|-------------------|
| Aktívny záznam | `active` | SyncToPostgreSQL.js |
| V koši | `deleted` | SyncTrashToPostgreSQL.js |
| Vymazaný z koša | *vymazaný* | DeleteToPostgreSQL.js trigger |

---

## Podporované knižnice

- ✅ Zamestnanci → `memento_employees`
- ✅ Klienti → `memento_clients`
- ✅ Partneri → `memento_partners`
- ✅ Dodávatelia → `memento_suppliers`

---

## Konfigurácia

Vo všetkých skriptoch nastav:
```javascript
var CONFIG = {
    apiUrl: 'http://192.168.5.241:8889',
    apiKey: 'tvoj-api-kluc-sem',
    timeout: 10000
};
```

---

## Otázky a odpovede

**Q: Prečo sa syncujú aj záznamy z koša?**
A: `SyncToPostgreSQL.js` syncuje LEN aktívne záznamy. Ak vidíš záznamy z koša v PostgreSQL, buď:
   - Boli syncnuté pred presunom do koša
   - Použil si `SyncTrashToPostgreSQL.js` aby si ich označil ako deleted

**Q: Ako vymazať záznamy z PostgreSQL?**
A: Dvoma spôsobmi:
   1. Permanentne vymaž z koša v Memento → After Delete trigger automaticky vymaže z PG
   2. Manuálne cez SQL: `DELETE FROM memento_partners WHERE status='deleted'`

**Q: Čo je "soft delete" vs "hard delete"?**
A:
   - **Soft delete** = Záznam ostáva v PostgreSQL, len má status='deleted' (SyncTrashToPostgreSQL)
   - **Hard delete** = Záznam sa fyzicky vymaže z PostgreSQL (DeleteToPostgreSQL trigger)

**Q: Musím nastaviť trigger pre každú knižnicu?**
A: Áno, After Delete trigger musíš pridať do každej knižnice, ktorú syncuješ.

---

## Verzie

- **SyncToPostgreSQL.js** - v4.3 (2026-03-18)
- **SyncTrashToPostgreSQL.js** - v1.0 (2026-03-18)
- **DeleteToPostgreSQL.js** - v1.0 (2026-03-18)
