import { DB, initDB } from "pagopa-interop-tracing-commons";
import { config } from "../src/utilities/config.js";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { dbServiceBuilder } from "../src/services/db/dbService.js";
import { resolve } from "path";
import {
  CommonErrorCodes,
  InternalError,
  PurposeId,
  TenantId,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
import { Wait } from "testcontainers";
import {
  addEservice,
  addPurpose,
  addTenant,
  addTracing,
  clearTestingData,
  clearTracings,
} from "./utils.js";
import { Tracing } from "../src/model/domain/db.js";
let dbInstance: DB;
describe("Operations Service", () => {
  let operationsService: OperationsService;
  const tenantIdId: TenantId = generateId();
  const purposeId: PurposeId = generateId();
  const eservice_id = generateId();
  const todayTruncated = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTruncated = yesterday.toISOString().split("T")[0];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    clearTestingData(dbInstance);
  });

  beforeAll(async () => {
    const postgreSqlContainer = await new PostgreSqlContainer("postgres:14")
      .withUsername(config.dbUsername)
      .withPassword(config.dbPassword)
      .withDatabase(config.dbName)
      .withExposedPorts(config.dbPort)
      .withReuse()
      .withCopyFilesToContainer([
        {
          source: resolve(__dirname, "init-db.sql"),
          target: "/docker-entrypoint-initdb.d/01-init.sql",
        },
      ])
      .withWaitStrategy(
        Wait.forLogMessage("database system is ready to accept connections"),
      )
      .start();

    const dbPort = postgreSqlContainer.getMappedPort(5432);
    console.log(`PostgreSQL is running on port ${dbPort}`);

    dbInstance = initDB({
      username: config.dbUsername,
      password: config.dbPassword,
      host: config.dbHost,
      port: config.dbPort,
      database: config.dbName,
      schema: config.schemaName,
      useSSL: config.dbUseSSL,
    });

    operationsService = operationsServiceBuilder(dbServiceBuilder(dbInstance));

    await addEservice({ eservice_id, producer_id: generateId() }, dbInstance);

    await addTenant(
      {
        id: tenantIdId,
        name: "pagoPa",
        origin: "external",
        externalId: generateId(),
        deleted: false,
      },
      dbInstance,
    );

    await addPurpose(
      {
        id: purposeId,
        consumer_id: tenantIdId,
        eservice_id,
        purpose_title: "purpose_for_tenant",
      },
      dbInstance,
    );
  });

  describe("getTenantByPurposeId", () => {
    it("retrieve tenant by purposeId", async () => {
      const result = await operationsService.getTenantByPurposeId(purposeId);

      expect(result).toBe(tenantIdId);
    });
    it("should give error when purposeId not a tenant", async () => {
      const wrongPurposeId: PurposeId = generateId();

      try {
        await operationsService.getTenantByPurposeId(wrongPurposeId);
      } catch (e) {
        const error = e as InternalError<CommonErrorCodes>;
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain(
          "Error getTenantByPurposeId: QueryResultError",
        );
        expect(error.code).toBe("genericError");
      }
    });
  });

  describe("submitTracing", () => {
    it("should insert a tracing with errors to be false", async () => {
      const tracing = {
        tenantId: tenantIdId as string,
        date: todayTruncated,
      };
      const result = await operationsService.submitTracing(tracing);
      await clearTracings(dbInstance);
      expect(result).toHaveProperty("tracingId");
      expect(result.tenantId).toBe(tenantIdId);
      expect(result.errors).toBe(false);
      expect(result.state).toBe("PENDING");
      expect(result.version).toBe(1);
    });
    it("should insert a tracing with errors to be true", async () => {
      const tracing = {
        tenantId: tenantIdId as string,
        date: todayTruncated,
      };
      const tracingMissing: Tracing = {
        id: generateId() as string,
        tenant_id: tenantIdId as string,
        state: tracingState.missing,
        date: yesterdayTruncated,
        version: 1,
        errors: true,
      };
      await addTracing(tracingMissing, dbInstance);
      const result = await operationsService.submitTracing(tracing);
      await clearTracings(dbInstance);
      expect(result).toHaveProperty("tracingId");
      expect(result.tenantId).toBe(tenantIdId);
      expect(result.errors).toBe(true);
      expect(result.state).toBe("PENDING");
      expect(result.version).toBe(1);
    });
    it("should update a tracing when state is missing", async () => {
      const tracingMissing: Tracing = {
        id: generateId() as string,
        tenant_id: tenantIdId as string,
        state: tracingState.missing,
        date: todayTruncated,
        version: 1,
        errors: true,
      };
      await addTracing(tracingMissing, dbInstance);
      const tracing = {
        tenantId: tenantIdId as string,
        date: todayTruncated,
      };
      const result = await operationsService.submitTracing(tracing);
      const expectedDate = new Date(tracing.date);
      expect(result).toHaveProperty("tracingId");
      expect(result.tenantId).toBe(tenantIdId);
      expect(result.errors).toBe(false);
      expect(result.state).toBe("PENDING");
      result.date && expect(new Date(result.date)).toEqual(expectedDate);
      expect(result.version).toBe(1);
      expect(1).toBe(1);
    });
    it("should give error if tenant submits a tracing for the same day when status is not error or missing", async () => {
      const existingTracing = {
        id: generateId() as string,
        tenant_id: tenantIdId as string,
        state: tracingState.completed,
        date: todayTruncated,
        version: 1,
        errors: false,
      };
      await addTracing(existingTracing, dbInstance);

      const tracing = {
        tenantId: tenantIdId as string,
        date: todayTruncated,
      };
      try {
        await operationsService.submitTracing(tracing);
      } catch (e) {
        const error = e as InternalError<CommonErrorCodes>;
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe("tracingAlreadyExists");
      }
    });
    it("should give error if there's an error during database operations", async () => {
      const mockDb = vi
        .spyOn(dbInstance, "one")
        .mockRejectedValueOnce(new Error("Database error"));
      const tracing = {
        tenantId: tenantIdId as string,
        date: todayTruncated,
      };
      await expect(operationsService.submitTracing(tracing)).rejects.toThrow();
      mockDb.mockRestore();
    });
  });
});
