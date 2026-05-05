import { z } from "zod";

export const TracingStoreDbConfig = z
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
    dbHost: c.TRACING_STORE_DB_HOST,
    dbName: c.TRACING_STORE_DB_NAME,
    dbUsername: c.TRACING_STORE_DB_USERNAME,
    dbPassword: c.TRACING_STORE_DB_PASSWORD,
    dbPort: c.TRACING_STORE_DB_PORT,
    dbSchemaName: c.TRACING_STORE_DB_SCHEMA_NAME,
    dbUseSSL: c.TRACING_STORE_DB_USE_SSL,
    dbMaxConnectionPool: c.TRACING_STORE_DB_MAX_CONNECTION_POOL,
    dbConnectionRetries: c.TRACING_STORE_DB_CONNECTION_RETRIES,
    dbConnectionMinTimeout: c.TRACING_STORE_DB_CONNECTION_MIN_TIMEOUT,
    dbConnectionMaxTimeout: c.TRACING_STORE_DB_CONNECTION_MAX_TIMEOUT,
    dbMessagesToInsertPerBatch: c.TRACING_STORE_DB_MESSAGES_TO_INSERT_PER_BATCH,
  }));

export type TracingStoreDbConfig = z.infer<typeof TracingStoreDbConfig>;
