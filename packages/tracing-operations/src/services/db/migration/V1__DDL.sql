CREATE SCHEMA IF NOT EXISTS tracing;

CREATE TABLE tracing.tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    deleted BOOLEAN NOT NULL
);

CREATE TABLE tracing.eservices (
    eservice_id UUID PRIMARY KEY,
    producer_id UUID NOT NULL
);

CREATE TABLE tracing.purposes (
    id UUID PRIMARY KEY,
    consumer_id UUID NOT NULL,
    eservice_id UUID NOT NULL,
    purpose_title VARCHAR(2048) NOT NULL,
    FOREIGN KEY (consumer_id) REFERENCES tracing.tenants(id)
);

CREATE TABLE tracing.tracings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    state VARCHAR(255) NOT NULL CHECK (
        state IN ('PENDING', 'COMPLETED', 'MISSING', 'ERROR')
    ),
    date TIMESTAMP NOT NULL,
    version INT NOT NULL,
    errors BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_t TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tracing.tenants(id)
);

CREATE TABLE tracing.purposes_errors (
    id UUID PRIMARY KEY,
    tracing_id UUID NOT NULL,
    version INT NOT NULL,
    purpose_id UUID NOT NULL,
    error_code VARCHAR(255) NOT NULL,
    message VARCHAR(2048) NOT NULL,
    row_number INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tracing_id) REFERENCES tracing.tracings(id),
    FOREIGN KEY (purpose_id) REFERENCES tracing.purposes(id),
    UNIQUE (tracing_id, purpose_id, version, row_number)
);