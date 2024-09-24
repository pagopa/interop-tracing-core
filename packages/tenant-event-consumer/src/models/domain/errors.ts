import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorDeleteTenant: "ERROR_DELETE_TENANT",
  errorSaveTenant: "ERROR_SAVE_TENANT",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorDeleteTenant(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorDeleteTenant",
  });
}

export function errorSaveTenant(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorSaveTenant",
  });
}
