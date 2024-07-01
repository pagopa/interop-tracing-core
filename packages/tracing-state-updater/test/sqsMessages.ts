import { v4 as uuidv4 } from "uuid";
import { purposeErrorCodes } from "pagopa-interop-tracing-commons";
import { tracingState } from "pagopa-interop-tracing-models";

export const sqsMessages = {
  savePurposeError: {
    badFormatted: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: null,
      date: "2023-04-06T00:00:00.000Z",
      errorCode: purposeErrorCodes.INVALID_FORMAL_CHECK,
      message: "Generic invalid purpose formal check",
      rowNumber: 13,
      updateTracingState: false,
    },
    missingTracingId: {
      purposeId: uuidv4(),
      version: 1,
      date: "2023-04-06T00:00:00.000Z",
      errorCode: purposeErrorCodes.INVALID_FORMAL_CHECK,
      message: "Generic invalid purpose formal check",
      rowNumber: 13,
      updateTracingState: false,
    },
    valid: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: 1,
      date: "2023-04-06T00:00:00.000Z",
      errorCode: purposeErrorCodes.INVALID_FORMAL_CHECK,
      message: "Generic invalid purpose formal check",
      rowNumber: 13,
      updateTracingState: false,
    },
    validWithTacingUpdateStateTrue: {
      tracingId: uuidv4(),
      purposeId: uuidv4(),
      version: 1,
      date: "2023-04-06T00:00:00.000Z",
      errorCode: purposeErrorCodes.INVALID_FORMAL_CHECK,
      message: "Generic invalid purpose formal check",
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
    empty: {},
  },
} as const;
