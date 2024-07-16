/* eslint-disable @typescript-eslint/explicit-function-return-type */
import winston from "winston";
import { LoggerConfig } from "../config/loggerConfig.js";

export type LoggerMetadata = {
  serviceName?: string;
  correlationId?: string;
  messageId?: string;
  purposeId?: string;
  tenantId?: string;
};

const parsedLoggerConfig = LoggerConfig.safeParse(process.env);
const config: LoggerConfig = parsedLoggerConfig.success
  ? parsedLoggerConfig.data
  : {
      logLevel: "info",
    };

if (!parsedLoggerConfig.success) {
  // eslint-disable-next-line no-console
  console.log(
    `No LOG_LEVEL env var: defaulting log level to "${config.logLevel}"`,
  );
}

const logFormat = (
  msg: string,
  timestamp: string,
  level: string,
  { serviceName, tenantId, correlationId }: LoggerMetadata,
) => {
  const serviceLogPart = serviceName ? `[${serviceName}]` : undefined;
  const tenantLogPart = tenantId ? `[TID=${tenantId}]` : undefined;
  const correlationLogPart = correlationId
    ? `[CID=${correlationId}]`
    : undefined;

  const firstPart = [timestamp, level.toUpperCase(), serviceLogPart]
    .filter((e) => e !== undefined)
    .join(" ");

  const secondPart = [tenantLogPart, correlationLogPart]
    .filter((e) => e !== undefined)
    .join(" ");

  return `${firstPart} - ${secondPart} ${msg}`.replace(/\s+/g, " ");
};

export const customFormat = () =>
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const lines = message
      .toString()
      .split("\n")
      .map((line: string) =>
        logFormat(line, timestamp, level, meta.loggerMetadata),
      );
    return lines.join("\n");
  });

const getLogger = () =>
  winston.createLogger({
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
      customFormat(),
    ),
    silent: process.env.NODE_ENV === "test",
  });

const internalLoggerInstance = getLogger();

export const logger = (loggerMetadata: LoggerMetadata) => ({
  isDebugEnabled: () => internalLoggerInstance.isDebugEnabled(),
  debug: (msg: (typeof internalLoggerInstance.debug.arguments)[0]) =>
    internalLoggerInstance.debug(msg, { loggerMetadata }),
  info: (msg: (typeof internalLoggerInstance.info.arguments)[0]) =>
    internalLoggerInstance.info(msg, { loggerMetadata }),
  warn: (msg: (typeof internalLoggerInstance.warn.arguments)[0]) =>
    internalLoggerInstance.warn(msg, { loggerMetadata }),
  error: (msg: (typeof internalLoggerInstance.error.arguments)[0]) =>
    internalLoggerInstance.error(msg, { loggerMetadata }),
});

export type Logger = ReturnType<typeof logger>;

export const genericLogger = logger({});
