import {
  ApiError,
  CommonErrorCodes,
  makeApiProblemBuilder,
} from "pagopa-interop-tracing-models";

export const errorCodes = {
  tracingNotFound: "0001",
  tenantNotFound: "0002",
};

export type ErrorCodes = keyof typeof errorCodes;

export const makeApiProblem = makeApiProblemBuilder(errorCodes);

export function tracingNotFound(tracingId: string): ApiError<ErrorCodes> {
  return new ApiError({
    detail: `Tracing by ${tracingId} not found`,
    code: "tracingNotFound",
    title: "Tracing not found",
  });
}

export function unauthorizedError(details: string): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: details,
    code: "unauthorizedError",
    title: "Unauthorized",
  });
}
