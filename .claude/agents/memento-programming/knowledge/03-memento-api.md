# Memento Database API Reference

## Available Objects

### entry() - Current Record

**Properties:**
```javascript
entry.id                    // ✅ Memento Entry ID (USE FOR FK!)
entry.name / entry.title    // Record name
entry.author                // User ID
entry.creationTime          // Timestamp
```

**Methods:**
```javascript
entry.field(name)           // Get field value
entry.set(name, value)      // Set field value
entry.values()              // All fields as JSON
entry.link(name, entry)     // Create link
entry.unlink(name, entry)   // Remove link
```

### lib() - Current Library

**CRITICAL:** lib() uses PROPERTIES, not methods!

```javascript
// ✅ CORRECT
lib().title                 // Library display name (PROPERTY!)
lib().id                    // Library ID (PROPERTY!)
lib().notes                 // Library notes

// ❌ WRONG
lib().title()               // ERROR - title is not a method!
lib().name                  // NOT reliable - use .title instead
```

**Methods:**
```javascript
lib().entries()             // All entries (newest first)
lib().fields()              // Field names array
lib().find(query)           // Search entries
lib().findById(id)          // Get entry by ID
lib().create(values)        // Create new entry
```

## Field Types

### TIME - CRITICAL TIMEZONE FIX

**Problem:** Memento returns TIME as Date object (year 1970) in UTC!

```javascript
var timeField = entry.field("Príchod");

// ❌ WRONG - toISOString() converts to UTC
var wrongTime = timeField.toISOString();  // 7:00 → 06:00:00Z

// ✅ CORRECT - Extract LOCAL time
if (timeField && timeField.getFullYear && timeField.getFullYear() === 1970) {
    var hours = timeField.getHours();      // Local hours
    var minutes = timeField.getMinutes();
    var seconds = timeField.getSeconds();
    
    var correctTime = hours + ":" + minutes + ":" + seconds;
}
```

### LINKTOENTRY - Array-like Object

**Single Link:**
```javascript
var linked = entry.field("Zamestnanec");
var linkedId = linked.id;            // PROPERTY, not method!
var linkedName = linked.field("Meno");
```

**Multiple Links:**
```javascript
var links = entry.field("Zamestnanci");

// ❌ WRONG - Not a true Array
Array.isArray(links);  // Returns false

// ✅ CORRECT - Array-like object
if (links && links.length > 0) {
    for (var i = 0; i < links.length; i++) {
        var item = links[i];
        var id = item.id;  // Property, not method!
    }
}
```

## User Communication

### message() - Short Notifications
```javascript
message("✅ Uložené");

// ✓ Use for: Quick confirmations (2 lines max)
// ✗ Don't use for: Long messages
// Behavior: Shows ~2 seconds, disappears
```

### dialog() - Long Messages
```javascript
dialog("Výsledok",
       "Suma: 1 250 €\n" +
       "DPH: 250 €\n" +
       "Celkom: 1 500 €",
       "OK");

// With confirmation
var result = dialog("Potvrdenie", "Naozaj zmazať?", "Áno", "Nie");
if (result === 0) {  // First button clicked
    // Delete logic
}

// ✓ Use for: Detailed results, confirmations, multi-line messages
// ✓ Stays visible until user closes
```

## JavaScript Limitations

```javascript
// ❌ NOT AVAILABLE in Memento:
async/await                        // No async operations
import/export                      // No ES6 modules
require()                          // No Node.js modules
npm packages                       // No external packages

// ✅ AVAILABLE in Memento:
IIFE pattern                       // var Module = (function() { })();
moment.js                          // Date/time library
JSON operations                    // JSON.parse, JSON.stringify
Regular expressions                // /pattern/
HTTP requests                      // Via Memento HTTP module
```
