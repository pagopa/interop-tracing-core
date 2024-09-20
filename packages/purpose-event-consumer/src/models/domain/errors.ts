import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorSavePurpose: "ERROR_SAVE_PURPOSE",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorSavePurpose(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorSavePurpose",
  });
}
