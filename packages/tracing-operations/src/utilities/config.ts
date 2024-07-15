import {
  AWSConfig,
  HTTPServerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { DbConfig } from "./dbConfig.js";
import { z } from "zod";

const eServiceOperationsConfig = AWSConfig.and(HTTPServerConfig)
  .and(LoggerConfig)
  .and(DbConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        S3_REPLACEMENT_BUCKET_NAME: z.string(),
        S3_BUCKET_NAME: z.string(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        bucketS3Name: c.S3_BUCKET_NAME,
        bucketReplacementS3Name: c.S3_REPLACEMENT_BUCKET_NAME,
      })),
  );

export type EServiceOperationsConfig = z.infer<typeof eServiceOperationsConfig>;

export const config: EServiceOperationsConfig = {
  ...eServiceOperationsConfig.parse(process.env),
};
