import {
  CommonErrorCodes,
  InternalError,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { ErrorCodes } from "../model/domain/errors.js";
import { Logger } from "pagopa-interop-tracing-commons";

type LocalErrorCodes = ErrorCodes | CommonErrorCodes;

export const errorMapper = (error: unknown, logger: Logger) =>
  match<unknown, InternalError<LocalErrorCodes>>(error)
    .with(P.instanceOf(InternalError<LocalErrorCodes>), (error) => {
      logger.error(error);
      throw error;
    })
    .otherwise((error: unknown) => {
      logger.error(error);
      throw genericInternalError(`${error}`);
    });
