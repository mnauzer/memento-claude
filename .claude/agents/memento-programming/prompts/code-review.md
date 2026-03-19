# Code Review Prompt Template

## Review Checklist

### 1. Naming Convention
- [ ] File name follows [Library].[Type].[Name].js pattern
- [ ] Library abbreviation is correct
- [ ] Type is appropriate (Calc/Trigger/Action/etc)

### 2. Field Access
- [ ] NO hardcoded field names
- [ ] Uses MementoConfig.getConfig()
- [ ] Uses utils.safeGet/safeGetLinks
- [ ] Field names are case-sensitive correct

### 3. Dependencies
- [ ] checkAllDependencies() called
- [ ] Dependency chain respected
- [ ] MementoTelegram imported directly (if used)

### 4. Error Handling
- [ ] try/catch blocks present
- [ ] Errors logged with utils.addError()
- [ ] User-friendly error messages
- [ ] Function returns success/failure

### 5. Logging
- [ ] Debug logging at key points
- [ ] Error logging for exceptions
- [ ] Info logging for results
- [ ] Logs cleared at start

### 6. User Communication
- [ ] message() for short notifications only
- [ ] dialog() for detailed results/confirmations
- [ ] Clear, user-friendly messages

### 7. Version Management
- [ ] Header version matches CONFIG.version
- [ ] Semantic versioning used
- [ ] Version updated in all locations

### 8. Critical Fixes
- [ ] TIME field timezone fix (if TIME fields used)
- [ ] lib().title used (not lib().name)
- [ ] entry.id for FK (not custom ID)
- [ ] LinkToEntry handled correctly

### 9. Code Quality
- [ ] Clear variable names
- [ ] Functions are focused and small
- [ ] Comments explain WHY, not WHAT
- [ ] No code duplication

## Output Format
Provide:
1. Overall Quality Score (1-10)
2. List of Issues Found (categorized by severity)
3. Specific Recommendations
4. Refactored Code (if major issues)

## Severity Levels
- CRITICAL: Code will fail or produce wrong results
- HIGH: Violates best practices, maintenance issues
- MEDIUM: Code works but could be improved
- LOW: Style/clarity suggestions
