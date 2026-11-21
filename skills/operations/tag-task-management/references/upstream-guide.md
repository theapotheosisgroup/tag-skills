<!-- Adapted from https://github.com/anthropics/knowledge-work-plugins/blob/0e0fcacddcc892eb92a1b7873ff9d68159c47571/productivity/skills/task-management/SKILL.md (Apache-2.0). Modified by TAG: see ../NOTICE.md. -->

# Task Management (upstream reference)

> **Upstream reference, adapted.** This is the upstream `task-management` workflow, kept as reference material for [`tag-task-management`](../SKILL.md). Where it conflicts with SKILL.md, SKILL.md governs. Tool placeholders were replaced with TAG capability names; capabilities marked *proposed* have no live binding yet. US GAAP, SOX or other jurisdiction-specific content is upstream reference only and does not establish the organization's policy.
>
> **TAG:** in TAG, tasks the organization relies on are TAG expectations and work items, read and filed through the capabilities in [SKILL.md](../SKILL.md). The `TASKS.md` workflow below is upstream reference only: a local `TASKS.md` may serve as a personal scratch list, never as the system of record.

Upstream: tasks are tracked in a simple `TASKS.md` file that both you and the user can edit.

## File Location

**Always use `TASKS.md` in the current working directory.**

- If it exists, read/write to it
- If it doesn't exist, create it with the template below

## Dashboard Setup (First Run)

Upstream ships a `dashboard.html` task board and a `/productivity:start` command with its plugin. **TAG does not ship them**: they are outside the selected folder, and a local board is not where TAG work is tracked. Do not try to copy or run them.

The task board:

- Reads and writes to the same `TASKS.md` file
- Auto-saves changes
- Watches for external changes (syncs when you edit via CLI)
- Supports drag-and-drop reordering of tasks and sections

## Format & Template

When creating a new TASKS.md, use this exact template (without example tasks):

```markdown
# Tasks

## Active

## Waiting On

## Someday

## Done
```

Task format:

- `- [ ] **Task title** - context, for whom, due date`
- Sub-bullets for additional details
- Completed: `- [x]` with the title struck through and the completion date

## How to Interact

**When user asks "what's on my plate" / "my tasks":**

- Read TASKS.md
- Summarize Active and Waiting On sections
- Highlight anything overdue or urgent

**When user says "add a task" / "remind me to":**

- Add to Active section with `- [ ] **Task**` format
- Include context if provided (who it's for, due date)

**When user says "done with X" / "finished X":**

- Find the task
- Change `[ ]` to `[x]`
- Strike the title through
- Add completion date
- Move to Done section

**When user asks "what am I waiting on":**

- Read the Waiting On section
- Note how long each item has been waiting

## Conventions

- **Bold** the task title for scannability
- Include "for [person]" when it's a commitment to someone
- Include "due [date]" for deadlines
- Include "since [date]" for waiting items
- Sub-bullets for additional context
- Keep Done section for ~1 week, then clear old items

## Extracting Tasks

When summarizing meetings or conversations, offer to add extracted tasks:

- Commitments the user made ("I'll send that over")
- Action items assigned to them
- Follow-ups mentioned

Ask before adding - don't auto-add without confirmation.
