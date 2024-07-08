import {
  AWSConfig,
  ConsumerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingEnrichedConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(
    z
      .object({
        SQS_ENRICHED_UPLOAD_ENDPOINT: z.string(),
        SQS_REPLACEMENT_UPLOAD_ENDPOINT: z.string(),
        SQS_ENRICHER_STATE_ENDPOINT: z.string(),
      })
      .transform((c) => ({
        sqsEnrichedUploadEndpoint: c.SQS_ENRICHED_UPLOAD_ENDPOINT,
        sqsReplacementUploadEndpoint: c.SQS_REPLACEMENT_UPLOAD_ENDPOINT,
        sqsEnricherStateEndpoint: c.SQS_ENRICHER_STATE_ENDPOINT,
      })),
  );

export type TracingEnrichedConfig = z.infer<typeof tracingEnrichedConfig>;

export const config: TracingEnrichedConfig = {
  ...tracingEnrichedConfig.parse(process.env),
};
