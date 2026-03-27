import {
  DB,
  FileManager,
  fileManagerBuilder,
  initDB,
} from "pagopa-interop-tracing-commons";
import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { dbServiceBuilder, DBService } from "../src/services/db/dbService.js";
import {
  tracingStoreServiceBuilder,
  TracingStoreService,
} from "../src/services/tracingStoreService.js";
import { config } from "../src/utilities/config.js";
import { Network, StartedNetwork, StartedTestContainer } from "testcontainers";
import {
  minioContainer,
  postgreSQLContainer,
  TEST_MINIO_PORT,
} from "./config.js";
import {
  addTenant,
  addTracing,
  findPurposeErrors,
  findTracingById,
  writePurposeErrorsCsv,
} from "./utils.js";
import {
  TenantId,
  TracingId,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
import { DateUnit, truncatedTo } from "pagopa-interop-tracing-commons";
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

describe("Tracing store DB service test", () => {
  let dbInstance: DB;
  let tracingStoreService: TracingStoreService;
  let startedPostgreSqlContainer: StartedTestContainer;
  let startedMinioContainer: StartedTestContainer;
  let startedNetwork: StartedNetwork;
  let s3Key: string;
  let fileManager: FileManager;

  let s3client: S3Client;

  const tenantId: TenantId = generateId<TenantId>();
  const tracingId: TracingId = generateId<TracingId>();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTruncated = truncatedTo(yesterday, DateUnit.DAYS);

  afterAll(async () => {
    await startedPostgreSqlContainer.stop();
    await startedMinioContainer.stop();
    await startedNetwork.stop();
  });

  afterEach(async () => {
    await dbInstance.none(`TRUNCATE ${config.dbSchemaName}.purposes_errors;`);
  });

  beforeAll(async () => {
    startedNetwork = await new Network().start();
    startedMinioContainer = await minioContainer(
      config,
      startedNetwork,
    ).start();

    // S3 client runs on host, so use the mapped port on localhost.
    const minioPort = startedMinioContainer.getMappedPort(TEST_MINIO_PORT);
    const s3ClientConfig: S3ClientConfig = {
      endpoint: `http://127.0.0.1:${minioPort}`,
      forcePathStyle: true,
      logger: config.logLevel === "debug" ? console : undefined,
      region: config.awsRegion,
    };
    s3client = new S3Client(s3ClientConfig);

    fileManager = fileManagerBuilder(
      s3client,
      config.bucketTracingErrorsS3Name,
    );

    startedPostgreSqlContainer = await postgreSQLContainer(
      config,
      startedNetwork,
    ).start();
    config.dbPort = startedPostgreSqlContainer.getMappedPort(5432);

    dbInstance = initDB({
      username: config.dbUsername,
      password: config.dbPassword,
      host: config.dbHost,
      port: config.dbPort,
      database: config.dbName,
      schema: config.dbSchemaName,
      useSSL: config.dbUseSSL,
    });

    const dbService: DBService = dbServiceBuilder(dbInstance);
    tracingStoreService = tracingStoreServiceBuilder(dbService, fileManager);
    s3Key = fileManager.buildS3Key(
      generateId(),
      "2024-01-01",
      tracingId,
      1,
      generateId(),
    );

    await addTenant(dbInstance, {
      id: tenantId,
      name: "tenant",
      origin: "origin",
      external_id: tenantId,
      deleted: false,
    });

    await addTracing(dbInstance, {
      id: tracingId,
      tenant_id: tenantId,
      state: tracingState.pending,
      date: new Date(),
      version: 1,
      errors: false,
    });
  }, 120000);

  describe("copyPurposeErrorsFromS3", () => {
    it("should copy CSV from S3 and insert purpose errors", async () => {
      const expectedErrors = 10_000;
      await writePurposeErrorsCsv(
        tracingId,
        fileManager,
        s3Key,
        expectedErrors,
      );

      await expect(
        tracingStoreService.copyPurposeErrorsFromS3(s3Key),
      ).resolves.not.toThrow();

      const errors = await findPurposeErrors(dbInstance, tracingId);
      expect(errors.length).toBe(expectedErrors);
    }, 30000);

    it("should read object with key from errorsCsvPath", async () => {
      await writePurposeErrorsCsv(tracingId, fileManager, s3Key);
      const readSpy = vi.spyOn(fileManager, "readObject");

      await expect(
        tracingStoreService.copyPurposeErrorsFromS3(s3Key),
      ).resolves.not.toThrow();

      expect(readSpy).toHaveBeenCalledWith(s3Key);
      readSpy.mockRestore();
    });

    it("should throw an error when copy fails", async () => {
      const failingStream = new Readable({
        read() {
          this.destroy(new Error("copy failed"));
        },
      });
      const readSpy = vi
        .spyOn(fileManager, "readObject")
        .mockResolvedValueOnce(failingStream);

      await expect(
        tracingStoreService.copyPurposeErrorsFromS3(s3Key),
      ).rejects.toMatchObject({
        code: "errorProcessingSavePurposeError",
        message: expect.stringContaining("Error copying purpose errors"),
      });

      readSpy.mockRestore();
    });
  });

  describe("updateTracingState", () => {
    it("should update a tracing by tracingId with new state 'COMPLETED' successfully", async () => {
      const newTracingId = generateId<TracingId>();
      await addTracing(dbInstance, {
        id: newTracingId,
        tenant_id: tenantId,
        state: tracingState.pending,
        date: yesterdayTruncated,
        version: 1,
        errors: false,
      });

      await expect(
        tracingStoreService.updateTracingState({
          tracingId: newTracingId,
          version: 1,
          state: tracingState.completed,
        }),
      ).resolves.not.toThrow();

      const result = await findTracingById(dbInstance, newTracingId);
      expect(result.id).toBe(newTracingId);
      expect(result.state).toBe(tracingState.completed);
    });

    it("should throw an error when attempting to update the state with a tracingId that is not found", async () => {
      const newTracingId = generateId<TracingId>();
      await addTracing(dbInstance, {
        id: newTracingId,
        tenant_id: tenantId,
        state: tracingState.pending,
        date: yesterdayTruncated,
        version: 1,
        errors: false,
      });

      await expect(
        tracingStoreService.updateTracingState({
          tracingId: generateId<TracingId>(),
          version: 1,
          state: tracingState.completed,
        }),
      ).rejects.toMatchObject({
        code: "errorProcessingUpdateTracingState",
        message: expect.stringContaining("queryResultErrorCode.noData"),
      });
    });
  });
});
