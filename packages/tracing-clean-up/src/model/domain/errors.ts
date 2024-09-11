import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  errorDeletePurposesErrors: "0701",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function errorDeletePurposesErrors(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorDeletePurposesErrors",
  });
}
