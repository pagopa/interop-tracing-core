import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorSaveMissingTracing: "ERROR_SAVE_MISSING_TRACING",
  errorGetTenantsWithMissingTracings: "ERROR_GET_TENANTS_WITH_MISSING_TRACINGS",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorSaveMissingTracing(
  detail: string
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorSaveMissingTracing",
  });
}

export function errorGetTenantsWithMissingTracings(
  detail: string
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorGetTenantsWithMissingTracings",
  });
}
