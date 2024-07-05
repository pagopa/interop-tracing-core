import {
  AWSConfig,
  ConsumerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingCallerConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(
    z
      .object({
        SQS_ENRICHED_UPLOAD_ENDPOINT: z.string(),
        SQS_REPLACEMENT_UPLOAD_ENDPOINT: z.string(),
        SQS_ENRICHER_STATE_ENDPOINT: z.string(),
        S3_ENRICHED_BUCKET_NAME: z.string(),
      })
      .transform((c) => ({
        sqsEnrichedUploadEndpoint: c.SQS_ENRICHED_UPLOAD_ENDPOINT,
        sqsReplacementUploadEndpoint: c.SQS_REPLACEMENT_UPLOAD_ENDPOINT,
        sqsEnricherStateEndpoint: c.SQS_ENRICHER_STATE_ENDPOINT,
        bucketS3Enriched: c.S3_ENRICHED_BUCKET_NAME,
      })),
  );

export type TracingCallerConfig = z.infer<typeof tracingCallerConfig>;

export const config: TracingCallerConfig = {
  ...tracingCallerConfig.parse(process.env),
};
