import {
  AWSConfig,
  ConsumerConfig,
  FileManagerConfig,
  LoggerConfig,
} from "pagopa-interop-tracing-commons";
import { z } from "zod";

const TracesStoreDbConfig = z
  .object({
    TRACES_STORE_DB_HOST: z.string(),
    TRACES_STORE_DB_NAME: z.string(),
    TRACES_STORE_DB_USERNAME: z.string(),
    TRACES_STORE_DB_PASSWORD: z.string(),
    TRACES_STORE_DB_PORT: z.coerce.number().min(1001),
    TRACES_STORE_DB_SCHEMA_NAME: z.string(),
    TRACES_STORE_DB_USE_SSL: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
    TRACES_STORE_DB_MAX_CONNECTION_POOL: z.coerce.number().default(10),
    TRACES_STORE_DB_CONNECTION_RETRIES: z.coerce.number().default(10),
    TRACES_STORE_DB_CONNECTION_MIN_TIMEOUT: z.coerce.number().default(5000),
    TRACES_STORE_DB_CONNECTION_MAX_TIMEOUT: z.coerce.number().default(10000),
  })
  .transform((c) => ({
    tracesStoreDbHost: c.TRACES_STORE_DB_HOST,
    tracesStoreDbName: c.TRACES_STORE_DB_NAME,
    tracesStoreDbUsername: c.TRACES_STORE_DB_USERNAME,
    tracesStoreDbPassword: c.TRACES_STORE_DB_PASSWORD,
    tracesStoreDbPort: c.TRACES_STORE_DB_PORT,
    tracesStoreDbSchemaName: c.TRACES_STORE_DB_SCHEMA_NAME,
    tracesStoreDbUseSSL: c.TRACES_STORE_DB_USE_SSL,
    tracesStoreDbMaxConnectionPool: c.TRACES_STORE_DB_MAX_CONNECTION_POOL,
    tracesStoreDbConnectionRetries: c.TRACES_STORE_DB_CONNECTION_RETRIES,
    tracesStoreDbConnectionMinTimeout: c.TRACES_STORE_DB_CONNECTION_MIN_TIMEOUT,
    tracesStoreDbConnectionMaxTimeout: c.TRACES_STORE_DB_CONNECTION_MAX_TIMEOUT,
  }));

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
  })
  .transform((c) => ({
    tracingStoreDbHost: c.TRACING_STORE_DB_HOST,
    tracingStoreDbName: c.TRACING_STORE_DB_NAME,
    tracingStoreDbUsername: c.TRACING_STORE_DB_USERNAME,
    tracingStoreDbPassword: c.TRACING_STORE_DB_PASSWORD,
    tracingStoreDbPort: c.TRACING_STORE_DB_PORT,
    tracingStoreDbSchemaName: c.TRACING_STORE_DB_SCHEMA_NAME,
    tracingStoreDbUseSSL: c.TRACING_STORE_DB_USE_SSL,
  }));

const tracingEnrichedDataHandlerConfig = AWSConfig.and(ConsumerConfig)
  .and(LoggerConfig)
  .and(TracesStoreDbConfig)
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
