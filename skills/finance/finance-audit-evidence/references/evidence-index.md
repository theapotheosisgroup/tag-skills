# Evidence index and workpaper format

General evidence support for any audit, review, lender or internal request. Use the SOX-specific procedures in [upstream-guide.md](upstream-guide.md) only when the organization confirms it is in scope.

## Evidence index

One row per requested item. Keep it as CSV or JSON so the harness can track it.

| Column | Content |
| --- | --- |
| `request_id` | The requester's reference (for example the auditor's PBC item number) |
| `request` | What was asked, verbatim |
| `area` | Account, cycle or control area |
| `period` | Period the evidence covers |
| `evidence` | Document or output provided, with its identifier in the nexus |
| `source` | Where it came from: capability and record id, or "supplied by" a named person |
| `retrieved_at` | When it was obtained |
| `sha256` | Hash of the file provided, when it is a file |
| `status` | `requested`, `located`, `provided`, `partial`, `not_available`, `not_applicable` |
| `gap` | What is missing and why, when status is not `provided` |
| `owner` | Person responsible for the item at the organization |
| `review` | Reviewer and date before release |

## Workpaper (one per area or test)

1. **Objective:** what the workpaper supports (balance, assertion, control).
2. **Population and source:** where the population came from, its completeness check (reconciliation to the ledger or report totals) and snapshot identity.
3. **Selection:** method (all items, targeted, random with seed, systematic) and rationale; sample sizes from the organization's or its auditor's requirements.
4. **Procedures and results:** per item, what was examined and the result, with evidence references.
5. **Exceptions:** each exception, its amount or effect, and the follow-up.
6. **Conclusion:** stated as preparation for review, for example "evidence assembled; no exceptions noted in the items examined". Never state an audit opinion, a control effectiveness conclusion for SOX purposes, or deficiency severity unless the organization's qualified reviewer has made that determination.
7. **Sign-off:** preparer (agent and acting principal), reviewer, dates.

## Sufficiency checks before release

- Dated, with an identifiable performer or approver.
- Ties to the ledger, report or population it supports.
- Complete for the period and scope requested.
- No information outside the request and the requester's entitlement (for example, other entities' data or unrelated personal data).
