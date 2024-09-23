import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorDeletePurposesErrors: "ERROR_DELETE_PURPOSES_ERRORS",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorDeletePurposesErrors(
  detail: string
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorDeletePurposesErrors",
  });
}
