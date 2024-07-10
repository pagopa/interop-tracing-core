import { constants } from "http2";
import { ApiError, CommonErrorCodes } from "pagopa-interop-tracing-models";
import { match } from "ts-pattern";
import { ErrorCodes as LocalErrorCodes } from "../model/domain/errors.js";

type ErrorCodes = LocalErrorCodes | CommonErrorCodes;

const {
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_NOT_FOUND,
} = constants;

export const errorMapper = (error: ApiError<ErrorCodes>): number =>
  match(error.code)
    .with("tracingAlreadyExists", () => HTTP_STATUS_BAD_REQUEST)
    .with("tracingNotFound", () => HTTP_STATUS_NOT_FOUND)
    .with("tracingCannotBeUpdated", () => HTTP_STATUS_BAD_REQUEST)
    .otherwise(() => HTTP_STATUS_INTERNAL_SERVER_ERROR);
