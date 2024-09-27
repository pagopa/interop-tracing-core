CREATE SCHEMA IF NOT EXISTS tracing;

CREATE TABLE IF NOT EXISTS tracing.tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    origin VARCHAR(255),
    external_id VARCHAR(255),
    deleted BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS tracing.eservices (
    eservice_id UUID PRIMARY KEY,
    producer_id UUID NOT NULL,
    name VARCHAR(2048) NOT NULL
);

CREATE TABLE IF NOT EXISTS tracing.purposes (
    id UUID PRIMARY KEY,
    consumer_id UUID NOT NULL,
    eservice_id UUID NOT NULL,
    purpose_title VARCHAR(2048) NOT NULL,
    FOREIGN KEY (consumer_id) REFERENCES tracing.tenants(id),
    FOREIGN KEY (eservice_id) REFERENCES tracing.eservices(eservice_id)
);

CREATE TABLE IF NOT EXISTS tracing.tracings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    state VARCHAR(255) NOT NULL CHECK (
        state IN ('PENDING', 'COMPLETED', 'MISSING', 'ERROR')
    ),
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
    purpose_id VARCHAR(255) NOT NULL,
    error_code VARCHAR(255) NOT NULL,
    message VARCHAR(2048) NOT NULL,
    row_number INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tracing_id) REFERENCES tracing.tracings(id)
);