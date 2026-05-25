-- onyx_cognition.github_commits
-- Grain: one row per Git commit indexed from a workspace's remote.
-- Used to correlate code history with operational instability.

CREATE TABLE IF NOT EXISTS github_commits (
    id                TEXT PRIMARY KEY,
    workspace_id      TEXT,
    sha               TEXT NOT NULL,
    short_sha         TEXT NOT NULL,
    author            TEXT,
    author_email      TEXT,
    message           TEXT,
    ts                INTEGER NOT NULL,
    files_changed     INTEGER NOT NULL DEFAULT 0,
    additions         INTEGER NOT NULL DEFAULT 0,
    deletions         INTEGER NOT NULL DEFAULT 0,
    risky_score       REAL    NOT NULL DEFAULT 0,        -- 0..1 heuristic instability score
    meta_json         TEXT    NOT NULL DEFAULT '{}',
    UNIQUE(workspace_id, sha)
);

CREATE INDEX IF NOT EXISTS idx_github_commits_ts ON github_commits(ts);
CREATE INDEX IF NOT EXISTS idx_github_commits_workspace ON github_commits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_risky ON github_commits(risky_score);
