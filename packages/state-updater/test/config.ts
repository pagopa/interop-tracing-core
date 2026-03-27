import { GenericContainer } from "testcontainers";
import { resolve } from "path";
import { DbConfig } from "pagopa-interop-tracing-commons";
import { TracingStateUpdateConfig } from "../src/utilities/config.js";

export const TEST_POSTGRES_DB_PORT = 5432;
export const TEST_MINIO_PORT = 9000;
export const TEST_POSTGRES_DB_WITH_AWS_S3_IMAGE = "postgres:14";
export const TEST_MINIO_IMAGE =
  "quay.io/minio/minio:RELEASE.2024-02-06T21-36-22Z";

export const postgreSQLContainer = (config: DbConfig): GenericContainer =>
  new GenericContainer(TEST_POSTGRES_DB_WITH_AWS_S3_IMAGE)
    .withEnvironment({
      POSTGRES_DB: config.dbName,
      POSTGRES_USER: config.dbUsername,
      POSTGRES_PASSWORD: config.dbPassword,
    })
    .withCopyFilesToContainer([
      {
        source: resolve(
          __dirname,
          "../../../docker/tracing-store-db/init-db.sql",
        ),
        target: "/docker-entrypoint-initdb.d/01-init-schema.sql",
      },
      {
        source: resolve(
          __dirname,
          "../../../docker/tracing-store-db/init-db-seed.sql",
        ),
        target: "/docker-entrypoint-initdb.d/02-init-seed.sql",
      },
    ])
    .withExposedPorts(TEST_POSTGRES_DB_PORT);

export const minioContainer = (
  config: TracingStateUpdateConfig,
): GenericContainer =>
  new GenericContainer(TEST_MINIO_IMAGE)
    .withEnvironment({
      MINIO_ROOT_USER: "test-aws-key",
      MINIO_ROOT_PASSWORD: "test-aws-secret",
      MINIO_SITE_REGION: "eu-central-1",
    })
    .withEntrypoint(["sh", "-c"])
    .withCommand([
      `mkdir -p /data/${config.bucketTracingErrorsS3Name} &&
       /usr/bin/minio server /data`,
    ])
    .withExposedPorts(TEST_MINIO_PORT);
