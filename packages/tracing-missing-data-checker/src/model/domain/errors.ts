import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorSaveMissingTracing: "0601",
  errorGetTenantsWithMissingTracings: "0602",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorSaveMissingTracing(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorSaveMissingTracing",
  });
}

export function errorGetTenantsWithMissingTracings(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorGetTenantsWithMissingTracings",
  });
}
