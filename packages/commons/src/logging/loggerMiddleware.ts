import * as expressWinston from "express-winston";
import * as winston from "winston";
import { loggerConfig } from "../config/loggerConfig.js";
import { getContext } from "../index.js";

export type SessionMetaData = {
  correlationId: string | undefined;
};

const config = loggerConfig();

const getLoggerMetadata = (): SessionMetaData => {
  const appContext = getContext();
  return !appContext
    ? {
        correlationId: "",
      }
    : {
        correlationId: appContext.correlationId,
      };
};

export const customFormat = winston.format.printf(
  ({ level, message, timestamp }: winston.Logform.TransformableInfo) => {
    const { correlationId } = getLoggerMetadata();
    const lines = message
      .toString()
      .split("\n")
      .map(
        (line: string) =>
          `${timestamp} ${level.toUpperCase()} - [CID=${correlationId}] ${line}`,
      );
    return lines.join("\n");
  },
);

export const logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.errors({ stack: true }),
    customFormat,
  ),
  silent: process.env.NODE_ENV === "test",
});

export const loggerMiddleware = expressWinston.logger({
  winstonInstance: logger,
  requestWhitelist:
    config.logLevel === "debug" ? ["body", "headers", "query"] : [],
  ignoredRoutes: ["/status"],
  responseWhitelist:
    config.logLevel === "debug" ? ["body", "statusCode", "statusMessage"] : [],
});
