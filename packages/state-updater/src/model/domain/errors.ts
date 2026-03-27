import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  decodeSQSMessageError: "DECODE_SQS_MESSAGE_ERROR",
  errorProcessingCopyPurposeErrors: "ERROR_PROCESSING_COPY_PURPOSE_ERRORS",
  errorProcessingUpdateTracingState: "ERROR_PROCESSING_UPDATE_TRACING_STATE",
  decodeSQSMessageCorrelationIdError: "DECODE_SQS_MESSAGE_CORRELATION_ID_ERROR",
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

export function decodeSQSMessageCorrelationIdError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "decodeSQSMessageCorrelationIdError",
  });
}

export function errorProcessingCopyPurposeErrors(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorProcessingCopyPurposeErrors",
  });
}

export function errorProcessingUpdateTracingState(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorProcessingUpdateTracingState",
  });
}
