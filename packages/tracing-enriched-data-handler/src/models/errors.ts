import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  decodeSqsMessageError: "0601",
  readObjectBucketS3Error: "0602",
  insertEnrichedTraceError: "0603",
  insertTraceError: "0604",
  deleteTraceError: "0605",
  sendTracingUpdateStateMessageError: "0606",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function decodeSqsMessageError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "decodeSqsMessageError",
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

export function insertTraceError(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "insertTraceError",
  });
}

export function deleteTraceError(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "deleteTraceError",
  });
}
