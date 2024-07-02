import { ExpressContext } from "pagopa-interop-tracing-commons";
import { Request, Response, NextFunction } from "express";
import { ZodiosRouterContextRequestHandler } from "@zodios/express";

/**
 * Middleware to preprocess the 'state' query parameter.
 * Ensures the 'state' parameter is always handled as an array.
 *
 * The issue arises when a query parameter that Zodios expects to handle as an array
 * contains a single element. In such cases, it is treated as a string, leading to validation errors.
 * To address this, the middleware converts the parameter to an array to ensure correct validation preserving schema integrity.
 */
export const queryParamsMiddleware: ZodiosRouterContextRequestHandler<
  ExpressContext
> = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (req.query.states && typeof req.query.states === "string") {
    req.query.states = req.query.states.split(",");
  }
  next();
};
