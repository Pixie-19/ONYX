-- onyx_cognition.network_trajectories
-- Grain: one row per probe tick against a watched endpoint (loopback or remote).
-- Captures latency, jitter, retries, and dependency health trajectory.

CREATE TABLE IF NOT EXISTS network_trajectories (
    id              TEXT PRIMARY KEY,
    ts              INTEGER NOT NULL,
    endpoint        TEXT    NOT NULL,
    kind            TEXT    NOT NULL CHECK (kind IN ('localhost','outbound','dependency','dns')),
    port            INTEGER,
    rtt_ms          REAL    NOT NULL DEFAULT 0,
    jitter_ms       REAL    NOT NULL DEFAULT 0,
    packet_loss     REAL    NOT NULL DEFAULT 0,    -- 0..1
    retries         INTEGER NOT NULL DEFAULT 0,
    status          TEXT    NOT NULL CHECK (status IN ('healthy','degraded','retry','offline')),
    bytes_in        INTEGER NOT NULL DEFAULT 0,
    bytes_out       INTEGER NOT NULL DEFAULT 0,
    session_id      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_net_traj_ts   ON network_trajectories(ts);
CREATE INDEX IF NOT EXISTS idx_net_traj_ep   ON network_trajectories(endpoint);
CREATE INDEX IF NOT EXISTS idx_net_traj_stat ON network_trajectories(status);
