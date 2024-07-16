import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  decodeSQSMessageError: "0601",
  readObjectBucketS3Error: "0602",
  insertEnrichedTraceError: "0603",
  insertTraceError: "0604",
  deleteTraceError: "0605",
  sendUpdateStateError: "0606",
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

export function sendUpdateStateError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "sendUpdateStateError",
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
