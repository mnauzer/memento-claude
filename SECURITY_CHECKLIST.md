# Security Checklist - Memento Claude Project

## ✅ Pre-Push Checklist

Pred pushom do verejného GitHub repozitára skontrolujte:

### 🔒 Kritické (MUSÍ byť hotové)

- [ ] **API kľúč rotovaný** - Starý kľúč `hx7GjATH8FtqljeQeoU24Oy495oCGi` revokovaný
- [ ] **Nový API kľúč nastavený** v `.env` súboroch (lokálne, nie v git)
- [ ] **Git história vyčistená** - Spustený `cleanup-git-history.sh`
- [ ] **Žiadne .env súbory v git** - `git ls-files | grep .env` by malo vrátiť len `.env.example`
- [ ] **Pre-commit hook nainštalovaný** - Existuje `.git/hooks/pre-commit`

### ⚠️ Dôležité (Odporúčané)

- [ ] **Backup vytvorený** pred cleanup git histórie
- [ ] **Lokálne .env súbory skontrolované** - Obsahujú nový API kľúč
- [ ] **MEMENTO_API_ACCESS.md skontrolovaný** - Žiadne skutočné API keys
- [ ] **Personal paths odstránené** - Žiadne `/home/rasto/` cesty

### 📋 Voliteľné (Nice to have)

- [ ] Security policy prečítaná (`SECURITY.md`)
- [ ] `.env.example` aktuálny
- [ ] Git hooks fungujú (test commit)

---

## 🚀 Quick Start (Prvé použitie)

### 1. Rotovať API kľúč
```bash
# Prejdi na: https://mementodatabase.com/settings/api
# 1. Revokuj starý kľúč: hx7GjATH8FtqljeQeoU24Oy495oCGi
# 2. Vygeneruj nový kľúč
# 3. Skopíruj nový kľúč
```

### 2. Nastaviť nový kľúč lokálne
```bash
# Vytvor .env súbor (ak neexistuje)
cp .env.example .env

# Uprav .env a vlož nový kľúč
# MEMENTO_API_KEY=tvoj_novy_kluc_tu

# Rovnako aktualizuj config/.env ak existuje
```

### 3. Vyčistiť git históriu
```bash
# Spusti cleanup script
bash cleanup-git-history.sh

# Odpoveď 'YES' na confirm prompt
# Počkaj na dokončenie
```

### 4. Overiť že je čisto
```bash
# Skontroluj že starý kľúč nie je v histórii
git log --all --source -S "hx7GjATH" --oneline
# (malo by vrátiť prázdny výstup alebo len cleanup commit)

# Skontroluj aktuálne súbory
grep -r "hx7GjATH" . --exclude-dir=.git
# (malo by vrátiť len tento checklist a cleanup script)
```

### 5. Push do GitHub
```bash
# Prvý push bude vyžadovať force (kvôli rewritten history)
git push --force origin main

# Nastaviť upstream pre budúce pushe
git branch --set-upstream-to=origin/main main
```

---

## 🔍 Verifikačné Príkazy

### Skontrolovať git tracked súbory
```bash
# Zobraziť všetky tracked súbory
git ls-files

# Skontrolovať že .env nie je tracked
git ls-files | grep "^\.env$"  # malo by vrátiť nič

# Skontrolovať že bezpečnostné súbory sú tracked
git ls-files | grep -E "SECURITY.md|CLAUDE.md|.env.example"
```

### Skontrolovať citlivé dáta
```bash
# V súčasných súboroch
grep -r "hx7GjATH" . --exclude-dir=.git --exclude="*.sh" --exclude="SECURITY_CHECKLIST.md"

# V git histórii
git log --all --source -S "hx7GjATH" --oneline

# V staged changes pred commitom
git diff --cached | grep -iE "(api.*key|token|password|secret)"
```

### Test pre-commit hooku
```bash
# Vytvoriť test súbor s fake API key
echo "test api key: sk-test123456789" > test-secret.txt
git add test-secret.txt
git commit -m "test"
# Malo by zablokovať commit!

# Cleanup test
git reset HEAD test-secret.txt
rm test-secret.txt
```

---

## ❗ Čo robiť ak...

### Náhodne commitol som .env súbor
```bash
# 1. Odstráň zo staged
git reset HEAD .env

# 2. Ak už commitnutý, amend commit
git reset --soft HEAD~1
git reset HEAD .env
git commit -m "your message"

# 3. Ak už pushnutý - ROTUJ KĽÚČE OKAMŽITE!
```

### Našiel som API kľúč v git histórii
```bash
# 1. Spusti cleanup script znova
bash cleanup-git-history.sh

# 2. Force push
git push --force origin main

# 3. ROTUJ KĽÚČ!
```

### Pre-commit hook nefunguje
```bash
# Re-install hook
bash install-hooks.sh

# Skontroluj permissions
ls -la .git/hooks/pre-commit
# Malo by byť executable (-rwxr-xr-x)

# Ak nie, pridaj execute permission
chmod +x .git/hooks/pre-commit
```

### Cleanup script zlyhal
```bash
# Restore z backupu
git branch -a | grep backup-
git checkout backup-YYYYMMDD-HHMMSS

# Skús cleanup manuálne s git filter-branch
# (pozri SECURITY.md)
```

---

## 📞 Pomoc

- **Security issues**: Vytvor private security advisory na GitHub
- **Dokumentácia**: Pozri `SECURITY.md`
- **Git hooks**: Pozri `.git-hooks/pre-commit.sample`
- **Cleanup script**: Pozri `cleanup-git-history.sh`

---

**Posledná aktualizácia:** 2026-03-17
**Verzia:** 1.0

**Status checklistu:**
- [ ] Všetky kritické položky hotové
- [ ] Overené verifikačnými príkazmi
- [ ] Ready pre push do public repo
