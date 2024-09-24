import {
  LoggerConfig,
  KafkaConsumerConfig,
  KafkaTopicConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const eServiceEventConsumerConfig = LoggerConfig.and(KafkaConsumerConfig)
  .and(KafkaTopicConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        API_OPERATIONS_BASEURL: z.string(),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        operationsBaseUrl: c.API_OPERATIONS_BASEURL,
      })),
  );

export type EserviceEventConsumerConfig = z.infer<
  typeof eServiceEventConsumerConfig
>;

export const config: EserviceEventConsumerConfig = {
  ...eServiceEventConsumerConfig.parse(process.env),
};
