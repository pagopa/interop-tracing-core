import * as express from "express";
import { ServiceContext } from "../context/context.js";
import { LoggerMetadata, logger } from "./index.js";
import { AuthData } from "../auth/index.js";

const safeDecodeUrl = (url: string): string => {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
};

export function loggerMiddleware(serviceName: string): express.RequestHandler {
  return (req, res, next): void => {
    const decodedUrl = safeDecodeUrl(req.url);
    logger({ serviceName }).info(
      `Incoming Request: ${req.method} ${decodedUrl}`,
    );
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
      authData: {
        tenantId: context?.authData?.tenantId,
        organizationId: context?.authData?.organizationId,
      },
    };

    const loggerInstance = logger(loggerMetadata);

    res.on("finish", () => {
      loggerInstance.info(
        `Request ${req.method} ${decodedUrl} - Response ${res.statusCode} ${res.statusMessage}`,
      );
    });

    next();
  };
}
