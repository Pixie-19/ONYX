-- onyx_cognition.workspace_entropy
-- Grain: one row per filesystem event observed by the chokidar interceptor.
-- Captures the developer activity surface and short-window entropy.

CREATE TABLE IF NOT EXISTS workspace_entropy (
    id              TEXT PRIMARY KEY,
    ts              INTEGER NOT NULL,             -- epoch ms
    file            TEXT    NOT NULL,
    lang            TEXT,
    event           TEXT    NOT NULL CHECK (event IN ('add','change','unlink','rename')),
    bytes_delta     INTEGER NOT NULL DEFAULT 0,
    ast_delta       INTEGER NOT NULL DEFAULT 0,   -- net AST node delta
    complexity      REAL    NOT NULL DEFAULT 0,   -- rolling cyclomatic estimate
    syntax_fail     INTEGER NOT NULL DEFAULT 0,
    burst_rate      REAL    NOT NULL DEFAULT 0,   -- saves / min, 60s window
    author          TEXT,
    session_id      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_entropy_ts   ON workspace_entropy(ts);
CREATE INDEX IF NOT EXISTS idx_workspace_entropy_file ON workspace_entropy(file);
CREATE INDEX IF NOT EXISTS idx_workspace_entropy_sess ON workspace_entropy(session_id);
