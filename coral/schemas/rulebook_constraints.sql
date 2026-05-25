-- onyx_cognition.rulebook_constraints
-- Grain: one row per evaluation of a declarative operational rule.
-- The rulebook lets operators codify invariants ("p95 latency < 300ms",
-- "complexity must not grow >25% per commit") and surfaces breaches.

CREATE TABLE IF NOT EXISTS rulebook_constraints (
    id              TEXT PRIMARY KEY,
    ts              INTEGER NOT NULL,
    rule_id         TEXT    NOT NULL,
    rule_name       TEXT    NOT NULL,
    domain          TEXT    NOT NULL CHECK (domain IN ('workspace','network','system','execution','build')),
    target          TEXT,                             -- file / endpoint / process
    severity        TEXT    NOT NULL CHECK (severity IN ('info','warn','breach','critical')),
    expression      TEXT    NOT NULL,                 -- the SQL/DSL expression evaluated
    observed_value  REAL,
    threshold       REAL,
    breached        INTEGER NOT NULL DEFAULT 0,       -- 0/1
    streak          INTEGER NOT NULL DEFAULT 0,       -- consecutive breach count
    session_id      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rulebook_ts   ON rulebook_constraints(ts);
CREATE INDEX IF NOT EXISTS idx_rulebook_rule ON rulebook_constraints(rule_id);
CREATE INDEX IF NOT EXISTS idx_rulebook_brch ON rulebook_constraints(breached);
