import {
  InternalError,
  makeApiProblemBuilder,
} from "pagopa-interop-tracing-models";

export const errorCodes = {
  tracingCannotBeCancelled: "1000",
  invalidPreviousTracingState: "1001",
};

export type ErrorCodes = keyof typeof errorCodes;

export const makeApiProblem = makeApiProblemBuilder(errorCodes);

export function tracingCannotBeCancelled(
  tracingId: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `Tracing with Id ${tracingId} cannot be cancelled. The state of tracing must be PENDING.`,
    code: "tracingCannotBeCancelled",
  });
}

export function invalidPreviousTracingState(
  tracingId: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `Tracing with Id ${tracingId} cannot be cancelled. The previous state of tracing must be either ERROR or MISSING.`,
    code: "invalidPreviousTracingState",
  });
}
