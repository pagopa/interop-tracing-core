import {
  AWSConfig,
  ConsumerConfig,
  DbConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingProcessingConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(DbConfig)
  .and(
    z
      .object({
        SQS_TRACING_UPLOAD_ENDPOINT: z.string(),
        SQS_PROCESSING_ERROR_ENDPOINT: z.string(),
        S3_BUCKET_NAME: z.string(),
        S3_ENRICHED_BUCKET_NAME: z.string(),
        APPLICATION_NAME: z.string(),
      })
      .transform((c) => ({
        sqsTracingUploadEndpoint: c.SQS_TRACING_UPLOAD_ENDPOINT,
        sqsProcessingErrorEndpoint: c.SQS_PROCESSING_ERROR_ENDPOINT,
        bucketS3Name: c.S3_BUCKET_NAME,
        bucketEnrichedS3Name: c.S3_ENRICHED_BUCKET_NAME,
        applicationName: c.APPLICATION_NAME,
      })),
  );

export type TracingProcessingConfig = z.infer<typeof tracingProcessingConfig>;

export const config: TracingProcessingConfig = {
  ...tracingProcessingConfig.parse(process.env),
};
