import {
  InternalError,
  makeApiProblemBuilder,
} from "pagopa-interop-tracing-models";

export const errorCodes = {
  tracingNotFound: "TRACING_NOT_FOUND",
  tenantNotFound: "TENANT_NOT_FOUND",
  tracingAlreadyExists: "TRACING_ALREADY_EXISTS",
  tracingCannotBeCancelled: "TRACING_CANNOT_BE_CANCELLED",
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
