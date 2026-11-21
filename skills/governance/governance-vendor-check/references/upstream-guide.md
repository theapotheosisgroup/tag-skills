<!-- Adapted from https://github.com/anthropics/knowledge-work-plugins/blob/0e0fcacddcc892eb92a1b7873ff9d68159c47571/legal/skills/vendor-check/SKILL.md (Apache-2.0). Modified by TAG: see ../NOTICE.md. -->

# vendor-check -- Vendor Agreement Status (upstream reference)

> **Upstream reference, adapted.** This is the upstream `vendor-check` workflow, kept as reference material for [`governance-vendor-check`](../SKILL.md). Where it conflicts with SKILL.md, SKILL.md governs. Tool placeholders were replaced with TAG capability names; capabilities marked *proposed* have no live binding yet. US GAAP, SOX or other jurisdiction-specific content is upstream reference only and does not establish the organization's policy.

Check the status of existing agreements with a vendor across all connected systems. Provides a consolidated view of the legal relationship.

**Important**: This skill assists with legal workflows but does not provide legal advice. Agreement status reports should be verified against original documents by qualified legal professionals.

## Invocation

```text
governance-vendor-check [vendor name]
```

If no vendor name is provided, prompt the user to specify which vendor to check.

## Workflow

### Step 1: Identify the Vendor

Accept the vendor name from the user. Handle common variations:

- Full legal name vs. trade name (e.g., "Alphabet Inc." vs. "Google")
- Abbreviations (e.g., "AWS" vs. "Amazon Web Services")
- Parent/subsidiary relationships

Ask the user to clarify if the vendor name is ambiguous.

### Step 2: Search Available Sources

Search for the vendor in the sources available in the current nexus, in priority order. TAG mapping: the agreement registry is `tag.contracts.registry.read` (proposed); documents, and email or chat where indexed in the nexus, are `aletia.search` (mapped), which returns only what the caller may see; there is no TAG CRM capability yet. Plan the searches with governance-search-strategy.

#### Agreement registry (`tag.contracts.registry.read`) -- If Bound

Search for all contracts involving the vendor:

- Active agreements
- Expired agreements (last 3 years)
- Agreements in negotiation or pending signature
- Amendments and addenda

#### CRM -- No TAG capability yet

Search for the vendor/account record:

- Account status and relationship type
- Associated opportunities or deals
- Contact information for vendor's legal/contracts team

#### Email -- Where Indexed in the Nexus (`aletia.search`)

Search for recent relevant correspondence:

- Contract-related emails (last 6 months)
- NDA or agreement attachments
- Negotiation threads

#### Nexus documents (`aletia.search`)

Search for:

- Executed agreements
- Redlines and drafts
- Due diligence materials

#### Chat -- Where Indexed in the Nexus (`aletia.search`)

Search for recent mentions:

- Contract requests involving this vendor
- Legal questions about the vendor
- Relevant team discussions (last 3 months)

### Step 3: Compile Agreement Status

For each agreement found, report:

| Field | Details |
|-------|---------|
| **Agreement Type** | NDA, MSA, SOW, DPA, SLA, License Agreement, etc. |
| **Status** | Active, Expired, In Negotiation, Pending Signature |
| **Effective Date** | When the agreement started |
| **Expiration Date** | When it expires or renews |
| **Auto-Renewal** | Yes/No, with renewal term and notice period |
| **Key Terms** | Liability cap, governing law, termination provisions |
| **Amendments** | Any amendments or addenda on file |

### Step 4: Gap Analysis

Identify what agreements exist and what might be missing:

```text
## Agreement Coverage

[CHECK] NDA -- [status]
[CHECK/MISSING] MSA -- [status or "Not found"]
[CHECK/MISSING] DPA -- [status or "Not found"]
[CHECK/MISSING] SOW(s) -- [status or "Not found"]
[CHECK/MISSING] SLA -- [status or "Not found"]
[CHECK/MISSING] Insurance Certificate -- [status or "Not found"]
```

Flag any gaps that may be needed based on the relationship type (e.g., if there is an MSA but no DPA and the vendor handles personal data).

### Step 5: Generate Report

Output a consolidated report:

```text
## Vendor Agreement Status: [Vendor Name]

**Search Date**: [today's date]
**Sources Checked**: [list of systems searched]
**Sources Unavailable**: [list of systems not connected, if any]

## Relationship Overview

**Vendor**: [full legal name]
**Relationship Type**: [vendor/partner/customer/etc.]
**CRM Status**: [if available]

## Agreement Summary

### [Agreement Type 1] -- [Status]
- **Effective**: [date]
- **Expires**: [date] ([auto-renews / does not auto-renew])
- **Key Terms**: [summary of material terms]
- **Location**: [where the executed copy is stored]

### [Agreement Type 2] -- [Status]
[etc.]

## Gap Analysis

[What's in place vs. what may be needed]

## Upcoming Actions

- [Any approaching expirations or renewal deadlines]
- [Required agreements not yet in place]
- [Amendments or updates that may be needed]

## Notes

[Any relevant context from email/chat searches]
```

### Step 6: Handle Missing Sources

If a source is not available (no binding, not indexed in the nexus, or access refused):

- **No agreement registry**: Note that the registry was not searched. Suggest the user check it manually. Report what was found in other systems.
- **No CRM**: Skip CRM context. Note the gap.
- **No Email**: Note that email was not searched. Suggest the user search their email for "[vendor name] agreement" or "[vendor name] NDA".
- **No Documents**: Note that document storage was not searched.

Always clearly state which sources were checked and which were not, so the user knows the completeness of the report.

## Notes

- If no agreements are found in any available source, report that clearly and ask the user if they have agreements stored elsewhere
- For vendor groups (e.g., a vendor with multiple subsidiaries), ask whether the user wants to check a specific entity or the entire group
- Flag any agreements that are expired but may still have surviving obligations (confidentiality, indemnification, etc.)
- If an agreement is approaching expiration (within 90 days), highlight this prominently
