import {
  AWSConfig,
  DbConfig,
  HTTPServerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingOperationsConfig = AWSConfig.and(HTTPServerConfig)
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

export type TracingOperationsConfig = z.infer<typeof tracingOperationsConfig>;

export const config: TracingOperationsConfig = {
  ...tracingOperationsConfig.parse(process.env),
};
