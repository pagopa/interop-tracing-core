import {
  AppContext,
  DB,
  WithSQSMessageId,
  initDB,
} from "pagopa-interop-tracing-commons";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  TracingStoreDbService,
  tracingStoreDbServiceBuilder,
} from "../src/services/tracingStoreDbService.js";
import { config } from "../src/utilities/config.js";
import { StartedTestContainer } from "testcontainers";
import { postgreSQLContainer } from "./config.js";
import {
  addTenant,
  addTracing,
  findPurposeErrors,
  findTracingById,
} from "./utils.js";
import {
  CorrelationId,
  TenantId,
  TracingId,
  generateId,
  tracingState,
  unsafeBrandId,
} from "pagopa-interop-tracing-models";
import { PurposeErrorCodes } from "pagopa-interop-tracing-commons";
import { DateUnit, truncatedTo } from "pagopa-interop-tracing-commons";

describe("Tracing store DB service test", () => {
  let dbInstance: DB;
  let startedPostgreSqlContainer: StartedTestContainer;
  let tracingStoreDbService: TracingStoreDbService;

  const tenantId: TenantId = generateId<TenantId>();
  const tracingId: TracingId = generateId<TracingId>();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTruncated = truncatedTo(yesterday, DateUnit.DAYS);

  const mockCtx: WithSQSMessageId<AppContext> = {
    serviceName: config.applicationName,
    messageId: "12345",
    correlationId: unsafeBrandId<CorrelationId>(generateId<CorrelationId>()),
  };

  afterAll(async () => {
    await startedPostgreSqlContainer.stop();
  });

  beforeAll(async () => {
    startedPostgreSqlContainer = await postgreSQLContainer(config).start();
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

    tracingStoreDbService = tracingStoreDbServiceBuilder(dbInstance);

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
  });

  describe("savePurposeError", () => {
    it("should create a new purpose error successfully", async () => {
      await expect(
        tracingStoreDbService.savePurposeError(
          {
            tracingId,
            version: 1,
            purposeId: generateId(),
            errorCode: PurposeErrorCodes.INVALID_ROW_SCHEMA,
            message: "INVALID_ROW_SCHEMA",
            rowNumber: 12,
            updateTracingState: false,
          },
          mockCtx,
        ),
      ).resolves.not.toThrow();

      const errors = await findPurposeErrors(dbInstance, tracingId);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should throw an error when attempting to create a new purpose error for related tracing_id not found", async () => {
      await expect(
        tracingStoreDbService.savePurposeError(
          {
            tracingId: generateId<TracingId>(),
            version: 1,
            purposeId: generateId(),
            errorCode: PurposeErrorCodes.INVALID_ROW_SCHEMA,
            message: "INVALID_ROW_SCHEMA",
            rowNumber: 12,
            updateTracingState: false,
          },
          mockCtx,
        ),
      ).rejects.toMatchObject({
        code: "errorProcessingSavePurposeError",
        message: expect.stringContaining("purposes_errors_tracing_id_fkey"),
      });
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
        tracingStoreDbService.updateTracingState(
          {
            tracingId: newTracingId,
            version: 1,
            state: tracingState.completed,
          },
          mockCtx,
        ),
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
        tracingStoreDbService.updateTracingState(
          {
            tracingId: generateId<TracingId>(),
            version: 1,
            state: tracingState.completed,
          },
          mockCtx,
        ),
      ).rejects.toMatchObject({
        code: "errorProcessingUpdateTracingState",
        message: expect.stringContaining("queryResultErrorCode.noData"),
      });
    });
  });
});
