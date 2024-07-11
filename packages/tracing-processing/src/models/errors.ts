import { InternalError } from "pagopa-interop-tracing-models";
export const errorCodes = {
  decodeSQSMessageError: "0601",
  sendMessagePurposeError: "0602",
  readObjectBucketS3Error: "0603",
  writeObjectBucketS3Error: "0604",
  getEnrichedPurposeError: "0605",
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
