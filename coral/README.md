# onyx_cognition — Coral Custom Source

A relational cognition source that ingests live operational telemetry from the ONYX agent and exposes it as joinable SQL tables for cross-source intelligence queries.

```
$ coral source register ./coral/manifest.yaml
$ coral query "SELECT * FROM onyx_cognition.workspace_entropy WHERE delta > 5 ORDER BY ts DESC"
```

## Tables

| Table | Grain | Description |
|------|-------|-------------|
| `workspace_entropy` | per file event | Save/edit/delete frequency, AST complexity delta, syntax fail count |
| `network_trajectories` | per probe tick | Latency, jitter, socket retries, dependency health per endpoint |
| `system_cybernetics` | per 1s telemetry tick | CPU, memory, thermal, disk pressure |
| `execution_snapshots` | per AST commit | Full structural state — function count, import graph, complexity |
| `rulebook_constraints` | per rule evaluation | Constraint definitions + current breach state |
| `replay_events` | per causal event | Append-only event log feeding the Chrono Replay engine |

## Ingestion

The agent emits JSONL on `agent/data/jsonl/<table>.jsonl`. The Coral ingester tails each file and bulk-loads via the schema's DDL. Schemas live under `coral/schemas/`.
