import {
  InternalError,
  makeApiProblemBuilder,
} from "pagopa-interop-tracing-models";

export const errorCodes = {
  tracingCannotBeCancelled: "1000",
  tracingNotFound: "0001",
  tenantNotFound: "0002",
  tracingAlreadyExists: "0003",
  copyObjectS3BucketError: "0004",
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

export function copyObjectS3BucketError(
  detail: unknown,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "copyObjectS3BucketError",
  });
}
