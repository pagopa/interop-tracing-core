import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorDeleteEservice: "ERROR_DELETE_ESERVICE",
  errorSaveEservice: "ERROR_SAVE_ESERVICE",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorDeleteEservice(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorDeleteEservice",
  });
}

export function errorSaveEservice(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorSaveEservice",
  });
}
