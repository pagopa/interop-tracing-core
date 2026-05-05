import { v4 as uuidv4 } from "uuid";
import { tracingState } from "pagopa-interop-tracing-models";

export const sqsMessages = {
  processingResult: {
    badFormatted: {
      tracingId: uuidv4(),
      state: tracingState.error,
      version: null,
      errorsCsvPath: 123,
    },
    missingTracingId: {
      state: tracingState.error,
      version: 1,
      errorsCsvPath: "s3://bucket/errors.csv",
    },
    validCompleted: {
      tracingId: uuidv4(),
      state: tracingState.completed,
      version: 1,
    },
    validError: {
      tracingId: uuidv4(),
      state: tracingState.error,
      version: 1,
      errorsCsvPath: "s3://bucket/errors.csv",
    },
    validWarning: {
      tracingId: uuidv4(),
      state: tracingState.warning,
      version: 1,
      errorsCsvPath: "s3://bucket/errors.csv",
    },
    empty: {},
  },
} as const;
