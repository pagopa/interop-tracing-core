/* eslint-disable max-classes-per-file */
import { P, match } from "ts-pattern";
import { ZodError, z } from "zod";

export const ProblemError = z.object({
  code: z.string(),
  detail: z.string(),
});

export const Problem = z.object({
  type: z.string(),
  status: z.number(),
  title: z.string(),
  correlationId: z.string().optional(),
  detail: z.string(),
  errors: z.array(ProblemError),
});

export type Problem = z.infer<typeof Problem>;
export class ApiError<T> extends Error {
  public code: T;
  public title: string;
  public detail: string;
  public errors: Array<{ code: T; detail: string }>;
  public correlationId?: string;

  constructor({
    code,
    title,
    detail,
    correlationId,
    errors,
  }: {
    code: T;
    title: string;
    detail: string;
    correlationId?: string;
    errors?: Error[];
  }) {
    super(detail);
    this.code = code;
    this.title = title;
    this.detail = detail;
    this.correlationId = correlationId;
    this.errors =
      errors && errors.length > 0
        ? errors.map((e) => ({ code, detail: e.message }))
        : [{ code, detail }];
  }
}

export class InternalError<T> extends Error {
  public code: T;
  public detail: string;

  constructor({ code, detail }: { code: T; detail: string }) {
    super(detail);
    this.code = code;
    this.detail = detail;
  }
}

export type MakeApiProblemFn<T extends string> = (
  error: unknown,
  httpMapper: (apiError: ApiError<T | CommonErrorCodes>) => number,
  logger: { error: (message: string) => void; warn: (message: string) => void },
) => Problem;

export const makeProblemLogString = (
  problem: Problem,
  originalError: unknown,
): string => {
  const errorsString = problem.errors.map((e) => e.detail).join(" - ");
  return `- title: ${problem.title} - detail: ${problem.detail} - errors: ${errorsString} - original error: ${originalError}`;
};

export function makeApiProblemBuilder<T extends string>(errors: {
  [K in T]: string;
}): MakeApiProblemFn<T> {
  const allErrors = { ...errorCodes, ...errors };
  return (error, httpMapper, logger) => {
    const makeProblem = (
      httpStatus: number,
      { title, detail, correlationId, errors }: ApiError<T | CommonErrorCodes>,
    ): Problem => ({
      type: "about:blank",
      title,
      status: httpStatus,
      detail,
      correlationId,
      errors: errors.map(({ code, detail }) => ({
        code: allErrors[code],
        detail,
      })),
    });

    return match<unknown, Problem>(error)
      .with(P.instanceOf(ApiError<T | CommonErrorCodes>), (error) => {
        const problem = makeProblem(httpMapper(error), error);
        logger.warn(makeProblemLogString(problem, error));
        return problem;
      })
      .otherwise((error: unknown) => {
        const problem = makeProblem(500, genericError("Unexpected error"));
        logger.error(makeProblemLogString(problem, error));
        return problem;
      });
  };
}

const errorCodes = {
  genericError: "GENERIC_ERROR",
  badRequestError: "BAD_REQUEST_ERROR",
  invalidClaim: "INVALID_CLAIM",
  missingHeader: "MISSING_HEADER",
  unauthorizedError: "UNAUTHORIZED_ERROR",
  jwtDecodingError: "JWT_DECODING_ERROR",
  tracingAlreadyExists: "TRACING_ALREADY_EXISTS",
  tracingNotFound: "TRACING_NOT_FOUND",
  tracingCannotBeUpdated: "TRACING_CANNOT_BE_UPDATED",
  kafkaMessageProcessError: "KAFKA_MESSAGE_PROCESS_ERROR",
} as const;

export type CommonErrorCodes = keyof typeof errorCodes;

export function parseErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return `${JSON.stringify(error)}`;
}

/* ===== Internal Error ===== */

export function genericInternalError(
  details: string,
): InternalError<CommonErrorCodes> {
  return new InternalError({
    code: "genericError",
    detail: details,
  });
}

export function kafkaMessageProcessError(
  topic: string,
  partition: number,
  offset: string,
  error?: unknown,
): InternalError<CommonErrorCodes> {
  return new InternalError({
    code: "kafkaMessageProcessError",
    detail: `Error while handling kafka message from topic : ${topic} - partition ${partition} - offset ${offset}. ${
      error ? parseErrorMessage(error) : ""
    }`,
  });
}

/* ===== API Error ===== */

export function genericError(details: string): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: details,
    code: "genericError",
    title: "Unexpected error",
  });
}

export function badRequestError(
  detail: string,
  errors?: Error[],
): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail,
    code: "badRequestError",
    title: "Bad request",
    errors,
  });
}

export function invalidClaim(error: unknown): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: `Claim not valid or missing: ${parseErrorMessage(error)}`,
    code: "invalidClaim",
    title: "Claim not valid or missing",
  });
}

export function jwtDecodingError(error: unknown): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: `Unexpected error on JWT decoding: ${parseErrorMessage(error)}`,
    code: "jwtDecodingError",
    title: "JWT decoding error",
  });
}

export const missingBearer: ApiError<CommonErrorCodes> = new ApiError({
  detail: `Authorization Illegal header key.`,
  code: "missingHeader",
  title: "Bearer token has not been passed",
});

export function missingHeader(headerName?: string): ApiError<CommonErrorCodes> {
  const title = "Header has not been passed";
  return new ApiError({
    detail: headerName
      ? `Header ${headerName} not existing in this request`
      : title,
    code: "missingHeader",
    title,
  });
}

export function unauthorizedError(details: string): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: details,
    code: "unauthorizedError",
    title: "Unauthorized",
  });
}

export function tracingAlreadyExists(
  details: string,
): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: details,
    code: "tracingAlreadyExists",
    title: "Bad Request",
  });
}

export function tracingNotFound(tracingId: string): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: `Tracing by ${tracingId} not found.`,
    code: "tracingNotFound",
    title: "Tracing not found",
  });
}

export function tracingRecoverCannotBeUpdated(
  tracingId: string,
): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: `Tracing with Id ${tracingId} cannot be updated. The state of tracing must be either ERROR or MISSING.`,
    code: "tracingCannotBeUpdated",
    title: "Tracing cannot be updated",
  });
}

export function tracingReplaceCannotBeUpdated(
  tracingId: string,
): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: `Tracing with Id ${tracingId} cannot be updated. The state of tracing must be COMPLETED.`,
    code: "tracingCannotBeUpdated",
    title: "Tracing cannot be updated",
  });
}
