import {
  AWSConfig,
  ConsumerConfig,
  DbConfig,
  FileManagerConfig,
  LoggerConfig,
  S3Config,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingProcessingConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(DbConfig)
  .and(S3Config)
  .and(FileManagerConfig)
  .and(
    z
      .object({
        SQS_TRACING_UPLOAD_ENDPOINT: z.string(),
        SQS_PROCESSING_ERROR_ENDPOINT: z.string(),
        APPLICATION_NAME: z.string(),
        SQS_ENDPOINT: z.string().nullish(),
        S3_ENRICHED_BUCKET_NAME: z.string(),
      })
      .transform((c) => ({
        sqsTracingUploadEndpoint: c.SQS_TRACING_UPLOAD_ENDPOINT,
        sqsProcessingErrorEndpoint: c.SQS_PROCESSING_ERROR_ENDPOINT,
        applicationName: c.APPLICATION_NAME,
        sqsEndpoint: c.SQS_ENDPOINT,
        bucketEnrichedS3Name: c.S3_ENRICHED_BUCKET_NAME,
      })),
  );

export type TracingProcessingConfig = z.infer<typeof tracingProcessingConfig>;

export const config: TracingProcessingConfig = {
  ...tracingProcessingConfig.parse(process.env),
};
