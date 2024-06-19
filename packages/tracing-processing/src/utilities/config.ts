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
        SQS_ENDPOINT_CONSUMER: z.string(),
        SQS_ENDPOINT_PRODUCER: z.string(),
      })
      .transform((c) => ({
        sqsEndpointConsumer: c.SQS_ENDPOINT_CONSUMER,
        sqsEndpointProducer: c.SQS_ENDPOINT_PRODUCER,
      })),
  );

export type TracingCallerConfig = z.infer<typeof tracingCallerConfig>;

export const config: TracingCallerConfig = {
  ...tracingCallerConfig.parse(process.env),
};
