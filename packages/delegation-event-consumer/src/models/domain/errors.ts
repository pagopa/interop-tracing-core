import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorSaveDelegation: "ERROR_SAVE_DELEGATION",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorSaveDelegation(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorSaveDelegation",
  });
}
