import {
  AWSConfig,
  ConsumerConfig,
  DbConfig,
  FileManagerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingEnrichedDataHandlerConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(DbConfig)
  .and(FileManagerConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        SQS_ENRICHED_UPLOAD_ENDPOINT: z.string(),
        SQS_ENDPOINT: z.string().nullish(),
        S3_ENRICHED_BUCKET_NAME: z.string(),
        MERGE_TABLE_SUFFIX: z
          .string()
          .transform((val) => val.replace(/-/g, "")),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        sqsEnrichedUploadEndpoint: c.SQS_ENRICHED_UPLOAD_ENDPOINT,
        sqsEndpoint: c.SQS_ENDPOINT,
        bucketEnrichedS3Name: c.S3_ENRICHED_BUCKET_NAME,
        mergeTableSuffix: c.MERGE_TABLE_SUFFIX,
      })),
  );

export type TracingEnrichedDataHandlerConfig = z.infer<
  typeof tracingEnrichedDataHandlerConfig
>;

export const config: TracingEnrichedDataHandlerConfig = {
  ...tracingEnrichedDataHandlerConfig.parse(process.env),
};
