import { DB, initDB, logger } from "pagopa-interop-tracing-commons";
import { config } from "../src/utilities/config.js";
import {
  afterAll,
  afterEach,
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
import {
  CommonErrorCodes,
  InternalError,
  PurposeId,
  TenantId,
  TracingId,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
import { StartedTestContainer } from "testcontainers";
import {
  addEservice,
  addPurpose,
  addTenant,
  addTracing,
  clearTracings,
} from "./utils.js";
import { Tracing } from "../src/model/domain/db.js";
import { postgreSQLContainer } from "./config.js";
import { ISODateFormat } from "../src/model/domain/dates.js";
import { ApiGetTracingsQuery } from "pagopa-interop-tracing-operations-client";

describe("database test", () => {
  let dbInstance: DB;
  let startedPostgreSqlContainer: StartedTestContainer;
  let operationsService: OperationsService;

  const tenantId: TenantId = generateId();
  const purposeId: PurposeId = generateId();
  const eservice_id = generateId();
  const todayTruncated = ISODateFormat.parse(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTruncated = ISODateFormat.parse(yesterday.toISOString());

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await clearTracings(dbInstance);
  });

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
      schema: config.schemaName,
      useSSL: config.dbUseSSL,
    });

    operationsService = operationsServiceBuilder(dbServiceBuilder(dbInstance));

    await addEservice({ eservice_id, producer_id: generateId() }, dbInstance);

    await addTenant(
      {
        id: tenantId,
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
        consumer_id: tenantId,
        eservice_id,
        purpose_title: "purpose_for_tenant",
      },
      dbInstance,
    );
  });

  describe("Operations service", () => {
    describe("getTenantByPurposeId", () => {
      it("retrieve tenant by purposeId", async () => {
        const result = await operationsService.getTenantByPurposeId(purposeId);

        expect(result).toBe(tenantId);
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
          tenantId: tenantId as string,
          date: todayTruncated,
        };
        const result = await operationsService.submitTracing(
          tracing,
          logger({}),
        );

        expect(result).toHaveProperty("tracingId");
        expect(result.tenantId).toBe(tenantId);
        expect(result.errors).toBe(false);
        expect(result.state).toBe("PENDING");
        expect(result.version).toBe(1);
      });

      it("should insert a tracing with errors to be true", async () => {
        const tracing = {
          tenantId: tenantId as string,
          date: todayTruncated,
        };
        const tracingMissing: Tracing = {
          id: generateId() as string,
          tenant_id: tenantId as string,
          state: tracingState.missing,
          date: yesterdayTruncated,
          version: 1,
          errors: true,
        };
        await addTracing(tracingMissing, dbInstance);
        const result = await operationsService.submitTracing(
          tracing,
          logger({}),
        );

        expect(result).toHaveProperty("tracingId");
        expect(result.tenantId).toBe(tenantId);
        expect(result.errors).toBe(true);
        expect(result.state).toBe("PENDING");
        expect(result.version).toBe(1);
      });

      it("should update a tracing when state is missing", async () => {
        const tracingMissing: Tracing = {
          id: generateId(),
          tenant_id: tenantId,
          state: tracingState.missing,
          date: todayTruncated,
          version: 1,
          errors: true,
        };

        await addTracing(tracingMissing, dbInstance);

        const tracing = {
          tenantId: tenantId,
          date: todayTruncated,
        };

        const result = await operationsService.submitTracing(
          tracing,
          logger({}),
        );

        expect(result).toHaveProperty("tracingId");
        expect(result.tenantId).toBe(tenantId);
        expect(result.errors).toBe(false);
        expect(result.state).toBe("PENDING");
        expect(new Date(result.date)).toEqual(new Date(tracing.date));
        expect(result.version).toBe(1);
      });

      it("should give error if tenant submits a tracing for the same day when status is not error or missing", async () => {
        const existingTracing = {
          id: generateId() as string,
          tenant_id: tenantId as string,
          state: tracingState.completed,
          date: todayTruncated,
          version: 1,
          errors: false,
        };

        await addTracing(existingTracing, dbInstance);

        const tracing = {
          tenantId: tenantId as string,
          date: todayTruncated,
        };

        try {
          await operationsService.submitTracing(tracing, logger({}));
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
          tenantId: tenantId as string,
          date: todayTruncated,
        };

        await expect(
          operationsService.submitTracing(tracing, logger({})),
        ).rejects.toThrow();

        mockDb.mockRestore();
      });
    });

    describe("getTracings", () => {
      it("searching with 'states' parameter 'ERROR' should return an empty list of tracings", async () => {
        const filters: ApiGetTracingsQuery = {
          states: [tracingState.error],
          offset: 0,
          limit: 10,
        };

        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        await addTracing(tracingData, dbInstance);

        const result = await operationsService.getTracings(filters, logger({}));

        expect(result.results).toStrictEqual([]);
        expect(result.totalCount).toBe(0);
      });

      it("searching with 'states' parameter 'ERROR' should return only 1 record with 'ERROR' state", async () => {
        const filters: ApiGetTracingsQuery = {
          states: [tracingState.error],
          offset: 0,
          limit: 10,
        };

        const tracingErrorData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.error,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracingPendingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        await addTracing(tracingErrorData, dbInstance);
        await addTracing(tracingPendingData, dbInstance);

        const result = await operationsService.getTracings(filters, logger({}));

        expect(result.totalCount).toBe(1);
        expect(result.results.length).toBe(1);
        expect(result.results[0].state).toBe(tracingState.error);
      });

      it("searching with 'states' parameter 'ERROR' & 'MISSING' should return 2 records with both states", async () => {
        const filters: ApiGetTracingsQuery = {
          states: [tracingState.error, tracingState.missing],
          offset: 0,
          limit: 10,
        };

        const tracingErrorData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.error,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracingMissingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.missing,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        await addTracing(tracingErrorData, dbInstance);
        await addTracing(tracingMissingData, dbInstance);

        const result = await operationsService.getTracings(filters, logger({}));

        expect(result.totalCount).toBe(2);
        expect(result.results.length).toBe(2);
        const hasErrorState = result.results.some(
          (tracing) => tracing.state === tracingState.error,
        );
        const hasMissingState = result.results.some(
          (tracing) => tracing.state === tracingState.missing,
        );
        expect(hasErrorState).toBe(true);
        expect(hasMissingState).toBe(true);
      });

      it("searching without 'states' parameter should return 3 records", async () => {
        const filters: ApiGetTracingsQuery = {
          offset: 0,
          limit: 10,
        };

        const tracingErrorData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.error,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracingMissingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.missing,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracingPendingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        await addTracing(tracingErrorData, dbInstance);
        await addTracing(tracingMissingData, dbInstance);
        await addTracing(tracingPendingData, dbInstance);

        const result = await operationsService.getTracings(filters, logger({}));

        expect(result.totalCount).toBe(3);
        expect(result.results.length).toBe(3);
      });

      it("searching with 'limit' parameter value to 1, should return 1 records with totalCount 2", async () => {
        const filters = {
          offset: 0,
          limit: 1,
        };

        const tracingErrorData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.error,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracingMissingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.missing,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        await addTracing(tracingErrorData, dbInstance);
        await addTracing(tracingMissingData, dbInstance);

        const result = await operationsService.getTracings(filters, logger({}));

        expect(result.totalCount).toBe(2);
        expect(result.results.length).toBe(1);
      });
    });
  });
});
