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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);