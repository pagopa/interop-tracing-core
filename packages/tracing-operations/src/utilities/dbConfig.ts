import { z } from "zod";

export const DbConfig = z
  .object({
    DB_HOST: z.string(),
    DB_NAME: z.string(),
    DB_USERNAME: z.string(),
    DB_PASSWORD: z.string(),
    DB_PORT: z.coerce.number().min(1001),
    SCHEMA_NAME: z.string(),
    DB_USE_SSL: z.coerce.boolean(),
  })
  .transform((c) => ({
    dbHost: c.DB_HOST,
    dbName: c.DB_NAME,
    dbUsername: c.DB_USERNAME,
    dbPassword: c.DB_PASSWORD,
    dbPort: c.DB_PORT,
    schemaName: c.SCHEMA_NAME,
    dbUseSSL: c.DB_USE_SSL,
  }));

export type DbConfig = z.infer<typeof DbConfig>;

export const dbConfig: DbConfig = DbConfig.parse(process.env);
