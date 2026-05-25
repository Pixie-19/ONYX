-- onyx_cognition.replay_events
-- Grain: one row per causal event published on the ONYX event bus.
-- This is the append-only spine of the Chrono Replay engine — every UI
-- replay scrubs across this table.

CREATE TABLE IF NOT EXISTS replay_events (
    id                TEXT PRIMARY KEY,
    ts                INTEGER NOT NULL,
    seq               INTEGER NOT NULL,             -- monotonic per session
    kind              TEXT    NOT NULL,             -- e.g. FILE_MODIFIED, COMPILER_FAILURE
    severity          TEXT    NOT NULL CHECK (severity IN ('info','warn','error','critical')),
    trace_id          TEXT    NOT NULL,
    parent_trace_id   TEXT,                         -- causal parent
    source            TEXT    NOT NULL,             -- interceptor name
    target            TEXT,                         -- file / endpoint / pid / node
    payload_json      TEXT    NOT NULL DEFAULT '{}',
    duration_ms       INTEGER,
    session_id        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_replay_ts        ON replay_events(ts);
CREATE INDEX IF NOT EXISTS idx_replay_seq       ON replay_events(seq);
CREATE INDEX IF NOT EXISTS idx_replay_trace     ON replay_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_replay_parent    ON replay_events(parent_trace_id);
CREATE INDEX IF NOT EXISTS idx_replay_kind      ON replay_events(kind);
CREATE INDEX IF NOT EXISTS idx_replay_session   ON replay_events(session_id);
