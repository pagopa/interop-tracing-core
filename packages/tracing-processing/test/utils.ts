import { SavePurposeErrorDto } from "pagopa-interop-tracing-models";
import {
  EserviceSchema,
  TracingContent,
  TracingRecords,
} from "../src/models/messages.js";

export const generateMockTracingRecords = (): TracingRecords => {
  return [
    {
      date: "2024-12-12",
      purpose_id: "123e4567-e89b-12d3-a456-426614174000",
      status: "200",
      requests_count: "10",
      rowNumber: 1,
    },
    {
      date: "2024-12-12",
      purpose_id: "223e4567-e89b-12d3-a456-426614174001",
      status: "204",
      requests_count: "5",
      rowNumber: 2,
    },
    {
      date: "2024-12-12",
      purpose_id: "223e4567-e89b-12d3-a456-426614174001",
      status: "204",
      requests_count: "5",
      rowNumber: 2,
    },
  ];
};
export const generateWrongMockTracingRecords = () => {
  return [
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
      requests_count: 404,
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
};

export const generateEnrichedPurposes = () => {
  return [
    {
      date: "2024-12-12",
      purpose_id: "123e4567-e89b-12d3-a456-426614174000",
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
};

export const generateEnrichedPurposesWithErrors = () => {
  return [
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
};

export const generateErrorPurposes: Partial<SavePurposeErrorDto>[] = [
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
