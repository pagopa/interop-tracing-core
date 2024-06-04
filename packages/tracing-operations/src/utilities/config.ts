import { HTTPServerConfig, LoggerConfig } from "pagopa-interop-tracing-commons";
import { DbConfig } from "./dbConfig.js";
import { z } from "zod";

const eServiceOperationsConfig = HTTPServerConfig.and(LoggerConfig)
  .and(DbConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
      })),
  );

export type EServiceOperationsConfig = z.infer<typeof eServiceOperationsConfig>;

export const config: EServiceOperationsConfig = {
  ...eServiceOperationsConfig.parse(process.env),
};
