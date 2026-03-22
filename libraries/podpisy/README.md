# Knižnica: podpisy

**ID:** `2fNM2Za4G`
**Interné ID (linkToEntry):** `)rlXnDjIfij&]tfe2hCO`
**Vytvorená:** 2026-03-22

## Účel

Centrálna podpisová knižnica pre všetky knižnice, ktoré vyžadujú potvrdenie (podpis) od zamestnanca.

## Vzťahy

Záznamy v tejto knižnici sú vytvárané ako `linksFrom` z:
- **Dochádzka** → pole `Podpisy` (linkToEntry, multiple=true)
- **Pokladňa** → pole `Podpis` (linkToEntry, multiple=true)

Každý `podpisy` záznam reprezentuje jednu žiadosť o podpis pre konkrétneho zamestnanca.

## Workflow

```
1. Memento action skript vytvorí záznam v podpisy
   - Nastaví: Zamestnanec, Knižnica, Zdroj ID, TG Chat ID
   - Nastaví: Stav = "Čaká"
   - Prepojí linksFrom na zdrojový záznam (Dochádzka / Pokladňa)

2. N8N webhook (request_sign) dostane notifikáciu
   - Prečíta podpisy entry (Zamestnanec, Zdroj ID, Knižnica)
   - Pošle Telegram správu zamestnancovi
   - Uloží TG Správa ID a TG Chat ID do podpisy záznamu
   - Nastaví: Stav = "Čaká"

3. Zamestnanec klikne ✅ / ❌ v Telegrame
   - N8N CONFIRM flow spracuje callback_data: "sign_{podpisId}_{action}"
   - Aktualizuje podpisy.Stav = "Potvrdil" / "Odmietol"
   - Aktualizuje podpisy.Dátum potvrdenia = dnes
   - Vymaže inline keyboard z Telegram správy
   - Odošle notifikáciu do manažérskej skupiny

4. Trigger na zdrojovom zázname (Dochádzka / Pokladňa)
   - Skontroluje všetky prepojené podpisy záznamy
   - Aktualizuje "Stav podpisov" / "Stav podpisu"
   - Ak všetci potvrdili → "Všetci potvrdili" / "Potvrdené" = true
```

## Polia

| ID | Pole | Typ | Popis |
|----|------|-----|-------|
| 3 | Dátum odoslania | date | Kedy bola žiadosť odoslaná |
| 7 | Dátum potvrdenia | date | Kedy zamestnanec potvrdil/odmietol |
| 2 | Zamestnanec | entries → Zamestnanci | Kto má podpísať |
| 4 | Stav | choice | Čaká / Potvrdil / Odmietol / Zrušené |
| 5 | Knižnica | text | Zdrojová knižnica (napr. "Dochádzka") |
| 6 | Zdroj ID | text | Entry ID zdrojového záznamu (pre N8N PATCH) |
| 8 | TG Správa ID | double | message_id Telegram správy |
| 9 | TG Chat ID | double | chat_id zamestnanca |
| 10 | Poznámka | text | Poznámka / námietka zamestnanca |

## N8N callback_data formát

```
sign_{podpisId}_{action}

kde:
  podpisId = ID záznamu v knižnici podpisy
  action   = "confirm" alebo "reject"

Príklady:
  sign_ABC123_confirm
  sign_ABC123_reject
```

## Memento skripty

- `Podp.Action.RequestSign.js` — vytvorí podpisy záznam a spustí N8N webhook
- (plánované)
