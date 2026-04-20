CREATE SCHEMA IF NOT EXISTS traces;

CREATE TABLE traces.traces (
    id VARCHAR(36) PRIMARY KEY,
    tracing_id VARCHAR(36),
    submitter_id VARCHAR(36),
    date TIMESTAMP NOT NULL,
    purpose_id VARCHAR(36),
    token_id VARCHAR(36),
    status INTEGER,
    requests_count INTEGER,
    consumer_id VARCHAR(36),
    producer_id VARCHAR(36),
    eservice_id VARCHAR(36),
    purpose_name VARCHAR(255),
    consumer_origin VARCHAR(255),
    consumer_name VARCHAR(255),
    consumer_external_id VARCHAR(255),
    producer_origin VARCHAR(255),
    producer_name VARCHAR(255),
    producer_external_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);