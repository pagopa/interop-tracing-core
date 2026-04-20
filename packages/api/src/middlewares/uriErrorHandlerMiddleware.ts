import { NextFunction, Request, Response } from "express";
import { constants } from "http2";
import { genericLogger } from "pagopa-interop-tracing-commons";
import {
  badRequestError,
  generateId,
  makeApiProblemBuilder,
  CorrelationId,
} from "pagopa-interop-tracing-models";

const makeApiProblem = makeApiProblemBuilder({});

export function uriErrorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof URIError) {
    genericLogger.warn(`Invalid URL encoding: ${req.originalUrl}`);
    const problem = makeApiProblem(
      badRequestError(`Invalid URL encoding: ${req.originalUrl}`),
      () => constants.HTTP_STATUS_BAD_REQUEST,
      genericLogger,
      generateId<CorrelationId>(),
    );
    res.status(problem.status).json(problem).end();
    return;
  }
  next(err);
}
