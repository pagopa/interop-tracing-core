import {
  Problem,
  ApiError,
  CommonErrorCodes,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { match, P } from "ts-pattern";

export const dbServiceErrorMapper = (error: unknown) =>
  match<unknown, Problem>(error)
    .with(P.instanceOf(ApiError<CommonErrorCodes>), (error) => {
      throw error;
    })
    .otherwise((error: unknown) => {
      throw genericInternalError(`DB Service error: ${error}`);
    });
