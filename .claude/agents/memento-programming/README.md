---
name: "Memento Programming Agent - README"
---

# Memento Database Programming Agent

**Version:** 1.0.0
**Created:** 2026-03-19
**Purpose:** Specialized agent for Memento Database JavaScript development

## Overview

This agent provides expert assistance for developing Memento Database scripts with deep knowledge of:

- ✅ 18 core modules with full API reference
- ✅ 41 libraries with 712 mapped fields
- ✅ Best practices and naming conventions
- ✅ MCP integration for real-time verification
- ✅ Common pitfalls and solutions

## Directory Structure

```
.claude/agents/memento-programming/
├── agent.json                    # Agent configuration
├── knowledge/                    # Knowledge base
│   ├── 01-core-modules.md       # Core modules API reference
│   ├── 02-library-patterns.md   # Script structure patterns
│   ├── 03-memento-api.md        # Memento API specifics
│   ├── 04-best-practices.md     # Coding standards
│   ├── 05-mcp-integration.md    # MCP tools usage
│   └── 06-common-pitfalls.md    # Known issues & fixes
├── examples/                     # Reference examples
│   └── calculation-script.js    # Example calc script
├── prompts/                      # Prompt templates
│   ├── script-generation.md     # Generation template
│   ├── code-review.md           # Review template
│   └── library-verification.md  # Verification template
└── README.md                     # This file
```

## Capabilities

### 1. Library Structure Verification
Uses MCP to verify current field names, types, and relationships before generating code.

### 2. Script Template Generation
Generates production-ready scripts following Template-Script.js v9.0.0 structure.

### 3. Code Quality Validation
Reviews scripts against comprehensive checklist of best practices.

### 4. Module Function Suggestion
Recommends appropriate core module functions instead of code duplication.

### 5. Multi-Library Query Generation
Creates GraphQL-inspired MCP queries for complex data operations.

### 6. Dependency Chain Validation
Ensures correct module load order and dependency requirements.

## Usage

### Generate Script
```
"Generate a calculation script for Dochádzka that calculates daily wage"
```

### Review Code
```
"Review this Memento script for best practices: [paste code]"
```

### Verify Library
```
"Verify structure of Kniha jázd library before generating code"
```

## Knowledge Base

### Core Modules Reference (01-core-modules.md)
- Architecture overview (4-level dependency hierarchy)
- All 18 modules with API documentation
- Function signatures and usage examples
- Load order requirements

### Library Patterns (02-library-patterns.md)
- Complete script structure template
- Script types (Calc, Trigger, Action, Notif)
- Patterns for each type
- Initialization, validation, execution patterns

### Memento API (03-memento-api.md)
- Available objects (entry(), lib())
- Field types (TEXT, NUMBER, DATE, TIME, LINKTOENTRY)
- JavaScript limitations in Memento
- Critical fixes (TIME timezone, lib().title, etc.)

### Best Practices (04-best-practices.md)
- Naming convention rules
- Field access safety
- Dependency chain management
- Logging standards
- Error handling patterns
- User communication (message vs dialog)
- Version management

### MCP Integration (05-mcp-integration.md)
- All 13 MCP tools with examples
- Query DSL (GraphQL-inspired)
- Multi-library JOINs
- Aggregations and filtering
- Rate limiting (10 req/min)

### Common Pitfalls (06-common-pitfalls.md)
- Entry ID vs Custom ID confusion
- TIME field UTC conversion
- lib().name vs lib().title
- LinkToEntry array handling
- message() misuse
- Hardcoded field names
- Missing dependency checks
- MementoTelegram circular dependency

## Critical Rules

### ALWAYS:
- ✅ Verify library structure via MCP before coding
- ✅ Use MementoConfig for field/library names
- ✅ Check dependencies with checkAllDependencies()
- ✅ Apply TIME field timezone fix when needed
- ✅ Use lib().title (property, not method)
- ✅ Use entry.id for foreign keys
- ✅ Use dialog() for multi-line messages

### NEVER:
- ❌ Hardcode field or library names
- ❌ Use lib().name (unreliable)
- ❌ Access MementoTelegram via utils
- ❌ Use message() for long text (>2 lines)
- ❌ Forget to clear logs at script start
- ❌ Skip dependency validation

## Version History

- **1.0.0** (2026-03-19) - Initial release
  - Complete knowledge base (6 files)
  - Example scripts
  - Prompt templates
  - Agent configuration

## Maintenance

To update the agent:

1. **Update Knowledge Base** - Edit markdown files in `knowledge/`
2. **Add Examples** - Add new reference scripts to `examples/`
3. **Refine Prompts** - Update templates in `prompts/`
4. **Version Bump** - Update version in `agent.json`
5. **Document Changes** - Update this README

## Statistics

- **Knowledge Files:** 6
- **Example Scripts:** 1
- **Prompt Templates:** 3
- **Core Modules Covered:** 18
- **Libraries Supported:** 41
- **Fields Mapped:** 712
- **MCP Tools Available:** 13

## References

- **Project Documentation:** `../../docs/`
- **Core Modules:** `../../core/`
- **Templates:** `../../templates/Template-Script.js`
- **MCP Server:** `../../mcp-memento-server/`
- **CLAUDE.md:** `../../CLAUDE.md`
- **MEMORY.md:** User's auto memory file
