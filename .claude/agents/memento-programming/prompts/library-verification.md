# Library Verification Prompt Template

## Purpose
Verify library structure before generating any code.

## Process

### Step 1: Get Library Structure
```json
{
  "tool": "memento_get_library_structure",
  "library_id": "[LIBRARY_ID from MementoConfig]"
}
```

### Step 2: Verify Field Names
- Check field names match exactly (case-sensitive!)
- Verify field types (text, number, date, time, linkToEntry)
- Identify linkToEntry fields and their targets

### Step 3: Check for Changes
If structure differs from MementoConfig:
- Document differences
- Update MementoConfig if needed
- Alert user about changes

### Step 4: Generate Field Mapping
```javascript
var config = MementoConfig.getConfig();
var fields = {
    date: config.fields.attendance.date,
    employee: config.fields.attendance.employee,
};
```

### Step 5: Validate Relationships
For linkToEntry fields:
- Verify target library exists
- Check target library has required fields
- Document relationship for JOIN queries

## Output
1. Verified field list with types
2. Field mapping code snippet
3. Relationship documentation
4. Any warnings/changes detected
