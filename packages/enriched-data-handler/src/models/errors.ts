import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  decodeSQSEventMessageError: "DECODE_SQS_EVENT_MESSAGE_ERROR",
  readObjectBucketS3Error: "READ_OBJECT_BUCKET_S3_ERROR",
  insertEnrichedTraceError: "INSERT_ENRICHED_TRACE_ERROR",
  insertTracesError: "INSERT_TRACES_ERROR",
  deleteTracesError: "DELETE_TRACES_ERROR",
  sendTracingUpdateStateMessageError: "SEND_TRACING_UPDATE_STATE_MESSAGE_ERROR",
} as const;

export type ErrorCodes = keyof typeof errorCodes;

export function decodeSQSEventMessageError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "decodeSQSEventMessageError",
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

export function sendTracingUpdateStateMessageError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "sendTracingUpdateStateMessageError",
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
