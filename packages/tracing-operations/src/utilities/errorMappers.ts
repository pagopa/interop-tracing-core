import {
  Problem,
  ApiError,
  CommonErrorCodes,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { match, P } from "ts-pattern";
import { T } from "vitest/dist/types-198fd1d9.js";

export const errorMapper = (error: unknown) =>
  match<unknown, Problem>(error)
    .with(P.instanceOf(ApiError<T | CommonErrorCodes>), (error) => {
      throw error;
    })
    .otherwise((error: unknown) => {
      throw genericInternalError(`Error createTracing: ${error}`);
    });
