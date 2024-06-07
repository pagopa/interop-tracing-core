import {
  InternalError,
  makeApiProblemBuilder,
  Problem,
} from "pagopa-interop-tracing-models";
import { AxiosError } from "axios";
import { genericLogger } from "pagopa-interop-tracing-commons";

export const errorCodes = {
  writeObjectS3BucketError: "0001",
};

export type ErrorCodes = keyof typeof errorCodes;

export const makeApiProblem = makeApiProblemBuilder(errorCodes);

export const resolveOperationsApiClientProblem = (error: unknown): Problem => {
  const operationsApiProblem = Problem.safeParse(
    (error as AxiosError).response?.data,
  );

  if (operationsApiProblem.success) {
    return operationsApiProblem.data;
  } else {
    return makeApiProblem(error, () => 500, genericLogger);
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
