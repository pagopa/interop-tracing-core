import {
  AWSConfig,
  ConsumerConfig,
  DbConfig,
  FileManagerConfig,
  LoggerConfig,
  S3Config,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingEnrichedDataHandlerConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(DbConfig)
  .and(S3Config)
  .and(FileManagerConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        SQS_ENRICHED_UPLOAD_ENDPOINT: z.string(),
        SQS_ENRICHER_STATE_ENDPOINT: z.string(),
        SQS_ENDPOINT: z.string().nullish(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        sqsEnrichedUploadEndpoint: c.SQS_ENRICHED_UPLOAD_ENDPOINT,
        sqsEnricherStateEndpoint: c.SQS_ENRICHER_STATE_ENDPOINT,
        sqsEndpoint: c.SQS_ENDPOINT,
      })),
  );

export type TracingEnrichedDataHandlerConfig = z.infer<
  typeof tracingEnrichedDataHandlerConfig
>;

export const config: TracingEnrichedDataHandlerConfig = {
  ...tracingEnrichedDataHandlerConfig.parse(process.env),
};
