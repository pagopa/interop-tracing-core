import { v4 as uuidv4 } from "uuid";
import { PurposeErrorCodes } from "pagopa-interop-tracing-commons";
import { tracingState } from "pagopa-interop-tracing-models";

export const sqsMessages = {
  savePurposeError: {
    badFormatted: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: null,
      date: "2023-04-06T00:00:00.000Z",
      errorCode: PurposeErrorCodes.INVALID_STATUS_CODE,
      message: "INVALID_STATUS_CODE",
      rowNumber: 13,
      updateTracingState: false,
      status: "2000",
    },
    missingTracingId: {
      purposeId: uuidv4(),
      version: 1,
      date: "2023-04-06T00:00:00.000Z",
      errorCode: PurposeErrorCodes.INVALID_PURPOSE,
      message: "INVALID_PURPOSE",
      rowNumber: 13,
      updateTracingState: false,
      status: 200,
    },
    valid: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: 1,
      date: "2023-04-06T00:00:00.000Z",
      errorCode: PurposeErrorCodes.INVALID_ROW_SCHEMA,
      message: "INVALID_ROW_SCHEMA",
      rowNumber: 13,
      updateTracingState: false,
      status: 200,
    },
    validWithTacingUpdateStateTrue: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: 1,
      date: "2023-04-06T00:00:00.000Z",
      errorCode: PurposeErrorCodes.INVALID_ROW_SCHEMA,
      message: "INVALID_ROW_SCHEMA",
      rowNumber: 13,
      updateTracingState: true,
      status: 200,
    },
    empty: {},
  },
  updateTracingState: {
    badFormatted: {
      tracingId: uuidv4(),
      state: tracingState.error,
      version: null,
    },
    missingTracingId: {
      state: tracingState.error,
      version: null,
    },
    valid: {
      tracingId: uuidv4(),
      state: tracingState.error,
      version: 1,
    },
    empty: {},
  },
} as const;
