import { Request, Response, NextFunction } from "express";
import {
  Problem,
  genericError,
  validationFailed,
} from "pagopa-interop-tracing-models";
import { logger } from "pagopa-interop-tracing-commons";
import { P, match } from "ts-pattern";
import { makeApiProblem } from "../model/domain/errors.js";
import { z } from "zod";

interface ZodValidationError {
  context: string;
  error: z.ZodIssue[];
}

const validationErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!error) return next();
  else {
    const problem = match<unknown, Problem>(error)
      .with(
        P.shape({ context: P.string, error: P.array(P.any) }),
        (e: ZodValidationError) => {
          const errors = e.error.map(
            (issue) => new Error(`${e.context}: ${JSON.stringify(issue)}`),
          );
          return makeApiProblem(validationFailed(errors), () => 400, logger);
        },
      )
      .otherwise((e) => {
        return makeApiProblem(genericError(`${e}`), () => 500, logger);
      });

    res.status(problem.status).json(problem).end();
  }
};

export default validationErrorHandler;
