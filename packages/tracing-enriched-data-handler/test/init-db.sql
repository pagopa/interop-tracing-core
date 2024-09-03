CREATE SCHEMA IF NOT EXISTS traces;

CREATE TABLE traces.traces (
    id UUID PRIMARY KEY,
    tracing_id UUID,
    submitter_id UUID,
    date DATE,
    purpose_id UUID,
    purpose_name VARCHAR(255),
    status INTEGER,
    requests_count INTEGER,
    eservice_id UUID,
    consumer_id UUID,
    consumer_origin VARCHAR(255),
    consumer_name VARCHAR(255),
    consumer_external_id UUID,
    producer_id UUID,
    producer_name VARCHAR(255),
    producer_origin VARCHAR(255),
    producer_external_id UUID,
    created_at DATE
);