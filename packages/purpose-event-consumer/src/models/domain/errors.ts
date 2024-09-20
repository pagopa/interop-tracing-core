import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorSavePurpose: "ERROR_SAVE_PURPOSE",
  noVersionsInValidState: "NO_VERSION_IN_VALID_STATE",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorSavePurpose(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorSavePurpose",
  });
}

export function kafkaInvalidVersion(): InternalError<ErrorCodes> {
  return new InternalError({
    code: "noVersionsInValidState",
    detail: `Missing valid version within versions Array`,
  });
}
