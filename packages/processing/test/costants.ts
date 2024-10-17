import {
  generateId,
  SavePurposeErrorDto,
  TracingFromS3KeyPathDto,
} from "pagopa-interop-tracing-models";
import { TracingRecordSchema } from "../src/models/db.js";
import { PurposeErrorCodes } from "pagopa-interop-tracing-commons";

export const mockTracingRecords: TracingRecordSchema[] = [
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
    status: 404,
    requests_count: "50",
    rowNumber: 3,
  },
];

export const wrongMockTracingRecords = [
  {
    date: "2024-12-12",
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
] as unknown as TracingRecordSchema[];

export const mockEnrichedPurposesWithErrors = [
  {
    purposeId: generateId(),
    status: 200,
    rowNumber: 1,
    message: PurposeErrorCodes.PURPOSE_NOT_FOUND,
    errorCode: PurposeErrorCodes.PURPOSE_NOT_FOUND,
  },
  {
    purposeId: generateId(),
    status: 200,
    rowNumber: 1,
    message: PurposeErrorCodes.INVALID_DATE,
    errorCode: PurposeErrorCodes.INVALID_DATE,
  },
  {
    purposeId: generateId(),
    status: 200,
    rowNumber: 1,
    message: PurposeErrorCodes.TENANT_IS_NOT_PRODUCER_OR_CONSUMER,
    errorCode: PurposeErrorCodes.TENANT_IS_NOT_PRODUCER_OR_CONSUMER,
  },
];

export const mockFormalErrors = [
  {
    purposeId: generateId(),
    status: 200,
    rowNumber: 1,
    message: PurposeErrorCodes.INVALID_REQUEST_COUNT,
    errorCode: PurposeErrorCodes.INVALID_REQUEST_COUNT,
  },
];
export const mockErrorPurposes: Partial<SavePurposeErrorDto>[] = [
  {
    tracingId: "a33e4567-e89b-12d3-a456-426614174abe",
    version: 1,
    errorCode: "INVALID_FORMAL_CHECK",
    purposeId: "223e4567-e89b-12d3-a456-426614174001",
    message: "dummy message",
    rowNumber: 12,
    updateTracingState: false,
  },
  {
    tracingId: "a33e4567-e89b-12d3-a456-426614174abe",
    version: 1,
    errorCode: "INVALID_FORMAL_CHECK",
    purposeId: "223e4567-e89b-12d3-a456-426614174001",
    message: "dummy message",
    rowNumber: 13,
    updateTracingState: false,
  },
];

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
            key: "tenantId%3D123e4567-e89b-12d3-a456-426614174001/date%3D2024-12-12/tracingId%3D87dcfab8-3161-430b-97db-7787a77a7a3d/version%3D1/correlationId%3D8fa62e67-92bf-48f8-a9e1-4e73a37c4682/9b523269-2e59-4d74-b6dc-4d0594e56eb3.csv",
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
const tenant_id = "123e4567-e89b-12d3-a456-426614174001";
const purposeId = generateId() as string;
const purposeId2 = generateId() as string;

export const mockMessage: TracingFromS3KeyPathDto = {
  tenantId: tenant_id,
  date: "2024-12-12",
  version: 1,
  correlationId: "8fa62e67-92bf-48f8-a9e1-4e73a37c4682",
  tracingId: "87dcfab8-3161-430b-97db-7787a77a7a3d",
};
export const purposeData = {
  id: purposeId,
  consumerId: tenant_id,
  eserviceId: eservice_id,
  purposeTitle: "purpose title",
};

export const purposeDataWithWrongEservice = {
  id: purposeId2,
  consumerId: tenant_id,
  eserviceId: eservice_idNotAssociated,
  purposeTitle: "purpose title",
};

export const eServiceData = {
  eserviceId: eservice_id,
  producerId: tenant_id,
  name: "eservice name",
};

export const eServiceDataNotAssociated = {
  eserviceId: eservice_idNotAssociated,
  producerId: tenant_id as string,
  name: "eservice name",
};

export const tenantData = {
  id: tenant_id,
  name: "comune",
  origin: "pagoPa",
  externalId: generateId() as string,
  deleted: false,
};

export const errorPurposesWithInvalidPurposeId = [
  {
    date: "2024-12-12",
    purpose_id: generateId() as string,
    status: 200,
    requests_count: 10,
    purposeName: "",
    eserviceId: eServiceData.eserviceId,
    producerId: eServiceData.producerId,
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: generateId() as string,
    status: 404,
    requests_count: 5,
    purposeName: "",
    eserviceId: eServiceData.eserviceId,
    producerId: eServiceData.producerId,
    rowNumber: 2,
  },
];
export const errorPurposesWithInvalidEserviceId = [
  {
    date: "2024-12-12",
    purpose_id: purposeId2,
    status: 200,
    requests_count: 10,
    purposeName: "",
    eserviceId: null,
    producerId: eServiceData.producerId,
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: purposeId2,
    status: 404,
    requests_count: 5,
    purposeName: "",
    eserviceId: null,
    producerId: eServiceData.producerId,
    rowNumber: 2,
  },
];
export const validPurpose = [
  {
    date: "2024-12-12",
    purpose_id: purposeId,
    status: 200,
    requests_count: 10,
    purposeName: "",
    eserviceId: eServiceData.eserviceId,
    producerId: eServiceData.producerId,
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: purposeId,
    status: 404,
    requests_count: 5,
    purposeName: "",
    eserviceId: eServiceData.eserviceId,
    producerId: eServiceData.producerId,
    rowNumber: 2,
  },
];

export const validPurposeNotAssociated = [
  {
    date: "2024-12-12",
    purpose_id: purposeId,
    status: 200,
    requests_count: 10,
    purposeName: "",
    eserviceId: eServiceDataNotAssociated.eserviceId,
    producerId: eServiceDataNotAssociated.producerId,
    rowNumber: 1,
  },
  {
    date: "2024-12-12",
    purpose_id: purposeId,
    status: 404,
    requests_count: 5,
    purposeName: "",
    eserviceId: eServiceDataNotAssociated.eserviceId,
    producerId: eServiceDataNotAssociated.producerId,
    rowNumber: 2,
  },
];

export const mockEnrichedPurposes = [
  {
    tracingId: generateId() as string,
    consumerOrigin: "origin",
    producerOrigin: "origin",
    consumerExternalId: "external id",
    producerExternalId: "external id",
    consumerId: "123e4567-e89b-12d3-a456-426614174001",
    consumerName: "consumer name",
    producerName: "consumer name",
    date: "2024-12-12",
    purposeId: "123e4567-e89b-12d3-a456-426614174001",
    status: 200,
    requestsCount: 10,
    purposeName: "",
    eserviceId: eServiceData.eserviceId,
    producerId: eServiceData.producerId,
    rowNumber: 1,
  },
  {
    tracingId: generateId() as string,
    consumerOrigin: "origin",
    producerOrigin: "origin",
    consumerExternalId: "external id",
    producerExternalId: "external id",
    consumerId: "123e4567-e89b-12d3-a456-426614174001",
    consumerName: "consumer name",
    producerName: "consumer name",
    date: "2024-12-12",
    purposeId: "223e4567-e89b-12d3-a456-426614174001",
    status: 404,
    requestsCount: 5,
    purposeName: "",
    eserviceId: eServiceData.eserviceId,
    producerId: eServiceData.producerId,
    rowNumber: 2,
  },
];

export const validEnrichedPurpose = [
  {
    submitterId: "123e4567-e89b-12d3-a456-426614174001",
    date: "2024-12-12",
    purpose_id: "9f693956-b8ca-4240-9d03-fa5d1c1b2f44",
    status: 200,
    requests_count: 10,
    purposeName: "purpose title",
    producerId: "123e4567-e89b-12d3-a456-426614174001",
    eserviceId: "b669a838-3306-4c7b-be24-16b17e1c8a0d",
    rowNumber: 1,
    purposeId: "9f693956-b8ca-4240-9d03-fa5d1c1b2f44",
    requestsCount: 10,
    tracingId: "87dcfab8-3161-430b-97db-7787a77a7a3d",
    consumerId: "9f693956-b8ca-4240-9d03-fa5d1c1b2f44",
    consumerName: "comune",
    consumerOrigin: "pagoPa",
    consumerExternalId: "d4702412-fe3d-4763-99ba-87c0a1e7f48d",
    producerName: "comune",
    producerOrigin: "pagoPa",
    producerExternalId: "d4702412-fe3d-4763-99ba-87c0a1e7f48d",
  },
  {
    submitterId: "123e4567-e89b-12d3-a456-426614174001",
    date: "2024-12-12",
    purpose_id: "9f693956-b8ca-4240-9d03-fa5d1c1b2f44",
    status: 404,
    requests_count: 5,
    purposeName: "purpose title",
    producerId: "123e4567-e89b-12d3-a456-426614174001",
    eserviceId: "b669a838-3306-4c7b-be24-16b17e1c8a0d",
    rowNumber: 2,
    purposeId: "9f693956-b8ca-4240-9d03-fa5d1c1b2f44",
    requestsCount: 5,
    tracingId: "87dcfab8-3161-430b-97db-7787a77a7a3d",
    consumerId: "9f693956-b8ca-4240-9d03-fa5d1c1b2f44",
    consumerName: "comune",
    consumerOrigin: "pagoPa",
    consumerExternalId: "d4702412-fe3d-4763-99ba-87c0a1e7f48d",
    producerName: "comune",
    producerOrigin: "pagoPa",
    producerExternalId: "d4702412-fe3d-4763-99ba-87c0a1e7f48d",
  },
];
