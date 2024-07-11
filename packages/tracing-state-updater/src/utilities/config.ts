import {
  AWSConfig,
  ConsumerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const tracingStateUpdateronfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        API_OPERATIONS_BASEURL: z.string(),
        SQS_ENDPOINT_ENRICHER_STATE_QUEUE: z.string(),
        SQS_ENDPOINT_PROCESSING_ERROR_QUEUE: z.string(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        operationsBaseUrl: c.API_OPERATIONS_BASEURL,
        sqsEndpointEnricherStateQueue: c.SQS_ENDPOINT_ENRICHER_STATE_QUEUE,
        sqsEndpointProcessingErrorQueue: c.SQS_ENDPOINT_PROCESSING_ERROR_QUEUE,
      })),
  );

export type TracingStateUpdateConfig = z.infer<typeof tracingStateUpdateronfig>;

export const config: TracingStateUpdateConfig = {
  ...tracingStateUpdateronfig.parse(process.env),
};
