/* eslint-disable @typescript-eslint/no-explicit-any */
import * as express from "express";
import { ServiceContext } from "../context/context.js";
import { LoggerMetadata, logger } from "./index.js";
import { AuthData } from "../auth/index.js";

export function loggerMiddleware(serviceName: string): express.RequestHandler {
  return (req, res, next): void => {
    const context = (
      req as express.Request & {
        ctx?: ServiceContext<{
          authData: AuthData;
        }>;
      }
    ).ctx;

    const loggerMetadata: LoggerMetadata = {
      serviceName,
      correlationId: context?.correlationId,
      authData: { tenantId: context?.authData?.tenantId },
    };

    const loggerInstance = logger(loggerMetadata);

    res.on("finish", () => {
      loggerInstance.info(
        `Request ${req.method} ${req.url} - Response ${res.statusCode} ${res.statusMessage}`,
      );
    });

    next();
  };
}
