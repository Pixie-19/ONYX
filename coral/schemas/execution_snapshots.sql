-- onyx_cognition.execution_snapshots
-- Grain: one row per AST commit (after a file save passes the AST analyser).
-- Captures the full structural fingerprint of a file at a point in time.

CREATE TABLE IF NOT EXISTS execution_snapshots (
    id              TEXT PRIMARY KEY,
    ts              INTEGER NOT NULL,
    file            TEXT    NOT NULL,
    lang            TEXT    NOT NULL,
    function_count  INTEGER NOT NULL DEFAULT 0,
    class_count     INTEGER NOT NULL DEFAULT 0,
    import_count    INTEGER NOT NULL DEFAULT 0,
    loc             INTEGER NOT NULL DEFAULT 0,
    complexity      REAL    NOT NULL DEFAULT 0,
    imports_json    TEXT    NOT NULL DEFAULT '[]',     -- JSON array of imported modules
    exports_json    TEXT    NOT NULL DEFAULT '[]',
    fingerprint     TEXT    NOT NULL,                  -- structural hash
    parent_id       TEXT,                              -- previous snapshot for same file
    session_id      TEXT    NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES execution_snapshots(id)
);

CREATE INDEX IF NOT EXISTS idx_exec_snap_ts     ON execution_snapshots(ts);
CREATE INDEX IF NOT EXISTS idx_exec_snap_file   ON execution_snapshots(file);
CREATE INDEX IF NOT EXISTS idx_exec_snap_parent ON execution_snapshots(parent_id);
