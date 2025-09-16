# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memento is a business management system consisting of modular JavaScript libraries designed for attendance tracking (Dochádzka), work records (Záznam prác), vehicle logbooks (Kniha jázd), cash register (Pokladňa), and notifications. The system features Slovak language interfaces and integrates with Telegram for notifications and AI services for intelligent processing.

## Core Architecture

### Modular System
The codebase follows a modular architecture pattern with interdependent JavaScript modules:

- **MementoCore7.js** - Foundation utilities (logging, field access, validation)
- **MementoConfig7.js** - Centralized configuration management
- **MementoBusiness7.js** - Business logic for attendance and payroll calculations
- **MementoTelegram8.js** - Telegram Bot API integration and notifications
- **MementoAI7.js** - AI services integration (OpenAI, Claude)
- **MementoUtils7.js** - Extended utilities and helper functions

### Dependency Chain
Modules use lazy loading with this dependency hierarchy:
```
MementoConfig (no dependencies)
↓
MementoCore (depends on MementoConfig)
↓
MementoBusiness, MementoAI, MementoUtils (depend on Core + Config)
↓
MementoTelegram (depends on all above modules)
```

### Module Loading Pattern
Each module follows this structure:
```javascript
var ModuleName = (function() {
    'use strict';
    var _config = null;
    var _core = null;

    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }

    return {
        // Public API
    };
})();
```

## Business Domain Scripts

### Main Processing Scripts
- **Dochádzka Prepočet 7.js** - Attendance calculation engine
- **Záznam prác Prepočet 8.0.js** - Work record processing
- **Kniha jázd Prepočet.js** - Vehicle logbook calculations
- **Pokladňa prepočet dph.js** - VAT calculations for cash register

### Notification System
- **Notifications Delete Trigger.js** - Cleanup notifications on record deletion
- **Dochádzka Individual Notifications 3.0.js** - Individual attendance notifications

## Key Business Logic

### Attendance (Dochádzka)
- Tracks employee work hours with 15-minute rounding
- Calculates wages including hourly rates, bonuses, penalties
- Creates payroll obligations (záväzky) for employees
- Links to employee rate tables and processes daily wages

### Work Records (Záznam prác)
- Records daily work on projects/customers
- Calculates work hours and costs per employee
- Links to pricing tables and creates work statements
- Integrates with project management and billing

### Time Calculations
All time calculations use:
- 15-minute rounding for start/end times
- Decimal hour format (6.75h for 6h 45min)
- Moment.js for date/time operations

## Development Commands

Since this appears to be a script-based system without traditional build tools, there are no npm/build commands. Scripts are likely deployed directly to the target platform.

## File Organization

### Current Files (root)
- `Memento*.js` - Core module libraries (version 7.x/8.x)
- `Dochádzka *.js` - Attendance-related scripts
- `Záznam prác *.js` - Work record scripts
- `Kniha jázd *.js` - Vehicle logbook scripts
- `Pokladňa *.js` - Cash register scripts
- `Notifications *.js` - Notification system scripts

### Documentation (.doc/)
- Business logic documentation in Slovak
- Knowledge bases for each module
- Prompt templates for AI integration

### Obsolete Code (.obsolete/)
- Previous versions of modules and scripts
- Development iterations and experimental code

## Integration Points

### Telegram Integration
- Bot API for message sending/editing/deletion
- Group and thread message support
- Message formatting and templates
- Notification aggregation and summaries

### AI Integration
- OpenAI GPT-4 support
- Claude API integration
- HTTP request wrapper for AI services
- Image analysis capabilities

## Logging and Debugging

All scripts use standardized logging fields:
- **Debug_Log** - Script execution flow
- **Error_Log** - Error tracking
- **info** - Operation status and results

## Working with This Codebase

### When Modifying Core Modules
1. Maintain lazy loading patterns
2. Preserve Slovak language comments and interfaces
3. Follow the existing module structure
4. Update version numbers appropriately

### When Creating New Scripts
1. Import required Memento modules at the top
2. Use the established error handling patterns
3. Follow the logging conventions
4. Test calculations with 15-minute time rounding

### Database Field Access
Use MementoCore utilities for safe field access:
```javascript
var core = MementoCore;
core.safeFieldAccess(entry, fieldName, defaultValue);
```

### Configuration Access
Always get configuration through MementoConfig:
```javascript
var config = MementoConfig.getConfig();
var fieldName = config.fields.attendance.employeeField;
```