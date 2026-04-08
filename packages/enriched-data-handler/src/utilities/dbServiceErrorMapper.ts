import {
  Problem,
  ApiError,
  CommonErrorCodes,
  genericInternalError,
} from "pagopa-interop-tracing-models";
import { match, P } from "ts-pattern";
import { DBService } from "../services/db/dbService.js";
import { TracingStoreDBService } from "../services/db/tracingStoreDbService.js";

export const dbServiceErrorMapper = (
  serviceName: keyof DBService | keyof TracingStoreDBService,
  error: unknown,
) =>
  match<unknown, Problem>(error)
    .with(P.instanceOf(ApiError<CommonErrorCodes>), (error) => {
      throw error;
    })
    .otherwise((error: unknown) => {
      throw genericInternalError(
        `Service: ${serviceName} - Database query failed. ${error}`,
      );
    });
