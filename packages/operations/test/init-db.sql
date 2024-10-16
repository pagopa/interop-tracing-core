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
    purpose_title VARCHAR(2048) NOT NULL
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

INSERT INTO
    tracing.tenants (id, name, origin, external_id, deleted)
VALUES
    (
        '123e4567-e89b-12d3-a456-426614174001',
        'PagoPa 4001',
        'PagoPa 4001 origin',
        '123e4567-e89b-12d3-a456-426614174001',
        false
    ),
    (
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        'PagoPa 4000',
        'PagoPa 4000 origin',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        false
    );

INSERT INTO
    tracing.eservices (eservice_id, producer_id, name)
VALUES
    (
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        'eservice A'
    ),
    (
        'c7d7f420-5b5d-4b19-931f-4f2e31232e98',
        '123e4567-e89b-12d3-a456-426614174001',
        'eservice B'
    );

INSERT INTO
    tracing.purposes (id, consumer_id, eservice_id, purpose_title)
VALUES
    (
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Voucher 1b361d49-33f4-4f1e-a88b-4e12661f2300'
    ),
    (
        '0e1e4c98-6f2e-4f55-90e3-45f7d3f1dbf8',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 1'
    ),
    (
        '1cafea11-08a0-4eaf-a3ee-3e9839c8c2a9',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 2'
    ),
    (
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 3'
    ),
    (
        '4d5b6c64-6893-45f7-8985-7964c6750d34',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 4'
    ),
    (
        '5c9e2733-75b8-4f9f-b9a2-fc8280d2e2df',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 5'
    ),
    (
        '8c65d0e9-2b4f-4cd9-a6b1-649c0075aef3',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 6'
    ),
    (
        'aeb0a43a-d4d0-4291-96b6-474b7417d3a7',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 7'
    ),
    (
        'c7d7f420-5b5d-4b19-931f-4f2e356b2e01',
        '123e4567-e89b-12d3-a456-426614174001',
        'c7d7f420-5b5d-4b19-931f-4f2e31232e98',
        'Voucher c7d7f420-5b5d-4b19-931f-4f2e356b2e01'
    ),
    (
        'b1b0e49e-cdfd-4e32-b098-20d7c8d0b1d7',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        'c7d7f420-5b5d-4b19-931f-4f2e31232e98',
        'Purpose 8'
    ),
    (
        'dafebd8c-7c8f-4f2b-92b3-7b2846dcee92',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 9'
    ),
    (
        'f7e2abbe-9885-4f3e-8ef3-7690ab4b9ad1',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        '536d469f-ccf2-41be-baed-7d4049f774a2',
        'Purpose 10'
    ),
    (
        'be9b905c-fdb1-4c3c-a2d2-3595233d5f7c',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        'c7d7f420-5b5d-4b19-931f-4f2e31232e98',
        'Purpose 11 - Recover for missing submission'
    ),
    (
        '66e1bf00-c330-4865-8fa4-e010ba0020f9',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        'c7d7f420-5b5d-4b19-931f-4f2e31232e98',
        'Purpose 12 - Recover for missing submission'
    ),
    (
        '31c65010-2155-4e3f-beb3-732267102793',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        'c7d7f420-5b5d-4b19-931f-4f2e31232e98',
        'Purpose 13'
    ),
    (
        '738082d5-538a-45b7-99c7-17512454ed29',
        '1b361d49-33f4-4f1e-a88b-4e12661f2300',
        'c7d7f420-5b5d-4b19-931f-4f2e31232e98',
        'Purpose 14'
    );