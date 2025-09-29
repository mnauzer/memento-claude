# CLAUDE CODE WORKFLOW - POVINNÝ PROCES

## 🚨 POVINNÝ POSTUP PO KAŽDEJ ÚPRAVE/VYTVORENÍ SCRIPTU

### 1. Git Commit a Sync
**VŽDY** po vytvorení alebo úprave akéhokoľvek scriptu:

```bash
# Pridaj súbory do staging
git add .

# Vytvor popisný commit
git commit -m "feat/fix: detailný popis zmien v scripte

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Sync na GitHub
git push origin main
```

### 2. Telegram Notifikácia
**AUTOMATICKY** pošli notifikáciu na Telegram s detailmi:

```bash
curl -X POST "https://api.telegram.org/bot7529072263:AAE60n5-i9iwwhuEHPoy67w9LWDF3ICnAB0/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "7790148295",
    "text": "🎉 *Claude Code dokončil úlohu!*\n\n📋 **Úloha:** [POPIS ÚLOHY]\n\n📝 **Výsledok:**\n[DETAILY ZMIEN]\n\n📁 **Súbory:**\n[ZOZNAM SÚBOROV]\n\n⏰ **Dokončené:** [TIMESTAMP]\n✅ **Status:** Úspešne dokončené\n\n🤖 _Claude Code Assistant_",
    "parse_mode": "Markdown",
    "disable_web_page_preview": true
  }'
```

## 📋 TEMPLATE PRE COMMIT SPRÁVY

### Pre nové scripty:
```
feat: create [NÁZOV SCRIPTU] - [KRÁTKY POPIS]

- Vytvorený nový script pre [ÚČEL]
- Implementované funkcie: [ZOZNAM]
- Integrácia s [MODULY]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pre opravy:
```
fix: resolve [PROBLÉM] in [NÁZOV SCRIPTU]

- Opravené: [KONKRÉTNE CHYBY]
- Zmenené: [ČO SA ZMENILO]
- Testované: [AKO SA TESTOVALO]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pre aktualizácie:
```
update: enhance [NÁZOV SCRIPTU] - [POPIS VYLEPŠENÍ]

- Pridané funkcie: [NOVÉ FUNKCIE]
- Optimalizácie: [VÝKONNOSTNÉ VYLEPŠENIA]
- Refaktorizácia: [ŠTRUKTÚRNE ZMENY]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 🔄 AUTOMATIZÁCIA

### Claude Code Notification Helper
Použiť helper funkciu pre automatické notifikácie:

```javascript
ClaudeNotificationHelper.notifyTaskCompletion(
    "Názov dokončenej úlohy",
    "Detailný popis výsledku a zmien",
    ["zoznam", "upravených", "súborov.js"],
    { priority: "normal" }
);
```

## ⚠️ DÔLEŽITÉ PRAVIDLÁ

1. **NIKDY** neskončiť prácu bez commit + push + notifikácia
2. **VŽDY** použiť popisné commit správy
3. **POVINNÉ** poslať Telegram notifikáciu s detailmi
4. **KONTROLA** že všetky súbory sú v gite
5. **BACKUP** - GitHub je hlavný backup systém
6. **FUNKCIE** - VŽDY kontrolovať existenciu funkcií v MementoUtils pred použitím

## 🔍 KONTROLA EXISTENCIE FUNKCIÍ

### Pred použitím akejkoľvek funkcie z MementoUtils:

1. **Skontroluj dostupné funkcie** v module
2. **Overprecizovať názvy** funkcií (case sensitive)
3. **Testovať** na malých vzorkách pred plnou implementáciou
4. **Dokumentovať** použité funkcie v komentároch

### Časté funkcie MementoUtils:
```javascript
// ✅ SPRÁVNE FUNKCIE (overené):
utils.safeGetLinksFrom(entry, libraryName, fieldName)
utils.safeGet(entry, fieldName, defaultValue)
utils.safeSet(entry, fieldName, value)
utils.addDebug(entry, message, type)
utils.addError(entry, message, source, error)
utils.findValidHourlyRate(employee, date)

// ❌ NEEXISTUJÚCE FUNKCIE (nepoužívať):
utils.safeGetLinksTo() // NEEXISTUJE!
utils.findValidSalary() // MOŽNO NEEXISTUJE - OVERIŤ!
```

### Kontrolný postup:
1. **Pred písaním scriptu** - preskúmaj dostupné funkcie
2. **Počas písania** - overprecizovať názvy funkcií
3. **Po dokončení** - test na funkčnosť všetkých volaní
4. **Pri chybách** - prvá kontrola = existencia funkcií

## 📱 TELEGRAM BOT ÚDAJE

- **Bot Token:** `7529072263:AAE60n5-i9iwwhuEHPoy67w9LWDF3ICnAB0`
- **Chat ID:** `7790148295` (Rasťo)
- **Format:** Markdown
- **Webhook URL:** `http://localhost:5678/webhook/claude-completion`

## 🎯 CÚL

Zabezpečiť že:
- ✅ Všetky zmeny sú zazálohované na GitHub
- ✅ Rasťo je okamžite informovaný o dokončených úlohách
- ✅ História zmien je presne zdokumentovaná
- ✅ Žiadna práca sa nestratí

---

**TENTO PROCES JE POVINNÝ PRE KAŽDÚ ÚPRAVU KÓDU!**