import { NextFunction, Request, Response } from "express";
import { genericLogger } from "pagopa-interop-tracing-commons";

export function uriErrorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof URIError) {
    genericLogger.warn(`Invalid URL encoding: ${req.originalUrl}`);
    res.status(400).send("Bad Request");
    return;
  }
  next(err);
}
