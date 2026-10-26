---
name: carmen-db
description: Connect to and query the local Carmen Cloud MySQL database (127.0.0.1:3336, a_f9ebce3d77f2f445dee52ba252cc53ee_carmencloud) through the DBX CLI (`dbx`) or DBX MCP. Use whenever a task needs to inspect tables, schema, indexes, report definitions, EXPLAIN plans or row counts for carmen.financial / Carmen.WebApi.
---

# Carmen Cloud database via DBX

## Target

| Field    | Value |
|----------|-------|
| Engine   | MySQL-compatible (direct execution supported by DBX CLI) |
| Host     | `127.0.0.1` |
| Port     | `3336` |
| Database | `a_f9ebce3d77f2f445dee52ba252cc53ee_carmencloud` |
| Username | `root` |
| Password | `123456` (local dev only — never echo it in chat, logs or committed docs) |
| DBX connection name | `carmencloud` |

The DBX CLI cannot create connections. The `carmencloud` connection must exist in DBX Desktop
(created once with the values above, default database set to the database above).

## Preflight (run once per session)

```bash
dbx --version
dbx connections list --json
```

1. If `dbx` is not found: stop and tell the user. Install is `npm install -g @dbx-app/cli`; do not install without asking.
2. Use connection `carmencloud` if listed.
3. Otherwise look for a connection pointing at `127.0.0.1:3336` and confirm with the user before using it
   (e.g. the older `dev` connection, which defaults to a different database).
4. If none exists, ask the user to add `carmencloud` in DBX Desktop with the Target values. Do not fall back to other clients without asking.
5. Smoke test:

```bash
dbx query carmencloud "SELECT DATABASE() AS db, VERSION() AS version" --limit 1 --timeout 10s --json
```

Errors: `CONNECTION_NOT_FOUND` → step 4; `CONNECTION_STORE_ERROR` / `DATA_MIGRATION_REQUIRED` → user must open DBX Desktop once; `SQL_BLOCKED` → statement is a write (see Safety).

## Everyday commands

Always use fully qualified names (`a_f9ebce3d77f2f445dee52ba252cc53ee_carmencloud.<table>`) — the connection default may differ.

```bash
# tables / views
dbx schema list carmencloud --json

# columns of one table
dbx schema describe carmencloud gljvh --json

# compact schema context for a few tables
dbx context carmencloud --tables gljvh,gljvd,glhis,budget

# indexes
dbx query carmencloud "SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='a_f9ebce3d77f2f445dee52ba252cc53ee_carmencloud' AND TABLE_NAME IN ('gljvh','glhis') GROUP BY TABLE_NAME, INDEX_NAME" --limit 50 --timeout 10s --json

# report definitions
dbx query carmencloud "SELECT ReportId, ReportName FROM a_f9ebce3d77f2f445dee52ba252cc53ee_carmencloud.bi_report_definition" --limit 50 --timeout 10s --json

# execution plan
dbx query carmencloud "EXPLAIN SELECT ... FROM a_f9ebce3d77f2f445dee52ba252cc53ee_carmencloud.VBudget WHERE Year IN (2025,2026)" --limit 20 --timeout 10s --json
```

Long or multi-line SQL: write it to a `.sql` file and run `dbx query carmencloud --file ./query.sql --limit 50 --timeout 20s --json`.
Shell quoting: wrap SQL in double quotes and use single quotes for string literals. Avoid backticks in Bash (command substitution); use `--file` if identifiers need them.

## Rules

- Always pass `--limit` and `--timeout`. Prefer `COUNT(*)`, `SUM()` and grouped aggregates over dumping rows.
- Do not print full financial datasets into the conversation; save large results to a local file and summarise.
- Report numbers exactly as returned. Never invent query output, row counts or timings.
- Table names above (`gljvh`, `VBudget`, `bi_report_definition`, …) come from the paresa tenant; confirm they exist here with `dbx schema list` before relying on them.

## Safety

- `dbx query` is read-only by default. Keep it that way.
- `--allow-writes` (INSERT/UPDATE/DELETE) or `--allow-writes --allow-dangerous-sql` (DROP/TRUNCATE/ALTER, index changes) only after the user explicitly approves the exact statement in chat.
- Schema/index changes need an EXPLAIN-based rationale, backup and rollback statement shown to the user first.

## DBX MCP (alternative)

If DBX MCP tools are available in the session, the same connection and rules apply. Respect the MCP mode set in DBX Settings → MCP (`read_only` by default); never ask to raise it without a reason the user approved.
