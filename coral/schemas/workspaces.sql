-- onyx_cognition.workspaces
-- Grain: one row per attached project workspace.
-- Each workspace represents a real local repository ONYX is monitoring.

CREATE TABLE IF NOT EXISTS workspaces (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    path             TEXT NOT NULL UNIQUE,
    framework        TEXT,                            -- next, react, vite, fastapi, node, python, docker, …
    package_manager  TEXT,                            -- npm, pnpm, yarn, bun, pip, poetry, …
    language         TEXT,                            -- ts, js, py, go, rs, …
    git_remote       TEXT,
    git_branch       TEXT,
    attached_at      INTEGER NOT NULL,
    last_seen_at     INTEGER NOT NULL,
    status           TEXT    NOT NULL CHECK (status IN ('attached','detached','scanning','error','demo')),
    file_count       INTEGER NOT NULL DEFAULT 0,
    meta_json        TEXT    NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);
CREATE INDEX IF NOT EXISTS idx_workspaces_attached ON workspaces(attached_at);
