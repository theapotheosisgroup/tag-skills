---
name: tag-handoff
description: Compact the current session into a resumable handoff document for another agent or person - decisions, completed work, evidence references, pending items, unresolved assumptions and permission context.
license: MIT (upstream, see LICENSE and NOTICE.md); TAG additions UNLICENSED.
---

# Handoff (TAG)

Write a handoff document summarising the current session so a fresh agent or a person can continue the work. Invoke it by name; it is not selected automatically.

A handoff conveys **context only**. It does not create, transfer or extend a delegation grant, and it is not an agent-to-agent (A2A) protocol message. Whoever picks it up acts under their own identity and their own mandate, which the runtime checks on every call.

## Context you need, and where it comes from

- **The session itself**: what was asked, decided, done and left.
- **The artifacts already holding the detail**: specs, plans, ADRs, issues, pull requests, commits, diffs, run outputs, evidence files. Reference them by path, URL or identifier instead of copying them.
- **The permission context**: the organization, the acting principal and the mandate the work ran under, and the correlation identifier, as the harness or the user gave them. Record them as facts about the past session, not as instructions for the next one.
- **The focus of the next session**: if the user said what it will be used for, tailor the document to that.

Capability bindings: none.

## Procedure

1. **Gather** the items for each section below from the session and its artifacts.
2. **Write** the document with these sections, in order:
   - **Goal**: what the work is for, in one or two sentences.
   - **Decisions**: each decision with who made it and why, and the reference where it is recorded.
   - **Completed work**: what is done, with evidence references (commit, pull request, file and hash, command and its result).
   - **Pending items**: what remains, in the order to do it, with any blocker.
   - **Unresolved assumptions and open questions**: what was assumed without confirmation, and who can confirm it.
   - **Permission context**: organization, acting principal, mandate and correlation id of this session; any access that was refused; the statement that the next actor needs their own authority.
   - **Suggested skills**: which skills the next agent should load, by name.
3. **Redact** every secret, token, credential, personal information and client record: write `<REDACTED>` in its place, and reference evidence by identifier rather than pasting its contents.
4. **Save** to the operating system's temporary directory (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows), not inside the repository or a client's document store, unless the user names another location.

Completion: every section is present (an empty one says "none"), every claim of completed work has an evidence reference, and nothing sensitive remains.

## Output

The path of the saved handoff document and a two-line summary of what it says remains to be done.

## When something is missing

- **No evidence for a claimed result:** list it under pending items as "unverified", not under completed work.
- **Permission context unknown:** say so in that section; do not guess an organization or mandate.
- **The user wants the handoff stored somewhere shared:** they choose the location; storing it does not grant anyone access to the work it describes.
