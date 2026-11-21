<!-- Adapted from https://github.com/anthropics/knowledge-work-plugins/blob/0e0fcacddcc892eb92a1b7873ff9d68159c47571/enterprise-search/skills/source-management/SKILL.md (Apache-2.0). Modified by TAG: see ../NOTICE.md. -->

# Source Management (upstream reference)

> **Upstream reference, adapted.** This is the upstream `source-management` workflow, kept as reference material for [`governance-source-management`](../SKILL.md). Where it conflicts with SKILL.md, SKILL.md governs. Tool placeholders were replaced with TAG capability names; capabilities marked *proposed* have no live binding yet. US GAAP, SOX or other jurisdiction-specific content is upstream reference only and does not establish the organization's policy.
>
> **TAG source labels.** In this guide, *chat* and *email* mean organization chat and email only where they are indexed in the nexus and searchable through `aletia.search`; *nexus documents* and *knowledge sources* are also searched through `aletia.search`. Every search runs as the caller, in the active nexus, and returns only what the caller may see.

Knows what sources are available, explains what is missing, and manages how sources are queried.

## Checking Available Sources

TAG change: ask `tag.sources.list` (proposed) for the sources available to the caller in the active nexus, with freshness and authority. Until it is bound, infer availability from the capabilities the runtime actually offers and say that the list is inferred. Typical sources:

| Source | Key capabilities |
|--------|-----------------|
| **chat (`aletia.search`)** | Search messages indexed in the nexus |
| **email (`aletia.search`)** | Search messages indexed in the nexus |
| **nexus documents (`aletia.search`)** | Search files, fetch document contents |
| **TAG work and expectations (`tag.work.status`, `tag.expectations.read`)** | Work state and expectations in the nexus |
| **customer records (no TAG capability yet)** | Not available through TAG today |
| **knowledge sources (`aletia.search`)** | Semantic search, keyword search |

## When a Source Is Missing

TAG change: the agent never connects a source, edits MCP configuration or handles credentials. Provider connections and credentials belong to tag-connectors; what is indexed in a nexus belongs to aletia. When a user searches but a source is missing:

```text
Searched: [list of sources, with freshness].
Not available: [list], because [no TAG capability / not indexed in this nexus / access refused].

To add a source, ask the organization's administrator to connect it to TAG and make it
available in this nexus. Results above do not cover the missing sources.
```

A refused source is reported as refused. Do not look for another route to the same data.

## Source Priority Ordering

Different query types benefit from searching certain sources first. Use these priorities to weight results, not to skip sources:

### By Query Type

**Decision queries** ("What did we decide..."):

```text
1. chat (`aletia.search`) (conversations where decisions happen)
2. email (`aletia.search`) (decision confirmations, announcements)
3. nexus documents (`aletia.search`) (meeting notes, decision logs)
4. Wiki (if decisions are documented)
5. Task tracker (if decisions are captured in tasks)
```

**Status queries** ("What's the status of..."):

```text
1. Task tracker (TAG work and expectations (`tag.work.status`, `tag.expectations.read`) — authoritative status)
2. chat (`aletia.search`) (real-time discussion)
3. nexus documents (`aletia.search`) (status docs, reports)
4. email (`aletia.search`) (status update emails)
5. Wiki (project pages)
```

**Document queries** ("Where's the doc for..."):

```text
1. nexus documents (`aletia.search`) (primary doc storage)
2. Wiki / knowledge sources (`aletia.search`) (knowledge base)
3. email (`aletia.search`) (docs shared via email)
4. chat (`aletia.search`) (docs shared in channels)
5. Task tracker (docs linked to tasks)
```

**People queries** ("Who works on..." / "Who knows about..."):

```text
1. chat (`aletia.search`) (message authors, channel members)
2. Task tracker (task assignees)
3. nexus documents (`aletia.search`) (doc authors, collaborators)
4. customer records (no TAG capability yet) (account owners, contacts)
5. email (`aletia.search`) (email participants)
```

**Factual/Policy queries** ("What's our policy on..."):

```text
1. Wiki / knowledge sources (`aletia.search`) (official documentation)
2. nexus documents (`aletia.search`) (policy docs, handbooks)
3. email (`aletia.search`) (policy announcements)
4. chat (`aletia.search`) (policy discussions)
```

### Default Priority (General Queries)

When query type is unclear:

```text
1. chat (`aletia.search`) (highest volume, most real-time)
2. email (`aletia.search`) (formal communications)
3. nexus documents (`aletia.search`) (documents and files)
4. Wiki / knowledge sources (`aletia.search`) (structured knowledge)
5. Task tracker (work items)
6. CRM (customer data)
```

## Rate Limiting Awareness

MCP sources may have rate limits. Handle them gracefully:

### Detection

Rate limit responses typically appear as:

- HTTP 429 responses
- Error messages mentioning "rate limit", "too many requests", or "quota exceeded"
- Throttled or delayed responses

### Handling

When a source is rate limited:

1. **Do not retry immediately** — respect the limit
2. **Continue with other sources** — do not block the entire search
3. **Inform the user**:

   ```text
   Note: [Source] is temporarily rate limited. Results below are from
   [other sources]. You can retry in a few minutes to include [source].
   ```

4. **For digests** — if rate limited mid-scan, note which time range was covered before the limit hit

### Prevention

- Avoid unnecessary API calls — check if the source is likely to have relevant results before querying
- Use targeted queries over broad scans when possible
- For digests, batch requests where the API supports it
- Cache awareness: if a search was just run, avoid re-running the same query immediately

## Source Health

Track source availability during a session:

```text
Source Status:
  chat (`aletia.search`):        ✓ Available
  email (`aletia.search`):        ✓ Available
  nexus documents (`aletia.search`):  ✓ Available
  TAG work and expectations (`tag.work.status`, `tag.expectations.read`):        ✗ Not connected
  customer records (no TAG capability yet):   ✗ Not connected
  knowledge sources (`aletia.search`):      ⚠ Rate limited (retry in 2 min)
```

When reporting search results, include which sources were searched so the user knows the scope of the answer.

## Adding Sources

TAG change: new sources are added by the organization through TAG's integration owners (tag-connectors for the provider connection, aletia for the nexus), not by editing `.mcp.json` from a skill. Once a source is available through a capability, it appears in `tag.sources.list` and in future searches.
