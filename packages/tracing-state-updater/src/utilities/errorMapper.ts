import {
  CommonErrorCodes,
  InternalError,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { ErrorCodes } from "../model/domain/errors.js";

type LocalErrorCodes = ErrorCodes | CommonErrorCodes;

export const errorMapper = (error: unknown) =>
  match<unknown, InternalError<LocalErrorCodes>>(error)
    .with(P.instanceOf(InternalError<LocalErrorCodes>), (error) => {
      throw error;
    })
    .otherwise((error: unknown) => {
      throw genericInternalError(`${error}`);
    });
