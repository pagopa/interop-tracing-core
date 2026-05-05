import {
  DB,
  DateUnit,
  FileManager,
  fileManagerBuilder,
  initDB,
  truncatedTo,
} from "pagopa-interop-tracing-commons";
import { config } from "../src/utilities/config.js";
import {
  errorsCsvMapping,
  generateId,
  PurposeErrorSeverity,
  tracingState,
} from "pagopa-interop-tracing-models";
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { StartedTestContainer } from "testcontainers";
import {
  minioContainer,
  postgreSQLContainer,
  TEST_MINIO_PORT,
} from "./config.js";
import { dbServiceBuilder, DBService } from "../src/services/db/dbService.js";
import {
  tracingStoreServiceBuilder,
  TracingStoreService,
} from "../src/services/tracingStoreService.js";

export const startedMinioContainer: StartedTestContainer =
  await minioContainer(config).start();
export const minioPort = startedMinioContainer.getMappedPort(TEST_MINIO_PORT);

export const s3ClientConfig: S3ClientConfig = {
  endpoint: `${config.s3ServerHost}:${minioPort}`,
  forcePathStyle: true,
  logger: config.logLevel === "debug" ? console : undefined,
  region: config.awsRegion,
};
export const s3client = new S3Client(s3ClientConfig);
export const fileManager: FileManager = fileManagerBuilder(
  s3client,
  config.bucketTracingErrorsS3Name,
);

export const startedPostgreSqlContainer: StartedTestContainer =
  await postgreSQLContainer(config).start();
config.dbPort = startedPostgreSqlContainer.getMappedPort(5432);

export const dbInstance: DB = initDB({
  username: config.dbUsername,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  schema: config.dbSchemaName,
  useSSL: config.dbUseSSL,
});

export const dbService: DBService = dbServiceBuilder(dbInstance);
export const tracingStoreService: TracingStoreService =
  tracingStoreServiceBuilder(dbInstance, dbService, fileManager);

export const writePurposeErrorsCsv = async (
  tracingId: string,
  fileManager: {
    writeObject: (
      input: Buffer,
      contentType: string,
      bucketS3Key: string,
      bucketEnrichedS3Name?: string,
    ) => Promise<void>;
  },
  s3Key: string,
  errorCount = 1,
): Promise<void> => {
  const csvHeader = Object.keys(errorsCsvMapping).join(",");
  const rows = Array.from({ length: errorCount }, (_, i) =>
    [
      generateId(),
      tracingId,
      1,
      generateId(),
      "INVALID",
      "INVALID_ROW_SCHEMA",
      "INVALID_ROW_SCHEMA",
      12 + i,
    ].join(","),
  );
  const csvBody = [csvHeader, ...rows].join("\n");

  await fileManager.writeObject(Buffer.from(csvBody), "text/csv", s3Key);
};

export const writePurposeErrorsCsvWithSeverities = async (
  tracingId: string,
  fileManager: {
    writeObject: (
      input: Buffer,
      contentType: string,
      bucketS3Key: string,
      bucketEnrichedS3Name?: string,
    ) => Promise<void>;
  },
  s3Key: string,
  severities: PurposeErrorSeverity[],
): Promise<void> => {
  const csvHeader = Object.keys(errorsCsvMapping).join(",");
  const rows = severities.map((severity, i) =>
    [
      generateId(),
      tracingId,
      1,
      generateId(),
      severity,
      "INVALID_ROW_SCHEMA",
      "INVALID_ROW_SCHEMA",
      12 + i,
    ].join(","),
  );
  const csvBody = [csvHeader, ...rows].join("\n");

  await fileManager.writeObject(Buffer.from(csvBody), "text/csv", s3Key);
};

export async function addTenant(
  db: DB,
  data: {
    id: string;
    name: string;
    origin: string;
    external_id: string;
    deleted: boolean;
  },
): Promise<void> {
  const insertTenantQuery = `
      INSERT INTO ${config.dbSchemaName}.tenants (id, name, origin, external_id, deleted)
      VALUES ($1, $2, $3, $4, $5)
    `;

  await db.none(insertTenantQuery, [
    data.id,
    data.name,
    data.origin,
    data.external_id,
    data.deleted,
  ]);
}

export async function addTracing(
  db: DB,
  data: {
    id: string;
    tenant_id: string;
    state: (typeof tracingState)[keyof typeof tracingState];
    date: Date;
    version: number;
    errors: boolean;
  },
): Promise<void> {
  const truncatedDate: Date = truncatedTo(new Date(data.date), DateUnit.DAYS);
  const insertTracingQuery = `
      INSERT INTO ${config.dbSchemaName}.tracings (id, tenant_id, state, date, version, errors)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

  await db.none(insertTracingQuery, [
    data.id,
    data.tenant_id,
    data.state,
    truncatedDate,
    data.version,
    data.errors,
  ]);
}

export async function findTracingState(
  db: DB,
  tracingId: string,
): Promise<string> {
  const selectTracingQuery = `
      SELECT state
      FROM ${config.dbSchemaName}.tracings
      WHERE id = $1
    `;

  const result = await db.one<{ state: string }>(selectTracingQuery, [
    tracingId,
  ]);

  return result.state;
}

export async function findTracingById(
  db: DB,
  tracingId: string,
): Promise<{ id: string; state: string }> {
  const selectTracingQuery = `
      SELECT id, state
      FROM ${config.dbSchemaName}.tracings
      WHERE id = $1
    `;

  return await db.one<{ id: string; state: string }>(selectTracingQuery, [
    tracingId,
  ]);
}

export async function findPurposeErrors(
  db: DB,
  tracingId: string,
): Promise<unknown[]> {
  const selectPurposeErrorQuery = `
      SELECT *
      FROM ${config.dbSchemaName}.purposes_errors
      WHERE tracing_id = $1
    `;

  return await db.any(selectPurposeErrorQuery, [tracingId]);
}

export async function truncatePurposeErrors(db: DB): Promise<void> {
  await db.none(`TRUNCATE ${config.dbSchemaName}.purposes_errors;`);
}
