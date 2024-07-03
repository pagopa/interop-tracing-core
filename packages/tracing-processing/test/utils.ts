import { SavePurposeErrorDto, generateId } from "pagopa-interop-tracing-models";
import {
  EserviceSchema,
  TracingContent,
  TracingRecords,
} from "../src/models/messages.js";
import { DB } from "pagopa-interop-tracing-commons";

export async function addPurpose(
  purposeValues: {
    id: string;
    consumer_id: string;
    eservice_id: string;
    purpose_title: string;
  },
  db: DB,
) {
  const insertPurposeQuery = `
      INSERT INTO tracing.purposes (id, consumer_id, eservice_id, purpose_title)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

  return await db.one(insertPurposeQuery, Object.values(purposeValues));
}

export async function addTenant(
  tenantValues: {
    id: string;
    name: string;
    origin: string;
    externalId: string;
    deleted: boolean;
  },
  db: DB,
) {
  const insertTenantQuery = `
      INSERT INTO tracing.tenants (id, name, origin, external_id, deleted)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

  return await db.one(insertTenantQuery, Object.values(tenantValues));
}

export async function addEservice(eServiceValues: EserviceSchema, db: DB) {
  const insertEserviceQuery = `
  INSERT INTO tracing.eservices (eservice_id, purpose_id, consumer_id, producer_id, date, origin, external_id, purpose_title, producer_name, consumer_name)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING eservice_id`;
  await db.one(insertEserviceQuery, Object.values(eServiceValues));
}

export async function clearTracings(db: DB) {
  const deleteTracingsQuery = `
  DELETE FROM tracing.tracings;
  `;
  await db.any(deleteTracingsQuery);
}

export const mockTracingRecords: TracingRecords = [
  {
    date: "2024-12-12",
    purpose_id: "123e4567-e89b-12d3-a456-426614174000",
    status: 200,
    requests_count: "10",
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    status: 204,
    requests_count: "5",
    rowNumber: 2,
  },
  {
    date: "2024-12-12",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    status: 204,
    requests_count: "5",
    rowNumber: 2,
  },
];

export const wrongMockTracingRecords = [
  {
    date: "2023-01-01",
    purposeId: "123e4567-e89b-12d3-a456-426614174000",
    status: 200,
    requests_count: "10",
    rowNumber: 1,
  },
  {
    date: "2023-01-02",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    requests_count: "40",
    rowNumber: 2,
  },
  {
    date: "2023-01-02",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    status: 404,
    requests_count: "404",
    rowNumber: 2,
  },
  {
    date: "2023-01-02",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    status: 404,
    requests_count: "404",
  },
  {
    date: "2023-01-02",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    status: 404,
    rowNumber: undefined,
  },
];

export const mockEnrichedPurposes = [
  {
    date: "2024-12-12",
    purpose_id: "123e4567-e89b-12d3-a456-426614174001",
    status: 200,
    requests_count: "10",
    purposeName: "",
    eservice: {} as EserviceSchema,
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    status: 404,
    requests_count: "5",
    purposeName: "",
    eservice: {} as EserviceSchema,
    rowNumber: 2,
  },
];

export const mockEnrichedPurposesWithErrors = [
  {
    date: "2023-01-01",
    purpose_id: "123e4567-e89b-12d3-a456-426614174000",
    status: 200,
    requests_count: "10",
    purposeName: "",
    error: "Purpose not found",
    errorCode: "PURPOSE_NOT_FOUND",
    eservice: {} as EserviceSchema,
    rowNumber: 1,
  },
  {
    date: "2023-01-02",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    status: 404,
    requests_count: "5",
    purposeName: "",
    errorMessage: "Eservice not found",
    errorCode: "ESERVICE_NOT_FOUND",
    eservice: {} as EserviceSchema,
    rowNumber: 2,
  },
  {
    date: "2023-01-02",
    purpose_id: "223e4567-e89b-12d3-a456-426614174001",
    status: 404,
    requests_count: "5",
    purposeName: "",
    errorMessage: "Eservice not associated",
    errorCode: "ESERVICE_NOT_ASSOCIATED",
    eservice: {} as EserviceSchema,
    rowNumber: 3,
  },
];
export const mockErrorPurposes: Partial<SavePurposeErrorDto>[] = [
  {
    tracingId: "a33e4567-e89b-12d3-a456-426614174abe",
    version: "1",
    date: "2024-12-12",
    errorCode: "INVALID_FORMAL_CHECK",
    purposeId: "223e4567-e89b-12d3-a456-426614174001",
    message: "dummy message",
    rowNumber: 12,
    updateTracingState: false,
  },
  {
    tracingId: "a33e4567-e89b-12d3-a456-426614174abe",
    version: "1",
    date: "2024-12-12",
    errorCode: "INVALID_FORMAL_CHECK",
    purposeId: "223e4567-e89b-12d3-a456-426614174001",
    message: "dummy message",
    rowNumber: 13,
    updateTracingState: false,
  },
];

export const mockMessage: TracingContent = {
  tenantId: "223e4567-e89b-12d3-a456-426614174001",
  date: "2024-12-12",
  version: "1",
  correlationId: "133e4567-e89b-12d3-a456-426614174e3a",
  tracingId: "a33e4567-e89b-12d3-a456-426614174abe",
};

export const SqsMockMessageForS3 = {
  Body: {
    Records: [
      {
        eventVersion: "2.1",
        eventSource: "aws:s3",
        awsRegion: "eu-central-1",
        eventTime: "2024-07-03T10:54:13.114Z",
        eventName: "ObjectCreated:Put",
        userIdentity: {
          principalId: "A3877ZKQN63M4Q",
        },
        requestParameters: {
          sourceIPAddress: "93.47.40.36",
        },
        responseElements: {
          "x-amz-request-id": "7YRRBBQKP029E4Z3",
          "x-amz-id-2":
            "+OG966lqOtiu4Q4CDVguVCVTvvNNtnXUgd34pJyuPBbGnjTJSOhUS72x7uo3h/kRkv24TxWqFOOgLJSOeg1qBCNpfizmPbhS",
        },
        s3: {
          s3SchemaVersion: "1.0",
          configurationId: "tracings-upload",
          bucket: {
            name: "interop-tracing",
            ownerIdentity: {
              principalId: "A3877ZKQN63M4Q",
            },
            arn: "arn:aws:s3:::interop-tracing",
          },
          object: {
            key: "tenantId%3D123e4567-e89b-12d3-a456-426614174001/date%3D2024-07-05/tracingId%3D87dcfab8-3161-430b-97db-7787a77a7a3d/version%3D1/correlationId%3D8fa62e67-92bf-48f8-a9e1-4e73a37c4682/9b523269-2e59-4d74-b6dc-4d0594e56eb3.csv",
            size: 642,
            eTag: "16727c9a88cb1ee281c49bf3e9c50565",
            sequencer: "0066852DD516200820",
          },
        },
      },
    ],
  },
  MD5OfBody: "87b3761ee74ef43ceed1efadcfaefb0f",
  MessageId: "d01b405c-62c9-4e27-8095-58381591e9c9",
  ReceiptHandle:
    "AQEB7xMhTS53grQoCzQKeyFrtoosWTcfXvsLs4uD91OPQV14BvzSQ4MxX5UTJ+5KZDP4h/k+pxd3qjgmpujopBAQLzlGVg1Gb0cXBE88Z0pdXK33383CMpuTf9RmfKtTBCgBmJId2iFplBj73QVXlWRDP7JL9z1XuFTPKTsJVvpyB7jsBXLLRkPlQSWdxwtvM7ZIc5TZcvz7JTaSn0sxS0AO06I/sMPavdGRi8fyPn2a1d/m35NczQ2YWdxi2sGDE337LltaSCYTCVSyk6iq23SdwvICWF/dxxqqQXxWiM8rPmTsyUeS/ly287A1XyEtC9cx5zLNqbCwTDXnRIZaaetrZ8y0yeKY+Z3xxbuvqI8bBpwOHMhMAla7dCS9tZMJpud7tXtrvsTbRBD+oV291vl9+A==",
};
const eservice_id = generateId() as string;
const eservice_idNotAssociated = generateId() as string;
const tenant_id = generateId() as string;
const purpose_id = generateId() as string;
const purpose_id2 = generateId() as string;

export const purposeData = {
  id: purpose_id,
  consumer_id: tenant_id,
  eservice_id: eservice_id,
  purpose_title: "purpose title",
};

export const purposeDataWithWrongEservice = {
  id: purpose_id2,
  consumer_id: tenant_id,
  eservice_id: generateId(),
  purpose_title: "purpose title",
};

export const eServiceData = {
  eservice_id: eservice_id,
  purpose_id: purpose_id,
  consumer_id: tenant_id,
  producer_id: tenant_id,
  date: new Date().toDateString(),
  origin: "pagoPa",
  external_id: generateId() as string,
  purpose_title: "purpose title",
  producer_name: "PagoPa",
  consumer_name: "consumer name",
};

export const eServiceDataNotAssociated = {
  eservice_id: eservice_idNotAssociated,
  purpose_id: purpose_id,
  consumer_id: generateId() as string,
  producer_id: generateId() as string,
  date: new Date().toDateString(),
  origin: "pagoPa",
  external_id: generateId() as string,
  purpose_title: "purpose title",
  producer_name: "PagoPa",
  consumer_name: "consumer name",
};

export const tenantData = {
  id: tenant_id,
  name: "pagoPa",
  origin: "pagoPa",
  externalId: generateId() as string,
  deleted: false,
};

export const errorPurposesWithInvalidPurposeId = [
  {
    date: "2024-12-12",
    purpose_id: generateId() as string,
    status: 200,
    requests_count: "10",
    purposeName: "",
    eservice: eServiceData,
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: generateId() as string,
    status: 404,
    requests_count: "5",
    purposeName: "",
    eservice: eServiceData,
    rowNumber: 2,
  },
];
export const errorPurposesWithInvalidEserviceId = [
  {
    date: "2024-12-12",
    purpose_id: purpose_id2,
    status: 200,
    requests_count: "10",
    purposeName: "",
    eservice: {},
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: purpose_id2,
    status: 404,
    requests_count: "5",
    purposeName: "",
    eservice: {},
    rowNumber: 2,
  },
];
export const validPurpose = [
  {
    date: "2024-12-12",
    purpose_id: purpose_id,
    status: 200,
    requests_count: "10",
    purposeName: "",
    eservice: eServiceData,
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: purpose_id,
    status: 404,
    requests_count: "5",
    purposeName: "",
    eservice: eServiceData,
    rowNumber: 2,
  },
];

export const validPurposeNotAssociated = [
  {
    date: "2024-12-12",
    purpose_id: purpose_id,
    status: 200,
    requests_count: "10",
    purposeName: "",
    eservice: eServiceDataNotAssociated,
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: purpose_id,
    status: 404,
    requests_count: "5",
    purposeName: "",
    eservice: eServiceDataNotAssociated,
    rowNumber: 2,
  },
];
