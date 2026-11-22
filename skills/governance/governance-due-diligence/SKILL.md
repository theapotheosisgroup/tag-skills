---
name: governance-due-diligence
description: Run a due-diligence data room in a TAG nexus from either side - for the organization doing the diligence, raise and drive a list of requests (expectations), track what is answered, missing or overdue, and review what comes in; for the side responding, see what is asked of you, find the matching documents in your files or connected drive, and file each against its request. Use when asked to set up or run a data room, a due-diligence request list or checklist, to respond to diligence requests, or to find what is still missing.
license: UNLICENSED (TAG original).
compatibility: Uses the Aletia MCP (nexus, lens, arc, search, people, sends, expect, supply, mark), mapped and reached with the person's own OAuth sign-in through the TAG login. Works in any client that loads the tag-due-diligence package, its skills and its mcp.json; the person's own files or a connected drive are read through the client.
---

# Due diligence and data rooms (TAG)

A data room is a TAG **nexus** shared by the parties to a transaction. The organization doing the diligence owns a list of **requests** (expectations in the nexus, recorded on the ledger in aletia); the other side answers each with documents or words. This skill drives that list from either side. The ledger is the record: never keep the list, its states or the documents anywhere else.

This skill is the instruction set of the tag-due-diligence agent package, which ships it with the skills it uses: governance-task-management (status views), governance-search-strategy, governance-knowledge-synthesis and governance-source-management. Installed on its own, install those four too.

## Ground rules

- **Aletia decides access.** Who may see a request, raise one, file a document, accept or close is aletia's decision from the person's seat, party and role, on every call. Never filter, grant or infer access yourself; report a refusal and its "next" hint and stop there.
- **Only true states.** A request is `open` (`waiting`, `answered`, `in_review`), `met`, `refused`, `waived` or `cancelled`, exactly as the tools report it. A document filed against a request is a **claim** that it answers it, not proof that it does; only the requesting side's acceptance makes it `met`.
- **Confirm every write.** Show exactly what will be raised, filed, sent or marked, in which nexus and against which request, and wait for a yes before `aletia.expect.write`, `aletia.supply.write` or `aletia.mark.write`. Pass an idempotency key, so a retry never writes twice.
- **Decisions stay with people.** Accepting, rejecting, waiving or closing a request is the requesting side's decision; you prepare it and the person makes it.
- **Cite.** Every statement about a request or document carries its identifier.

## Capability bindings

| Capability | Tool | Use |
| --- | --- | --- |
| `aletia.nexus.read` | `nexus` | The data room's parties, people, the person's party and role, lenses |
| `aletia.lens.read` | `lens` | The request list with documents filed against each, filtered by status, obligor, category or gaps |
| `aletia.arc.read` | `arc` | One request's history: marks, claims, extracted facts and where it stands |
| `aletia.search` | `search` | Documents and records already in the nexus by text, category, party or date |
| `aletia.people.read` | `people` | Who sits in the nexus and can be asked |
| `aletia.sends.read` | `sends` | Requests asked of the person by name, and documents sent to them |
| `aletia.expect.write` | `expect` | Raise requests (one or many) or refine an open one the person raised. Write: confirm first |
| `aletia.supply.write` | `supply` | Put documents into the nexus, filed against the request each answers (`fileTo`). Write: confirm first |
| `aletia.mark.write` | `mark` | Comment, ask a follow-up, answer in words, accept, reject a claim, waive, reopen, close. Write: confirm first |

## Procedure: the side doing the diligence

1. **Open the room.** `aletia.nexus.read` for the nexus: parties, the person's party and role, the counterparty's people. Completion: the nexus id and who answers for the other side.
2. **Draft the request list** from the transaction's scope, starting from [references/request-list.md](references/request-list.md): keep what applies, drop what does not, add what the deal needs. Each item has a title, details, category, priority, due date and, where useful, the person asked (`addresseeDid` from `aletia.people.read`). Completion: a table the person has reviewed.
3. **Raise it** with `aletia.expect.write` (`create`, several items at once) after the person confirms the table. Who owes an item, its category, priority and due date are fixed when raised; changing them later means waiving and raising afresh. Completion: the returned expectation identifiers.
4. **Drive it.** With `aletia.lens.read`, report by status: unanswered, answered and awaiting review, overdue, closed. Use the gaps filter for requests with nothing filed. Draft follow-ups (`aletia.mark.write` `ask` or `comment`) for the person to confirm.
5. **Review what comes in.** For each answered request, read it with `aletia.arc.read` and the filed documents' facts; the governance-knowledge-synthesis skill compares them with what was asked. Recommend accept, ask a follow-up or reject the claim (with a reason); the person decides and you record the decision with `aletia.mark.write`.

## Procedure: the side responding

1. **See what is asked.** `aletia.lens.read` filtered to requests your party owes, and `aletia.sends.read` with `kind: asks` for those asked of you by name. Completion: the open requests, each with identifier, details, due date and questions.
2. **Find the documents.** For each request, plan with the governance-search-strategy skill, then look where the person points you: files they attach, a drive connected in their client, and what is already in the nexus (`aletia.search`). The governance-source-management skill says which sources are available and current. Completion: for each request, candidate documents with why each answers it, or "none found" with where you looked.
3. **Propose matches.** Show a table: request, candidate document, why it answers, gaps. Nothing is filed until the person confirms each row. Never file a document the person has not seen.
4. **File them** with `aletia.supply.write`, each against its request (`fileTo`), up to five documents per call. Answer questions that need words with `aletia.mark.write` `answer`. Completion: the identifiers returned for every filed document and answer.
5. **Report** what was filed, what is still missing and why, and what needs someone else in the organization (ask them through the person, never directly).

## Output

- The request list as a table: identifier, title, category, owed by, due date, state, documents filed.
- For responses: the confirmed match table and the identifiers returned.
- What could not be read or was refused, in the tool's own words.

## When something is missing or wrong

- **Not signed in or token refused:** ask the person to reconnect the Aletia connector in their client (OAuth through the TAG login). Never ask for a password or token in the chat.
- **The person is not seated in the nexus:** report it; the nexus's owners invite people in Aletia.
- **A document holds more than was asked** (personal data, unrelated deals): flag it before filing; the person decides whether to redact or withhold.
- **Conflicting documents:** file neither silently; show both and let the person choose.
