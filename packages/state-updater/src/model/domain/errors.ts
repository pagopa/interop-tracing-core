import { InternalError } from "pagopa-interop-tracing-models";

export const errorCodes = {
  decodeSQSMessageError: "0501",
  errorProcessingSavePurposeError: "0502",
  errorProcessingUpdateTracingState: "0503",
  decodeSQSMessageCorrelationIdError: "0504",
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

export function errorProcessingSavePurposeError(
  detail: string,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "errorProcessingSavePurposeError",
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
