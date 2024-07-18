import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  decodeSQSMessageError: "0601",
  readObjectBucketS3Error: "0602",
  insertEnrichedTraceError: "0603",
  insertTracesError: "0604",
  deleteTracesError: "0605",
  sendTracingUpdateStateMessageError: "0606",
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

export function sendTracingUpdateStateMessageError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "sendTracingUpdateStateMessageError",
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

export function insertTracesError(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "insertTracesError",
  });
}

export function deleteTracesError(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "deleteTracesError",
  });
}
