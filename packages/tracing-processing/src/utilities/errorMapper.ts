import {
  CommonErrorCodes,
  InternalError,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { match } from "ts-pattern";
import { ErrorCodes } from "../models/errors.js";

type LocalErrorCodes = ErrorCodes | CommonErrorCodes;

export const errorMapper = (error: unknown): InternalError<LocalErrorCodes> => {
  const applicationError = error as InternalError<LocalErrorCodes>;
  return match(applicationError.code)
    .with("decodeSQSMessageError", () => applicationError)
    .with("sendMessagePurposeError", () => applicationError)
    .with("handlePurposesError", () => applicationError)
    .with("readObjectBucketS3Error", () => applicationError)
    .with("writeObjectBucketS3Error", () => applicationError)
    .with("getEnrichedPurposeError", () => applicationError)
    .otherwise(() => genericInternalError(`${error}`));
};
