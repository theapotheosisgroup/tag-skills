# Read-only query rules

Run through this before every `tag.data.query` call. The runtime enforces access; these rules keep the request inside what the skill is for.

## Statement

- [ ] One read-only statement, starting with `SELECT` or `WITH ... SELECT`.
- [ ] No `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `UPSERT`, `REPLACE`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME`, `GRANT`, `REVOKE`, `COPY`, `UNLOAD`, `CALL`, `EXECUTE`, `SET`, `USE`, `OPTIMIZE`, `VACUUM`, `CACHE TABLE`, or `SELECT ... INTO`.
- [ ] No stored-procedure or user-defined-function calls that are not in the approved definitions.
- [ ] No comments or string tricks that hide a second statement.

## Scope

- [ ] Every table and column is listed in the approved schema definitions (`tag.data.schema.read`).
- [ ] The query never tries to widen or remove the organization scope the capability applies.
- [ ] Period and entity filters match the question.
- [ ] Detail queries have an explicit `LIMIT` (or dialect equivalent) agreed with the user.

## Parameters

- [ ] Every value from the user, a document or a previous result is a bound parameter (`:name`, `?` or the capability's placeholder), never concatenated into the SQL text.
- [ ] Identifiers (table and column names) come only from the approved schema definitions, never from free text.
