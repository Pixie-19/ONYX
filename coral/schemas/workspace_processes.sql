-- onyx_cognition.workspace_processes
-- Grain: one row per observation of a running process or listening service
-- discovered within or around an attached workspace.

CREATE TABLE IF NOT EXISTS workspace_processes (
    id               TEXT PRIMARY KEY,
    ts               INTEGER NOT NULL,
    workspace_id     TEXT,
    pid              INTEGER,
    command          TEXT    NOT NULL,
    port             INTEGER,
    kind             TEXT    NOT NULL CHECK (kind IN ('dev_server','node','python','docker','database','worker','unknown')),
    status           TEXT    NOT NULL CHECK (status IN ('running','exited','retrying','crashed')),
    retry_count      INTEGER NOT NULL DEFAULT 0,
    cpu_pct          REAL    NOT NULL DEFAULT 0,
    mem_mb           REAL    NOT NULL DEFAULT 0,
    meta_json        TEXT    NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_workspace_processes_ts ON workspace_processes(ts);
CREATE INDEX IF NOT EXISTS idx_workspace_processes_ws ON workspace_processes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_processes_port ON workspace_processes(port);
