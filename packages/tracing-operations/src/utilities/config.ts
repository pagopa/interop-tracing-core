import { HTTPServerConfig, LoggerConfig } from "pagopa-interop-tracing-commons";
import { DbConfig } from "./dbConfig.js";
import { z } from "zod";

const eServiceOperationsConfig = HTTPServerConfig.and(LoggerConfig)
  .and(DbConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        SCHEMA_NAME: z.string(),
        TRACING_DB_USE_SSL: z.coerce.boolean(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        schemaName: c.SCHEMA_NAME,
        tracingDbUseSSL: c.TRACING_DB_USE_SSL,
      })),
  );

export type EServiceOperationsConfig = z.infer<typeof eServiceOperationsConfig>;

export const config: EServiceOperationsConfig = {
  ...eServiceOperationsConfig.parse(process.env),
};
