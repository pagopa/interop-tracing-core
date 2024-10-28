import {
  InternalError,
  Problem,
  makeApiProblemBuilder,
  makeProblemLogString,
} from "pagopa-interop-tracing-models";
import { AppContext, logger } from "pagopa-interop-tracing-commons";
import { AxiosError } from "axios";
import { errorMapper } from "../../utilities/errorMapper.js";

export const errorCodes = {
  writeObjectS3BucketError: "WRITE_OBJECT_S3_BUCKET_ERROR",
  updateTracingStateError: "UPDATE_TRACING_STATE_ERROR",
  cancelTracingStateAndVersionError: "CANCEL_TRACING_STATE_AND_VERSION_ERROR",
};

export type ErrorCodes = keyof typeof errorCodes;

export const makeApiProblem = makeApiProblemBuilder(errorCodes);

export const resolveApiProblem = (error: unknown, ctx: AppContext): Problem => {
  const axiosApiProblem = Problem.safeParse(
    (error as AxiosError).response?.data,
  );

  if (axiosApiProblem.success) {
    logger(ctx).warn(makeProblemLogString(axiosApiProblem.data, error));
    return Object.assign(axiosApiProblem.data, {
      correlationId: ctx.correlationId,
    });
  } else {
    return Object.assign(makeApiProblem(error, errorMapper, logger(ctx)), {
      correlationId: ctx.correlationId,
    });
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

export function cancelTracingStateAndVersionError(
  detail: unknown,
): InternalError<ErrorCodes> {
  return new InternalError({
    detail: `${detail}`,
    code: "cancelTracingStateAndVersionError",
  });
}
