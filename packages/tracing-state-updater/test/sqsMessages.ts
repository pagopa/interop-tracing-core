import { v4 as uuidv4 } from "uuid";
import { PurposeErrorCodes } from "pagopa-interop-tracing-commons";
import { tracingState } from "pagopa-interop-tracing-models";

export const sqsMessages = {
  savePurposeError: {
    badFormatted: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: null,
      errorCode: PurposeErrorCodes.INVALID_STATUS_CODE,
      message: "INVALID_STATUS_CODE",
      rowNumber: 13,
      updateTracingState: false,
    },
    missingTracingId: {
      purposeId: uuidv4(),
      version: 1,
      errorCode: PurposeErrorCodes.INVALID_PURPOSE,
      message: "INVALID_PURPOSE",
      rowNumber: 13,
      updateTracingState: false,
    },
    valid: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: 1,
      errorCode: PurposeErrorCodes.INVALID_ROW_SCHEMA,
      message: "INVALID_ROW_SCHEMA",
      rowNumber: 13,
      updateTracingState: false,
    },
    validWithTacingUpdateStateTrue: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: 1,
      errorCode: PurposeErrorCodes.INVALID_ROW_SCHEMA,
      message: "INVALID_ROW_SCHEMA",
      rowNumber: 13,
      updateTracingState: true,
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
    replacing: {
      tracingId: uuidv4(),
      state: tracingState.completed,
      version: 1,
      isReplacing: true,
    },
    empty: {},
  },
} as const;
