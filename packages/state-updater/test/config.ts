import {
  CreateBucketCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { GenericContainer } from "testcontainers";
import { resolve } from "path";
import { TracingStoreDbConfig } from "pagopa-interop-tracing-commons";
import { TracingStateUpdateConfig } from "../src/utilities/config.js";

export const TEST_POSTGRES_DB_PORT = 5432;
export const TEST_RUSTFS_PORT = 9000;
export const TEST_POSTGRES_DB_IMAGE = "postgres:14";
export const TEST_RUSTFS_IMAGE = "rustfs/rustfs:1.0.0";

const TEST_RUSTFS_ACCESS_KEY = "test-aws-key";
const TEST_RUSTFS_SECRET_KEY = "test-aws-secret";
const TEST_RUSTFS_REGION = "eu-central-1";
const TEST_RUSTFS_BUCKET_CREATION_RETRIES = 15;
const TEST_RUSTFS_BUCKET_CREATION_RETRY_DELAY_MS = 1000;

export const postgreSQLContainer = (
  config: TracingStoreDbConfig,
): GenericContainer =>
  new GenericContainer(TEST_POSTGRES_DB_IMAGE)
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

export const rustfsContainer = (): GenericContainer =>
  new GenericContainer(TEST_RUSTFS_IMAGE)
    .withEnvironment({
      RUSTFS_ACCESS_KEY: TEST_RUSTFS_ACCESS_KEY,
      RUSTFS_SECRET_KEY: TEST_RUSTFS_SECRET_KEY,
      RUSTFS_REGION: TEST_RUSTFS_REGION,
      RUSTFS_VOLUMES: "/data",
    })
    .withExposedPorts(TEST_RUSTFS_PORT);

const isBucketAlreadyExistsError = (error: unknown): boolean =>
  error instanceof S3ServiceException &&
  (error.name === "BucketAlreadyOwnedByYou" ||
    error.name === "BucketAlreadyExists");

const createBucketWithRetry = async (
  client: S3Client,
  bucket: string,
  retriesLeft: number,
): Promise<void> => {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (isBucketAlreadyExistsError(error)) {
      return;
    }
    if (retriesLeft <= 0) {
      throw error;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, TEST_RUSTFS_BUCKET_CREATION_RETRY_DELAY_MS),
    );
    await createBucketWithRetry(client, bucket, retriesLeft - 1);
  }
};

export const createS3Buckets = async (
  config: TracingStateUpdateConfig,
  bucketNames: string[],
): Promise<void> => {
  const client = new S3Client({
    endpoint: config.s3CustomServer
      ? `${config.s3ServerHost}:${config.s3ServerPort}`
      : undefined,
    forcePathStyle: config.s3CustomServer,
    region: TEST_RUSTFS_REGION,
  });

  for (const bucket of bucketNames) {
    await createBucketWithRetry(
      client,
      bucket,
      TEST_RUSTFS_BUCKET_CREATION_RETRIES,
    );
  }
};
