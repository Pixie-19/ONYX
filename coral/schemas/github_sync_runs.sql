-- onyx_cognition.github_sync_runs
-- Grain: one row per broadcast snapshot of GitHub sync state for a workspace.
-- The agent emits a snapshot whenever a sync run starts, advances, succeeds,
-- fails, or hits a rate limit. Persisting these enables cinema replay,
-- the cockpit's repo-sync timeline, and post-hoc audits of API quota use.

CREATE TABLE IF NOT EXISTS github_sync_runs (
    id                 TEXT PRIMARY KEY,
    ts                 INTEGER NOT NULL,                  -- snapshot timestamp (ms)
    workspace_id       TEXT NOT NULL,
    owner              TEXT NOT NULL,
    repo               TEXT NOT NULL,
    state              TEXT NOT NULL CHECK (state IN ('idle','syncing','ok','error','rate_limited')),
    last_synced_at     INTEGER,
    commits            INTEGER NOT NULL DEFAULT 0,
    contributors       INTEGER NOT NULL DEFAULT 0,
    branches           INTEGER NOT NULL DEFAULT 0,
    pulls              INTEGER NOT NULL DEFAULT 0,
    remaining_quota    INTEGER,
    error              TEXT,
    meta_json          TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_github_sync_runs_ts       ON github_sync_runs(ts);
CREATE INDEX IF NOT EXISTS idx_github_sync_runs_ws       ON github_sync_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_github_sync_runs_state    ON github_sync_runs(state);
