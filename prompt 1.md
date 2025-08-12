# TASK: Implementácia komplexných vylepšení MementoUtils.js pre Memento Database

## KONTEXT
Pracujem s JavaScript utility knižnicou **MementoUtils.js** pre Memento Database aplikáciu. Knižnica obsahuje funkcie pre debug logging, safe field access, Link to Entry operácie, validácie, formátovanie a batch processing. Potrebujem implementovať kritické opravy a rozšírenia identifikované počas analýzy kompatibility.

## AKTUÁLNA KNIŽNICA
Moja existujúca MementoUtils.js knižnica používa:
- IIFE pattern s public API
- moment.js pre časové operácie (importovaná cez Memento mechanizmus)
- Konfiguračné konštanty DEFAULT_CONFIG
- Error handling s debug/error/info logging
- Safe field access funkcie
- LinksFrom operácie
- Validácie a formátovanie

## POŽADOVANÉ IMPLEMENTÁCIE

### 1. KRITICKÉ OPRAVY LINK TO ENTRY ATRIBÚTOV
**Problém**: Funkcie `safeSetAttribute()` a `safeGetAttribute()` majú nesprávnu syntax pre Memento API
**Riešenie**: Implementuj správnu syntax kde `setAttr()` a `attr()` sa volajú na link objekte, nie na poli

### 2. AI INTEGRATION MODULE
**Požiadavka**: Kompletný AI systém s podporou pre:
- **API Key Management**: Čítanie kľúčov z knižnice "ASISTANTO Api" s poliami "API Perplexity", "API OpenAi", "AI OpenRouter"  
- **Universal AI Client**: Support pre OpenAI GPT-4o, Perplexity, OpenRouter s rôznymi modelmi
- **Specialized AI Functions**: 
  - `aiAnalyzeEntry()` - analýza záznamov
  - `aiGenerateSQL()` - natural language to SQL konverzia
  - **Vision AI**: `aiAnalyzeInvoice()` - spracovanie faktúr z fotografií
- **Rate limiting a caching** mechanizmy

### 3. ENHANCED SQL MODULE
**Požiadavka**: 
- `smartSQL()` - funkcia ktorá rozpozná natural language vs SQL
- `sqlWithAIInterpretation()` - SQL s AI interpretáciou výsledkov  
- Automatické generovanie SQL z prirodzeného jazyka

### 4. INVOICE PROCESSING SYSTEM
**Špecifikácia**: 
- **Vision AI analýza faktúr** z Photo polí
- **Automatické vyplnenie** Memento polí z AI extrakcie
- **JSON parsing** AI odpovedí do štruktúrovaných dát
- **Field mapping** system pre flexibilné priradenie AI -> Memento polia
- **Batch processing** pre viacero faktúr súčasne

### 5. PERFORMANCE OPTIMALIZÁCIE
- **API key caching** 
- **Library caching** pre často používané knižnice
- **Rate limiting** pre AI volania
- **Error recovery** mechanizmy

## TECHNICAL REQUIREMENTS

### Memento Database API Constraints:
// SPRÁVNE používanie Link to Entry atribútov:
var linkField = entry.field("fieldName");
if (Array.isArray(linkField)) {
linkField.setAttr("attrName", value);
var attrValue = linkField.attr("attrName");
}

// LinksFrom syntax:
var results = sourceEntry.linksFrom("targetLibraryName", "backLinkFieldName");

// Image processing:
var base64 = imageFile.content(); // Pre Photo polia

text

### AI Provider APIs:
- **OpenAI GPT-4o**: Vision support, JSON mode
- **Perplexity**: Online search capabilities  
- **OpenRouter**: Multi-model access, cheaper pricing

### Expected JSON Structure pre faktúry:
{
"dodavatel": {"nazov": "", "ico": "", "dic": "", "adresa": ""},
"faktura": {"cislo": "", "datum_vystavenia": "YYYY-MM-DD", "datum_splatnosti": "YYYY-MM-DD"},
"sumy": {"suma_bez_dph": 0.00, "dph": 0.00, "suma_s_dph": 0.00, "mena": "EUR"},
"polozky": [{"popis": "", "mnozstvo": 0, "jednotka": "", "cena_za_jednotku": 0.00}]
}

text

## IMPLEMENTATION INSTRUCTIONS

1. **Zachovaj existujúcu architektúru** IIFE pattern a public API
2. **Oprav kritické bugs** v Link to Entry operáciách  
3. **Pridaj AI_PROVIDERS** konfiguráciu pre multi-provider support
4. **Implementuj Vision AI** pre invoice processing
5. **Vytvor comprehensive error handling** s fallback mechanizmami
6. **Použij Slovak language** pre error messages a debug výstupy
7. **Optimalizuj pre production** - caching, rate limiting, robust error recovery
8. **Zachovaj backward compatibility** s existujúcimi funkciami

## EXPECTED OUTPUT

Vygeneruj **kompletný, production-ready MementoUtils.js súbor** ktorý:
- ✅ Opravuje všetky identifikované bugs
- ✅ Implementuje AI integration module  
- ✅ Pridáva Vision AI pre faktúry
- ✅ Rozširuje SQL funkcionalitu
- ✅ Obsahuje performance optimalizácie
- ✅ Má comprehensive JSDoc dokumentáciu
- ✅ Je testované a robustné pre Memento Database environment

## PRIORITY
**🔥 HIGH PRIORITY**: Link to Entry opravy, AI Vision pre faktúry
**🔧 MEDIUM**: SQL rozšírenia, performance optimalizácie  
**📚 LOW**: Enhanced documentation, additional utility functions

Prosím implementuj všetky vyššie spomenuté funkcionalyity do jedného koherentného a funkčného MementoUtils.js súboru.