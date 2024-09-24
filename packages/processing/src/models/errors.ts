import { InternalError } from "pagopa-interop-tracing-models";
export const errorCodes = {
  decodeSQSEventMessageError: "DECODE_SQS_EVENT_MESSAGE_ERROR",
  sendMessagePurposeError: "SEND_MESSAFE",
  readObjectBucketS3Error: "READ_OBJECT_BUCKET_S3_ERROR",
  writeObjectBucketS3Error: "WRITE_OBJECT_BUCKET_S3_ERROR",
  getEnrichedPurposeError: "GET_ENRICHED_PURPOSE_ERROR",
  processTracingError: "PROCESS_TRACING_ERROR",
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

export function sendMessagePurposeError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "sendMessagePurposeError",
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

export function writeObjectBucketS3Error(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "writeObjectBucketS3Error",
  });
}

export function getEnrichedPurposeError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "getEnrichedPurposeError",
  });
}

export function processTracingError(detail: string): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "processTracingError",
  });
}
