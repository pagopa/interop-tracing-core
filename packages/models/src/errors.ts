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

const makeProblemLogString = (
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
  genericError: "9991",
  validationFailed: "9992",
  invalidClaim: "9990",
  missingHeader: "9994",
  unauthorizedError: "9993",
  jwtDecodingError: "9001",
  existingTenant: "9002",
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

/* ===== API Error ===== */

export function genericError(details: string): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: details,
    code: "genericError",
    title: "Unexpected error",
  });
}

export function validationFailed(errors: Error[]): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: "Validation failed",
    errors: errors,
    code: "validationFailed",
    title: "Bad Request",
  });
}
export function existingTenantError(
  errors: Error[],
): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: "Tracing for this tenant already exist",
    errors: errors,
    code: "existingTenant",
    title: "Bad Request",
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
