CREATE SCHEMA IF NOT EXISTS tracing;

CREATE TABLE tracing.traces (
    id VARCHAR(36) PRIMARY KEY,
    tracing_id VARCHAR(36),
    submitter_id VARCHAR(36),
    date TIMESTAMP NOT NULL,
    purpose_id VARCHAR(36),
    token_id VARCHAR(36),
    status INTEGER,
    requests_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- PostgreSQL only
CREATE INDEX IF NOT EXISTS idx_tracing_traces_tracing_id ON tracing.traces (tracing_id);