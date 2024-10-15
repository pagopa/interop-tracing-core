import {
  LoggerConfig,
  KafkaConsumerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const minioWebhookConfig = LoggerConfig.and(KafkaConsumerConfig).and(
  z
    .object({
      APPLICATION_NAME: z.string(),
      ELASTICMQ_URL: z.string(),
      PORT: z.string(),
      S3_BUCKET_NAME: z.string(),
      S3_ENRICHED_BUCKET_NAME: z.string(),
    })
    .transform((c) => ({
      applicationName: c.APPLICATION_NAME,
      elasticMQ: c.ELASTICMQ_URL,
      port: c.PORT,
      bucketS3Name: c.S3_BUCKET_NAME,
      bucketEnrichedS3Name: c.S3_ENRICHED_BUCKET_NAME,
    })),
);

export type MinioWebhookConfig = z.infer<typeof minioWebhookConfig>;

export const config: MinioWebhookConfig = {
  ...minioWebhookConfig.parse(process.env),
};
