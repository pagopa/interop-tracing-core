/* eslint-disable max-classes-per-file */
import { P, match } from "ts-pattern";
import { z } from "zod";

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
  public correlationId?: string;
  public errors?: string[];

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
    errors?: string[];
  }) {
    super(detail);
    this.code = code;
    this.title = title;
    this.detail = detail;
    this.correlationId = correlationId;
    this.errors = errors;
  }
}

export function makeApiProblemBuilder<T extends string>(errors: {
  [K in T]: string;
}): (
  error: unknown,
  httpMapper: (apiError: ApiError<T | CommonErrorCodes>) => number,
) => Problem {
  const allErrors = { ...errorCodes, ...errors };
  return (error, httpMapper) => {
    const makeProblem = (
      httpStatus: number,
      {
        code,
        title,
        detail,
        correlationId,
        errors,
      }: ApiError<T | CommonErrorCodes>,
    ): Problem => ({
      type: "about:blank",
      title,
      status: httpStatus,
      detail,
      correlationId,
      errors: errors
        ? errors.map((detail) => ({
            code: allErrors[code],
            detail,
          }))
        : [
            {
              code: allErrors[code],
              detail,
            },
          ],
    });

    return match<unknown, Problem>(error)
      .with(P.instanceOf(ApiError<T | CommonErrorCodes>), (error) =>
        makeProblem(httpMapper(error), error),
      )
      .otherwise(() => makeProblem(500, genericError("Unexpected error")));
  };
}

const errorCodes = {
  genericError: "9991",
  validationFailed: "9992",
} as const;

export type CommonErrorCodes = keyof typeof errorCodes;

export function genericError(details: string): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: details,
    code: "genericError",
    title: "Unexpected error",
  });
}

export function validationFailed(errors: string[]): ApiError<CommonErrorCodes> {
  return new ApiError({
    detail: "Validation failed",
    errors: errors,
    code: "validationFailed",
    title: "Bad Request",
  });
}
