# MCP Tools Integration Guide

## Available MCP Tools (13 tools)

### Utility Operations (ALWAYS USE FIRST!)

#### memento_get_library_structure
**CRITICAL:** Get library field structure BEFORE generating any code!

```json
{
  "tool": "memento_get_library_structure",
  "library_id": "LIBRARY_ID_DOCHADZKA"
}
```

Returns:
```json
{
  "library_id": "...",
  "library_name": "Dochádzka",
  "fields": [
    {
      "id": 1,
      "name": "Dátum",
      "type": "date"
    },
    {
      "id": 2,
      "name": "Zamestnanec",
      "type": "link_to_entry",
      "linked_library_id": "LIBRARY_ID_ZAMESTNANEC"
    }
  ]
}
```

### CRUD Operations

#### memento_create_entry
```json
{
  "tool": "memento_create_entry",
  "library_id": "LIBRARY_ID_DOCHADZKA",
  "values": {
    "Dátum": "2026-03-19",
    "Príchod": "07:00",
    "Odchod": "15:30"
  }
}
```

#### memento_read_entry
```json
{
  "tool": "memento_read_entry",
  "library_id": "LIBRARY_ID_DOCHADZKA",
  "entry_id": "entry_id_here"
}
```

#### memento_update_entry
```json
{
  "tool": "memento_update_entry",
  "library_id": "LIBRARY_ID_DOCHADZKA",
  "entry_id": "entry_id_here",
  "values": {
    "Odpracované": 8.5
  }
}
```

### Query Operations

#### memento_query
Advanced multi-library queries with JOINs.

```json
{
  "tool": "memento_query",
  "query": {
    "library": "Dochádzka",
    "fields": ["Dátum", "Zamestnanec.Meno", "Odpracované"],
    "filter": {
      "Dátum": {"gte": "2026-03-01", "lte": "2026-03-31"}
    },
    "expand": {
      "Zamestnanec": {
        "fields": ["Meno", "Priezvisko", "Hodinová sadzba"]
      }
    }
  }
}
```

#### memento_aggregate
```json
{
  "tool": "memento_aggregate",
  "library_id": "LIBRARY_ID_DOCHADZKA",
  "aggregations": {
    "total_hours": {"sum": "Odpracované"},
    "employee_count": {"count": "Zamestnanec"}
  },
  "group_by": ["Dátum"]
}
```

## Query DSL

### Basic Query
```json
{
  "library": "Dochádzka",
  "fields": ["Dátum", "Odpracované"],
  "filter": {
    "Dátum": {"gte": "2026-03-01"}
  }
}
```

### Multi-Library JOIN
```json
{
  "library": "Dochádzka",
  "fields": ["Dátum", "Odpracované"],
  "expand": {
    "Zamestnanec": {
      "fields": ["Meno", "Priezvisko"],
      "expand": {
        "Funkcia": {
          "fields": ["Názov"]
        }
      }
    }
  }
}
```

## Best Practices

### 1. Always Verify Library Structure First

```javascript
// BEFORE generating any script code:
// 1. Use MCP to get current library structure
var structure = await memento_get_library_structure({
    library_id: "LIBRARY_ID_DOCHADZKA"
});

// 2. Verify field names match (case-sensitive!)
// 3. Check field types (DATE vs DATETIME vs TIME)
// 4. Identify linkToEntry fields
```

### 2. Handle Rate Limits

Memento Cloud API: **10 requests per minute**

```javascript
var rateLimiter = {
    requests: [],
    limit: 10,
    window: 60000,
    
    canMakeRequest: function() {
        var now = Date.now();
        this.requests = this.requests.filter(t => now - t < this.window);
        return this.requests.length < this.limit;
    },
    
    recordRequest: function() {
        this.requests.push(Date.now());
    }
};
```

## Workflow

1. **Verify Structure** - Use memento_get_library_structure
2. **Generate Code** - Use verified field names
3. **Test** - Create/read entries to test
4. **Deploy** - Copy to Memento Database
