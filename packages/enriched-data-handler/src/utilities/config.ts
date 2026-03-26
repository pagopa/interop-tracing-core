import {
  AWSConfig,
  ConsumerConfig,
  DbConfig,
  FileManagerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const TracingStoreDbConfig = z
  .object({
    TRACING_STORE_DB_HOST: z.string(),
    TRACING_STORE_DB_NAME: z.string(),
    TRACING_STORE_DB_USERNAME: z.string(),
    TRACING_STORE_DB_PASSWORD: z.string(),
    TRACING_STORE_DB_PORT: z.coerce.number().min(1001),
    TRACING_STORE_DB_SCHEMA_NAME: z.string(),
    TRACING_STORE_DB_USE_SSL: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
    TRACING_STORE_DB_MAX_CONNECTION_POOL: z.coerce.number().default(10),
    TRACING_STORE_DB_CONNECTION_RETRIES: z.coerce.number().default(10),
    TRACING_STORE_DB_CONNECTION_MIN_TIMEOUT: z.coerce.number().default(5000),
    TRACING_STORE_DB_CONNECTION_MAX_TIMEOUT: z.coerce.number().default(10000),
    TRACING_STORE_DB_MESSAGES_TO_INSERT_PER_BATCH: z.coerce
      .number()
      .default(500),
  })
  .transform((c) => ({
    tracingStoreDbHost: c.TRACING_STORE_DB_HOST,
    tracingStoreDbName: c.TRACING_STORE_DB_NAME,
    tracingStoreDbUsername: c.TRACING_STORE_DB_USERNAME,
    tracingStoreDbPassword: c.TRACING_STORE_DB_PASSWORD,
    tracingStoreDbPort: c.TRACING_STORE_DB_PORT,
    tracingStoreDbSchemaName: c.TRACING_STORE_DB_SCHEMA_NAME,
    tracingStoreDbUseSSL: c.TRACING_STORE_DB_USE_SSL,
    tracingStoreDbMaxConnectionPool: c.TRACING_STORE_DB_MAX_CONNECTION_POOL,
    tracingStoreDbConnectionRetries: c.TRACING_STORE_DB_CONNECTION_RETRIES,
    tracingStoreDbConnectionMinTimeout:
      c.TRACING_STORE_DB_CONNECTION_MIN_TIMEOUT,
    tracingStoreDbConnectionMaxTimeout:
      c.TRACING_STORE_DB_CONNECTION_MAX_TIMEOUT,
    tracingStoreDbMessagesToInsertPerBatch:
      c.TRACING_STORE_DB_MESSAGES_TO_INSERT_PER_BATCH,
  }));

const tracingEnrichedDataHandlerConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(DbConfig)
  .and(TracingStoreDbConfig)
  .and(FileManagerConfig)
  .and(
    z
      .object({
        APPLICATION_NAME: z.string(),
        SQS_ENRICHED_UPLOAD_ENDPOINT: z.string(),
        SQS_ENDPOINT: z.string().nullish(),
        S3_ENRICHED_BUCKET_NAME: z.string(),
        MERGE_TABLE_SUFFIX: z
          .string()
          .transform((val) => val.replace(/-/g, "")),
      })
      .transform((c) => ({
        applicationName: c.APPLICATION_NAME,
        sqsEnrichedUploadEndpoint: c.SQS_ENRICHED_UPLOAD_ENDPOINT,
        sqsEndpoint: c.SQS_ENDPOINT,
        bucketEnrichedS3Name: c.S3_ENRICHED_BUCKET_NAME,
        mergeTableSuffix: c.MERGE_TABLE_SUFFIX,
      })),
  );

export type TracingEnrichedDataHandlerConfig = z.infer<
  typeof tracingEnrichedDataHandlerConfig
>;

export const config: TracingEnrichedDataHandlerConfig = {
  ...tracingEnrichedDataHandlerConfig.parse(process.env),
};
