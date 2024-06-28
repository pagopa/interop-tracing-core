import {
  CommonErrorCodes,
  InternalError,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { match } from "ts-pattern";
import { ErrorCodes as LocalErrorCodes } from "../model/domain/errors.js";

type ErrorCodes = LocalErrorCodes | CommonErrorCodes;

export const errorMapper = (error: unknown): InternalError<ErrorCodes> => {
  const applicationError = error as InternalError<LocalErrorCodes>;
  return match(applicationError.code)
    .with("decodeSQSMessageError", () => applicationError)
    .with("errorProcessingSavePurposeError", () => applicationError)
    .with("errorProcessingUpdateTracingState", () => applicationError)
    .otherwise(() => genericInternalError(`${error}`));
};
