import { InternalError } from "pagopa-interop-tracing-models";
export const errorCodes = {
  decodeSQSMessageError: "0601",
  readObjectBucketS3Error: "0602",
  insertEnrichedTraceError: "0603",
  insertTracingError: "0604",
  deleteTracingError: "0605",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function decodeSQSMessageError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "decodeSQSMessageError",
  });
}

export function readObjectBucketS3Error(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "readObjectBucketS3Error",
  });
}

export function insertEnrichedTraceError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "insertEnrichedTraceError",
  });
}
export function insertTracingError(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "insertTracingError",
  });
}
export function deleteTracingError(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "deleteTracingError",
  });
}
