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
        SQS_TRACING_UPLOAD_ENDPOINT: z.string(),
        SQS_PROCESSING_ERROR_ENDPOINT: z.string(),
      })
      .transform((c) => ({
        sqsEndpointConsumer: c.SQS_TRACING_UPLOAD_ENDPOINT,
        sqsEndpointProducer: c.SQS_PROCESSING_ERROR_ENDPOINT,
      })),
  );

export type TracingCallerConfig = z.infer<typeof tracingCallerConfig>;

export const config: TracingCallerConfig = {
  ...tracingCallerConfig.parse(process.env),
};
