import { constants } from "http2";
import express, { NextFunction, Response } from "express";
import {
  badRequestError,
  makeApiProblemBuilder,
} from "pagopa-interop-tracing-models";
import { z } from "zod";
import { fromZodIssue } from "zod-validation-error";
import { WithZodiosContext } from "@zodios/express";
import { ExpressContext, logger } from "../index.js";

const makeApiProblem = makeApiProblemBuilder({});
interface ZodValidationError {
  context: string;
  error: z.ZodIssue[];
}

export function zodiosValidationErrorToApiProblem(
  zodError: ZodValidationError,
  req: WithZodiosContext<express.Request, ExpressContext>,
  res: Response,
  next: NextFunction,
): void {
  if (!zodError) return next();

  const detail = `Incorrect value for ${zodError.context}`;
  const errors = zodError.error.map((e) => fromZodIssue(e));

  res
    .status(constants.HTTP_STATUS_BAD_REQUEST)
    .json(
      makeApiProblem(
        badRequestError(detail, errors),
        () => constants.HTTP_STATUS_BAD_REQUEST,
        logger({ ...req.ctx }),
      ),
    )
    .send();
}
