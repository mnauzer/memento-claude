# TODO/Planning System Guide

**Version:** 1.0.0
**Last Updated:** 2026-03-21
**Skill:** memento-todo (v1.0.0)

---

## Overview

The Memento Database project uses a lightweight, git-based TODO/planning system following GTD (Getting Things Done) methodology. All tasks are stored in markdown files version-controlled in git.

**Key Features:**
- ✅ Per-library + global TODO files
- ✅ 3-level priority system (P1/P2/P3)
- ✅ GTD workflow (Capture/Clarify/Organize/Reflect/Engage)
- ✅ Weekly review automation
- ✅ Daily planning (Ivy Lee 6-task method)
- ✅ Auto-activation for quick capture
- ✅ Git version control
- ✅ Dependency tracking
- ✅ Stale task detection
- ✅ Archive system (COMPLETED.md)

---

## File Structure

```
memento-claude/
├── TODO.md                          # Global project TODOs (cross-cutting)
├── BACKLOG.md                       # Low-priority / future ideas
├── libraries/
│   ├── dochadzka/TODO.md           # Attendance library TODOs
│   ├── kniha-jazd/TODO.md          # Ride log library TODOs
│   ├── material/TODO.md            # Materials library TODOs
│   ├── pokladna/TODO.md            # Cash register library TODOs
│   ├── zamestnanci/TODO.md         # Employee library TODOs
│   ├── zakazky/TODO.md             # Orders library TODOs
│   ├── zaznam-prac/TODO.md         # Work records library TODOs
│   ├── denny-report/TODO.md        # Daily report library TODOs
│   ├── cenove-ponuky/TODO.md       # Price quotes library TODOs
│   └── miesta/TODO.md              # Locations library TODOs
├── modules/TODO.md                  # Module development TODOs
├── core/TODO.md                     # Core modules TODOs
└── docs/planning/
    ├── COMPLETED.md                 # Archive (done/cancelled tasks)
    ├── WEEKLY_REVIEW.md             # Weekly review template
    ├── PRIORITIES.md                # Current sprint priorities
    └── DAILY_PLAN.md                # Daily 6-task planning (Ivy Lee)
```

---

## Getting Started

### Installation

The memento-todo skill is located at:
```
C:\Users\rasto\.claude\projects\X--claude-projects-memento-claude\skills\memento-todo\
```

**Auto-loaded** when working in memento-claude project.

### First Use

**Quick capture:**
```
pridaj todo pre kniha-jazd: Pridať validáciu GPS súradníc
```

**Or use command:**
```
/capture
```

**List all TODOs:**
```
/list
```

That's it! The skill creates TODO files, generates IDs, commits to git automatically.

---

## Commands Reference

### /capture

**Purpose:** Capture new TODO item with auto-ID generation

**Usage:**
```
/capture
```

Then answer prompts:
- What needs to be done?
- Which library? (or "global")
- Priority? (default P2)
- Category? (Feature/Bug/Refactor/Documentation/Infrastructure)

**Auto-activation:**
```
pridaj todo: [description]
zapíš poznámku: [note]
začínam prácu na [library]
potrebujem urobiť: [task]
nezabudnúť: [reminder]
```

**Output:**
- Generates unique TODO-ID (TODO-YYYYMMDD-NNN)
- Creates TODO in appropriate file
- Commits to git
- Confirms with user

---

### /list

**Purpose:** List TODOs with filters

**Usage:**
```
/list
/list --priority P1
/list --status open
/list --library dochadzka
/list --priority P1 --status open
```

**Filters:**
- `--priority P1/P2/P3` - Filter by priority
- `--status open/in-progress/blocked/done/cancelled` - Filter by status
- `--library {library}` - Filter by library name

**Output:**
- Table with ID, Library, Task, Priority, Status
- Count of matching tasks
- Oldest task age
- Statistics

---

### /update

**Purpose:** Update TODO fields

**Usage:**
```
/update TODO-20260321-001 --priority P1
/update TODO-20260321-001 --status in-progress
/update TODO-20260321-001 --estimate 5h
/update TODO-20260321-001 --due 2026-03-25
/update TODO-20260321-001 --priority P1 --status in-progress --estimate 3h
```

**Updateable Fields:**
- `--priority P1/P2/P3` - Change priority
- `--status open/in-progress/blocked/done/cancelled` - Change status
- `--estimate {number}h or {number}d` - Set time estimate
- `--due YYYY-MM-DD` - Set deadline
- `--category Feature/Bug/Refactor/Documentation/Infrastructure` - Change category

**Process:**
1. Finds TODO by ID (searches all files)
2. Updates specified fields
3. Updates "Last Updated" timestamp
4. Saves file
5. Commits to git
6. Confirms changes

---

### /complete

**Purpose:** Mark TODO as done and archive

**Usage:**
```
/complete TODO-20260321-001
```

**Process:**
1. Finds TODO by ID
2. Updates status to 🟢 Done
3. Adds completion timestamp
4. Moves to docs/planning/COMPLETED.md
5. Checks for dependent tasks (updates "Blocked by")
6. Removes from source TODO.md
7. Commits to git
8. Confirms completion

---

### /review

**Purpose:** Review library TODOs or global TODOs

**Usage:**
```
/review
/review kniha-jazd
/review global
```

**Output:**
- Open tasks (count + list)
- In Progress tasks
- Blocked tasks
- Statistics (total, P1 count, oldest task age)
- Recommendations

---

### /weekly-review

**Purpose:** Run full GTD weekly review process

**Schedule:** Friday afternoon or Sunday evening, 1-2 hours

**Usage:**
```
/weekly-review
```

**Process:**
1. Scans all TODO.md files
2. Generates statistics (completed, open, blocked)
3. Identifies stale tasks (>7 days old)
4. Calculates velocity (tasks/week)
5. Suggests priorities for next week
6. Creates report in docs/planning/WEEKLY_REVIEW.md
7. Prompts user to move stale P3 to BACKLOG.md

**Output:**
- Summary statistics
- Stale task warnings
- Priority recommendations
- Completion rate and velocity
- Action items for next review

---

### /daily-plan

**Purpose:** Create/show Ivy Lee 6-task daily plan

**Schedule:** Every morning or night before

**Usage:**
```
/daily-plan
```

**Process:**
1. Lists top P1 tasks across all libraries
2. Ranks by priority + age
3. Selects top 6 tasks
4. Creates time blocks (2-hour focus periods)
5. Saves to docs/planning/DAILY_PLAN.md

**Output:**
- 6 ranked tasks with time blocks
- Suggested focus order
- Schedule template
- End-of-day review template

---

## Priority System

### 3-Level Priority (Eisenhower Matrix)

Based on research: 3 levels proven optimal vs complex matrices.

**P1 (High) - Urgent + Important**
- Critical bugs blocking users
- Tasks with imminent deadlines (<3 days)
- Dependencies blocking other P1 tasks
- Production issues
- Security vulnerabilities

**P2 (Medium) - Important but not urgent**
- New features requested by users
- Code refactoring (improves maintainability)
- Performance optimizations
- Non-critical bug fixes
- Documentation for new features

**P3 (Low) - Nice to have**
- Optional features
- Code cleanup (no functional impact)
- Optional documentation improvements
- Exploratory research
- Future phase planning

### Priority Assignment

**Default:** P2 (Medium) for most tasks

**Auto-assign P1 if:**
- User mentions "urgent", "critical", "blocking", "deadline"
- Task has "due" date within 3 days
- Task category is "Bug"

**Auto-assign P3 if:**
- User mentions "nice to have", "future", "maybe", "idea"
- Task category is "Documentation" (unless urgent)

**Override:** Always use `/update TODO-ID --priority P1/P2/P3`

---

## Status Tracking

### Status Icons

- 🔴 **Open** - Not started yet
- 🟡 **In Progress** - Currently working on
- 🟢 **Done** - Completed and verified
- 🔵 **Blocked** - Waiting on dependency
- ⚫ **Cancelled** - No longer needed

### Status Workflow

```
🔴 Open
  ↓ (start work)
🟡 In Progress
  ↓ (complete)
🟢 Done → COMPLETED.md
```

**Or:**
```
🔴 Open
  ↓ (dependency issue)
🔵 Blocked
  ↓ (dependency resolved)
🔴 Open
  ↓ (start work)
🟡 In Progress
```

**Or:**
```
🔴 Open
  ↓ (no longer needed)
⚫ Cancelled → COMPLETED.md
```

---

## GTD Workflow

### Phase 1: Capture

**Purpose:** Get everything out of your head into trusted system

**Tools:**
- `/capture` command
- Auto-activation: "pridaj todo", "zapíš poznámku"
- Quick syntax: "pridaj todo [library]: [description]"

**Best Practices:**
- Capture immediately, don't wait
- Don't judge or organize during capture
- Be specific enough to understand later
- Add context if it's not obvious

### Phase 2: Clarify

**Purpose:** Transform vague ideas into actionable tasks

**Questions:**
- Is it actionable? (If no → BACKLOG.md or delete)
- Can be done in <10 minutes? (If yes → do now)
- What's the next action? (Be specific)
- Why does this matter? (Add context)
- How will I know it's done? (Acceptance criteria)

**Tools:**
- `/update TODO-ID --priority P1` - Set priority
- Edit TODO in file - Add acceptance criteria

### Phase 3: Organize

**Automatic organization:**
- By library - Per-library TODO.md files
- By priority - P1/P2/P3 levels
- By status - Open/In Progress/Done/Blocked/Cancelled
- By category - Feature/Bug/Refactor/Documentation/Infrastructure

**Manual organization:**
- Dependencies - Update "Related" sections
- Grouping - Related tasks in same library
- Estimates - Add time estimates

### Phase 4: Reflect (Weekly Review)

**Schedule:** Friday afternoon or Sunday evening, 1-2 hours

**Process:**
1. **Collect (10 min)** - Gather loose ends from Debug_Log, emails, notes
2. **Process (20 min)** - Review Open tasks, update priorities
3. **Review (20 min)** - Check blocked/in-progress tasks
4. **Plan (20 min)** - Select 6-10 tasks for next week
5. **Archive (10 min)** - Move completed to COMPLETED.md

**Tool:** `/weekly-review`

**Checklist:** See docs/planning/WEEKLY_REVIEW.md

### Phase 5: Engage (Daily Work)

**Morning Ritual (Ivy Lee Method):**
1. Review yesterday's plan
2. Select 6 most important tasks for today
3. Rank them by priority
4. Work on #1 until complete
5. Then #2, then #3, etc.

**Tool:** `/daily-plan`

**During work:**
- Start task: `/update TODO-ID --status in-progress`
- Quick capture: "zapíš todo pre [library]: [description]"
- Complete task: `/complete TODO-ID`

**End of day:**
- Review progress in daily plan
- Update task statuses
- Select tomorrow's top 6

---

## TODO Item Format

### Complete Structure

```markdown
## [P1] Task Title (TODO-YYYYMMDD-NNN)

**Status:** 🔴 Open
**Priority:** P1 (High)
**Category:** Feature
**Library:** dochadzka
**Estimate:** 3h
**Created:** 2026-03-21 10:30
**Due:** 2026-03-25

### Description
Clear description of what needs to be done.

### Context
Why this task is needed. What prompted it.

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Related
- Depends on: TODO-YYYYMMDD-NNN
- Blocks: TODO-YYYYMMDD-NNN
- Related: path/to/file.js:line
- Files: `file1.js`, `file2.js`

### Notes
Additional information.
```

### Required Fields

- **Title** with Priority and ID
- **Status**
- **Priority**
- **Category**
- **Library**
- **Created** timestamp
- **Description**
- **Acceptance Criteria**

### Optional Fields

- **Estimate** (time)
- **Due** (deadline)
- **Context** (why needed)
- **Related** (dependencies)
- **Notes** (additional info)

---

## ID Format

**Pattern:** `TODO-YYYYMMDD-NNN`

**Examples:**
- `TODO-20260321-001` - First task on March 21, 2026
- `TODO-20260321-002` - Second task same day
- `TODO-20260322-001` - First task next day

**Generation:**
1. Get current date (YYYYMMDD)
2. Find existing TODOs for that date
3. Increment counter (001, 002, 003, ...)
4. Ensure uniqueness across all files

---

## Library Mapping

Map user input to correct directory:

| User Says | Directory | Abbreviation |
|-----------|-----------|--------------|
| Dochádzka, dochadzka, attendance | dochadzka | Doch |
| Kniha jázd, kniha-jazd, ride log | kniha-jazd | Knij |
| Materiál, material | material | Mat |
| Pokladňa, pokladna, cash | pokladna | Pokl |
| Zamestnanec, zamestnanci, employee | zamestnanci | Zam |
| Zákazky, zakazky, orders | zakazky | Zak |
| Záznam prác, zaznam-prac, work records | zaznam-prac | Zazp |
| Denný report, denny-report, daily report | denny-report | DenRep |
| Cenové ponuky, cenove-ponuky, quotes | cenove-ponuky | CenPon |
| Miesta, miesta, locations | miesta | Mies |

**Special:**
- `Global` → `TODO.md` (root)
- `Core` → `core/TODO.md`
- `Module` → `modules/TODO.md`

---

## Integration

### With memento-file-organizer

**Scenario:** User starts work on library
```
User: Začínam prácu na knižnici Pokladňa

memento-file-organizer: ✅ Pokladňa structure OK

memento-todo:
📋 Pokladňa TODO (2 open):
   🔴 [P1] TODO-20260318-007: Bulk payment action
   🔴 [P2] TODO-20260320-009: Currency validation

   Would you like to work on one?
```

**Scenario:** Quick capture during work
```
User: Pracujem na X, zapíš todo pre Y: [task]

memento-todo:
📝 TODO-20260321-015 created!
Library: Y
File: libraries/Y/TODO.md
✅ Git committed
```

### With Git

**Every TODO operation = git commit:**

```bash
# After capture
git commit -m "todo: add TODO-20260321-001 - [description]"

# After complete
git commit -m "todo: complete TODO-20260321-001 - [description]"

# After weekly review
git commit -m "todo: weekly review Week 12 2026"
```

**Automatic:** Skill handles git commits automatically.

---

## Best Practices

### Capture

1. **Be specific** - "Add GPS validation" not "Fix GPS"
2. **Add context** - Explain why needed
3. **Include acceptance criteria** - How to verify done?
4. **Link related tasks** - Dependencies, files
5. **Estimate realistically** - Better overestimate

### Priority

1. **Default to P2** - Most tasks are medium
2. **P1 only for urgent** - Deadlines, blockers, critical bugs
3. **P3 for nice-to-have** - Move to BACKLOG after 2 weeks
4. **Review priorities weekly** - Priorities change

### Status

1. **Update when starting** - Open → In Progress
2. **Add notes when blocked** - Explain blocker + solutions
3. **Complete only when verified** - Test, document, commit
4. **Don't leave "In Progress" indefinitely** - If stuck >3 days, mark Blocked

### Weekly Review

1. **Schedule it** - Friday afternoon or Sunday evening
2. **Block time** - 1-2 hours, no interruptions
3. **Be honest** - Don't carry over non-priorities
4. **Archive completed** - Move to COMPLETED.md
5. **Update estimates** - Based on actual time

### Daily Planning (Ivy Lee)

1. **Do it night before** - Plan tomorrow before leaving today
2. **Only 6 tasks** - More is overwhelming
3. **Rank by importance** - Not urgency
4. **Work sequentially** - Finish #1 before #2
5. **Carry over unfinished** - To tomorrow's plan

---

## Stale Task Management

**Definition:** Task open with no activity for >7 days

**Weekly Review Action:**
1. Identify stale tasks with `/weekly-review`
2. For each stale task:
   - Still relevant? → Update priority, add to sprint
   - No longer important? → Move to BACKLOG.md or cancel
   - Waiting on something? → Mark Blocked with note

**Automatic Detection:**
- `/weekly-review` flags tasks >7 days old
- Suggests moving P3 stale to BACKLOG.md

---

## Metrics

### Velocity

**Definition:** Tasks completed per week

**Calculation:** Count completed in COMPLETED.md for past week

**Usage:** Predict sprint capacity

**Target:** 10-15 tasks/week (varies by task size)

### Completion Rate

**Definition:** Percentage of created tasks completed (vs cancelled)

**Calculation:** (Completed / (Completed + Cancelled)) * 100%

**Target:** >80% (if <80%, capturing too many low-priority)

### Average Task Age

**Definition:** Average days from creation to completion for open tasks

**Calculation:** Sum(today - created_date) / count(open_tasks)

**Target:** <7 days (if >7, tasks getting stale)

### Oldest Task

**Definition:** Task open longest

**Usage:** Identify stuck/forgotten during weekly review

---

## Troubleshooting

### TODO Not Found

**Error:** `TODO-ID not found!`

**Solutions:**
- Check ID format: TODO-YYYYMMDD-NNN
- Use `/list` to see all open TODOs
- Verify date in ID (YYYYMMDD)

### Cannot Update TODO

**Error:** `Cannot write to file`

**Solutions:**
- File locked? Close text editor
- Permission issue? Check file permissions
- Path doesn't exist? Verify directory structure

### Git Commit Fails

**Error:** `Git commit failed`

**Solutions:**
- Ensure in project directory
- Check git status
- Verify git configured (user.name, user.email)

### Stale Tasks Keep Accumulating

**Problem:** Too many old P3 tasks

**Solution:**
- Run `/weekly-review` regularly
- Move P3 >7 days to BACKLOG.md
- Delete irrelevant tasks (don't be afraid to cancel)

---

## Tips & Tricks

### Breaking Large Tasks

If task estimate >4h, break into subtasks:

```
Original: Refactor MementoBusiness (8h)

Subtasks:
1. Extract time utilities → MementoTime.js (2h)
2. Extract date utilities → MementoDate.js (2h)
3. Extract validation → MementoValidation.js (2h)
4. Update imports (1h)
5. Test all scripts (1h)
```

### Dependency Tracking

Link related tasks in "Related" section:

```markdown
### Related
- Depends on: TODO-20260320-005 (must complete first)
- Blocks: TODO-20260321-010 (waiting on this)
- Related: TODO-20260318-007 (similar issue)
```

When blocking task completes, blocked tasks auto-unblock.

### Weekly Review Shortcuts

**Quick stale task cleanup:**
```bash
# Find all P3 tasks >7 days old
grep -r "P3" libraries/*/TODO.md | grep "Created: 2026-03-1[0-4]"

# Move to BACKLOG.md
```

**Quick completion rate:**
```bash
# Count completed vs cancelled in last 7 days
grep "Status.*Done" docs/planning/COMPLETED.md | grep "2026-03-1" | wc -l
grep "Status.*Cancelled" docs/planning/COMPLETED.md | grep "2026-03-1" | wc -l
```

---

## FAQ

**Q: When should I use global TODO vs library TODO?**

A: Use library TODO when task affects ONE library only. Use global TODO when task affects multiple libraries or core system.

**Q: How many P1 tasks should I have?**

A: Ideally 3-6 P1 tasks at a time. If >10 P1, some should be P2.

**Q: What if I forget to capture a TODO?**

A: That's OK! Capture it when you remember. Weekly review catches missed items.

**Q: Should I create TODO before or after starting work?**

A: Create TODO when you THINK of the work. Start work when ready. This separates capture from execution.

**Q: How do I handle recurring tasks?**

A: Create TODO each time it occurs, or create single TODO with recurring acceptance criteria.

**Q: Can I have TODO for research/exploration?**

A: Yes! Category: "Research". Acceptance criteria: "Document findings in [file]"

**Q: What if task changes during work?**

A: Update TODO description/acceptance criteria. That's normal!

---

## Resources

**Documentation:**
- **README.md** - Quick start
- **knowledge.md** - Complete documentation
- **examples.md** - 22 detailed examples
- **This file** - Complete guide

**Templates:**
- `docs/planning/WEEKLY_REVIEW.md` - Weekly review checklist
- `docs/planning/DAILY_PLAN.md` - Daily planning template
- `docs/planning/PRIORITIES.md` - Sprint priorities template

**External:**
- [Getting Things Done (GTD)](https://gettingthingsdone.com/) - Original methodology
- [Ivy Lee Method](https://jamesclear.com/ivy-lee) - Daily 6-task planning
- [TODO.md Standard](https://github.com/todomd/todo.md) - Markdown format

---

## Version History

**v1.0.0** (2026-03-21)
- Initial release
- File structure created (TODO.md, BACKLOG.md, planning templates)
- memento-todo skill implemented
- GTD workflow integration
- Integration with memento-file-organizer
- Documentation complete

---

**Maintained by:** memento-todo skill
**Questions:** Create TODO: `pridaj todo: [question about TODO system]`
