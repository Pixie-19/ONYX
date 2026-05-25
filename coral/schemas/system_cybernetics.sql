-- onyx_cognition.system_cybernetics
-- Grain: one row per 1s tick from the system interceptor.
-- Captures CPU, memory, thermal, and disk pressure as a single coherent state vector.

CREATE TABLE IF NOT EXISTS system_cybernetics (
    id              TEXT PRIMARY KEY,
    ts              INTEGER NOT NULL,
    cpu_load        REAL    NOT NULL,             -- 0..1
    cpu_temp_c      REAL,
    mem_used_pct    REAL    NOT NULL,             -- 0..1
    mem_pressure    REAL    NOT NULL DEFAULT 0,   -- exp-weighted page fault rate
    swap_used_pct   REAL    NOT NULL DEFAULT 0,
    disk_busy_pct   REAL    NOT NULL DEFAULT 0,
    disk_iops       REAL    NOT NULL DEFAULT 0,
    thermal_state   TEXT    NOT NULL CHECK (thermal_state IN ('nominal','warm','hot','critical')),
    process_count   INTEGER NOT NULL DEFAULT 0,
    session_id      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sys_cyb_ts ON system_cybernetics(ts);
