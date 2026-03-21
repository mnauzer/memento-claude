# MCP Memento Server

Model Context Protocol server for Memento Database - Multi-library queries, relationships, and aggregations.

## Overview

This MCP server provides Claude with powerful tools to work with Memento Database:

- **CRUD Operations** - Create, read, update, and delete entries with validation
- **Multi-Library Queries** - JOIN-like operations across multiple libraries
- **Foreign Key Resolution** - Automatic handling of linkToEntry and reverse links
- **Link Attributes** - Read and write attributes stored on relationships
- **Aggregations** - Sum, count, average across related entries

## Quick Start

### 1. Convert Configuration

First, convert MementoConfig7.js to JSON:

```bash
cd mcp-memento-server
node scripts/convert_config.js
```

This creates `config/memento_config.json` with your complete Memento configuration.

### 2. Install Dependencies

```bash
pip install -e .
```

Or with Poetry:

```bash
poetry install
```

### 3. Set Environment Variables

Ensure your `.env` file contains:

```bash
MEMENTO_API_KEY=your_api_key_here
```

### 4. Run the Server

```bash
python -m src.server
```

Or:

```bash
python src/server.py
```

### 5. Configure Claude Desktop

Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "memento": {
      "command": "python",
      "args": ["-m", "src.server"],
      "cwd": "X:/claude/projects/memento-claude/mcp-memento-server"
    }
  }
}
```

## Available Tools

### CRUD Operations

#### `memento_create_entry`
Create a new entry in any library.

```python
memento_create_entry(
    library="attendance",
    fields={
        "date": "2026-03-17",
        "arrival": "08:00",
        "departure": "16:00",
        "employees": ["emp_123"]
    }
)
```

#### `memento_read_entry`
Read an entry by ID with optional link resolution.

```python
memento_read_entry(
    library="workRecords",
    entry_id="rec_123",
    include_links=True,
    link_depth=2
)
```

#### `memento_update_entry`
Update existing entry fields.

```python
memento_update_entry(
    library="attendance",
    entry_id="att_123",
    fields={"departure": "17:00"}
)
```

#### `memento_delete_entry`
Delete an entry.

```python
memento_delete_entry(
    library="attendance",
    entry_id="att_123"
)
```

### Multi-Library Queries

#### `memento_query`
Execute complex queries with joins and filtering.

```python
memento_query({
    "from": "workRecords",
    "select": ["date", "workedHours"],
    "where": {
        "date": {"gte": "2026-03-01", "lt": "2026-04-01"}
    },
    "include": {
        "employees": {
            "select": ["firstName", "lastName"],
            "attributes": ["workedHours", "hourlyRate"]
        },
        "order": {
            "select": ["number", "name"],
            "include": {
                "client": {
                    "select": ["name", "email"]
                }
            }
        }
    }
})
```

#### `memento_aggregate`
Perform aggregations with grouping.

```python
memento_aggregate(
    library="attendance",
    aggregations={
        "totalHours": {"sum": "employees._attributes.workedHours"},
        "totalWage": {"sum": "employees._attributes.dailyWage"}
    },
    filters={
        "date": {"gte": "2026-03-01", "lt": "2026-04-01"}
    },
    group_by=["employees.firstName", "employees.lastName"]
)
```

### Relationship Tools

#### `memento_traverse_links`
Follow linkToEntry relationships.

```python
# Forward traversal
memento_traverse_links(
    library="workRecords",
    entry_id="rec_123",
    path="order.client"
)

# Reverse traversal (find all entries linking here)
memento_traverse_links(
    library="orders",
    entry_id="ord_456",
    path="workRecords",
    reverse=True
)
```

#### `memento_get_link_attributes`
Get attributes on a specific link.

```python
memento_get_link_attributes(
    library="attendance",
    entry_id="att_123",
    link_field="employees",
    linked_entry_id="emp_456"
)
```

#### `memento_set_link_attributes`
Set attributes on a link.

```python
memento_set_link_attributes(
    library="attendance",
    entry_id="att_123",
    link_field="employees",
    linked_entry_id="emp_456",
    attributes={
        "workedHours": 8.5,
        "hourlyRate": 16.0
    }
)
```

### Utility Tools

#### `memento_list_libraries`
List all available libraries.

#### `memento_get_library_structure`
Get complete structure of a library.

#### `memento_get_cache_stats`
View cache hit rates and sizes.

#### `memento_clear_cache`
Clear all caches to force fresh data.

## Query DSL Reference

### Filter Operators

- `eq` - Equal (default)
- `ne` - Not equal
- `gt` - Greater than
- `gte` - Greater or equal
- `lt` - Less than
- `lte` - Less or equal
- `in` - Value in list
- `contains` - Contains substring
- `startswith` - Starts with
- `exists` - Field exists and not null

### Aggregation Functions

- `sum` - Sum numeric field
- `count` - Count entries
- `countDistinct` - Count distinct values
- `avg` - Average of numeric field
- `min` - Minimum value
- `max` - Maximum value

## Architecture

```
mcp-memento-server/
├── src/
│   ├── server.py              # Main MCP server
│   ├── config/
│   │   ├── config_loader.py   # Load memento_config.json
│   │   └── library_registry.py # Runtime library ID resolution
│   ├── api/
│   │   ├── client.py          # Memento API wrapper
│   │   └── cache.py           # Multi-tier caching
│   ├── query/
│   │   ├── parser.py          # Query DSL parser
│   │   ├── executor.py        # Query execution
│   │   └── optimizer.py       # Query optimization
│   ├── relationships/
│   │   ├── forward_links.py   # linkToEntry resolution
│   │   ├── reverse_links.py   # linksFrom resolution
│   │   └── attributes.py      # Link attribute management
│   ├── validation/
│   │   └── field_validator.py # Field validation
│   └── tools/
│       ├── crud_tools.py      # CRUD operations
│       ├── query_tools.py     # Query and aggregation
│       └── relationship_tools.py # Link traversal
├── config/
│   └── memento_config.json    # Converted from MementoConfig7.js
└── scripts/
    └── convert_config.js      # Config conversion script
```

## Configuration Updates

When `MementoConfig7.js` is updated:

```bash
node scripts/convert_config.js
git add config/memento_config.json
git commit -m "Update config from MementoConfig7.js v7.0.XX"
```

## Caching Strategy

The server uses multi-tier caching:

- **Library Structures** - Permanent (until cleared)
- **Entries** - 60s TTL
- **Query Results** - 30s TTL
- **FK Index** - Permanent (rebuilt on invalidation)

Use `memento_clear_cache()` to force fresh data.

## Examples

See [USAGE.md](USAGE.md) for complete examples of:
- Complex multi-library queries
- Aggregations with grouping
- Working with link attributes
- Common use cases

## Troubleshooting

### Config conversion fails
- Ensure Node.js is installed
- Check MementoConfig7.js path is correct
- Verify MementoConfig7.js syntax is valid

### Server fails to start
- Check MEMENTO_API_KEY is set
- Verify network connectivity to api.mementodatabase.com
- Review logs for detailed error messages

### Queries are slow
- Check cache stats with `memento_get_cache_stats()`
- Consider reducing query depth
- Use filters to reduce result set

## License

Copyright © 2026 ASISTANTO
