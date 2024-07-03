CREATE SCHEMA IF NOT EXISTS tracing;

CREATE TABLE IF NOT EXISTS tracing.tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    deleted BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS tracing.eservices (
    eservice_id UUID PRIMARY KEY,
    purpose_id VARCHAR,
    consumer_id VARCHAR,
    producer_id VARCHAR,
    date TIMESTAMP,
    origin VARCHAR,
    external_id VARCHAR,
    purpose_title VARCHAR,
    producer_name VARCHAR,
    consumer_name VARCHAR
);

CREATE TABLE IF NOT EXISTS tracing.purposes (
    id UUID PRIMARY KEY,
    consumer_id UUID NOT NULL,
    eservice_id UUID NOT NULL,
    purpose_title VARCHAR(2048) NOT NULL
);

CREATE TABLE IF NOT EXISTS tracing.tracings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    state VARCHAR(255) NOT NULL CHECK (state IN ('PENDING', 'COMPLETED', 'MISSING', 'ERROR')),
    date TIMESTAMP NOT NULL,
    version INT NOT NULL,
    errors BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tracing.tenants(id)
);

CREATE TABLE IF NOT EXISTS tracing.purposes_errors (
    id UUID PRIMARY KEY,
    tracing_id UUID NOT NULL,
    version INT NOT NULL,
    purpose_id UUID NOT NULL,
    error_code VARCHAR(255) NOT NULL,
    message VARCHAR(2048) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tracing_id) REFERENCES tracing.tracings(id),
    FOREIGN KEY (purpose_id) REFERENCES tracing.purposes(id)
);
