import {
  InternalError,
  Problem,
  makeApiProblemBuilder,
  makeProblemLogString,
} from "pagopa-interop-tracing-models";
import { Logger } from "pagopa-interop-tracing-commons";
import { AxiosError } from "axios";
import { errorMapper } from "../../utilities/errorMapper.js";

export const errorCodes = {
  writeObjectS3BucketError: "0001",
  updateTracingStateError: "0002",
};

export type ErrorCodes = keyof typeof errorCodes;

export const makeApiProblem = makeApiProblemBuilder(errorCodes);

export const resolveApiProblem = (error: unknown, logger: Logger): Problem => {
  const operationsApiProblem = Problem.safeParse(
    (error as AxiosError).response?.data,
  );

  if (operationsApiProblem.success) {
    logger.warn(makeProblemLogString(operationsApiProblem.data, error));
    return operationsApiProblem.data;
  } else {
    return makeApiProblem(error, errorMapper, logger);
  }
};

export function writeObjectS3BucketError(
  detail: unknown,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "writeObjectS3BucketError",
  });
}

export function updateTracingStateError(
  detail: unknown,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "updateTracingStateError",
  });
}
