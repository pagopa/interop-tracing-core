import {
  DB,
  ISODateFormat,
  PurposeErrorCodes,
  genericLogger,
  initDB,
} from "pagopa-interop-tracing-commons";
import { config } from "../src/utilities/config.js";
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
import { DBService, dbServiceBuilder } from "../src/services/db/dbService.js";
import {
  CommonErrorCodes,
  InternalError,
  PurposeErrorId,
  PurposeId,
  TenantId,
  TracingId,
  generateId,
  tracingRecoverCannotBeUpdated,
  tracingNotFound,
  tracingState,
  tracingReplaceCannotBeUpdated,
  EserviceId,
} from "pagopa-interop-tracing-models";
import { StartedTestContainer } from "testcontainers";
import {
  addEservice,
  addPurpose,
  addPurposeError,
  addTenant,
  addTracing,
  clearPurposesErrors,
  clearTracings,
  findPurposeErrors,
  findTracingById,
  findEserviceById,
} from "./utils.js";
import { PurposeError, Tracing } from "../src/model/domain/db.js";
import { postgreSQLContainer } from "./config.js";
import {
  ApiGetTracingErrorsParams,
  ApiGetTracingErrorsQuery,
  ApiSavePurposeErrorPayload,
  ApiUpdateTracingStatePayload,
  ApiGetTracingsQuery,
  ApiSaveMissingTracingPayload,
  ApiGetTenantsWithMissingTracingsQuery,
} from "pagopa-interop-tracing-operations-client";
import { tracingCannotBeCancelled } from "../src/model/domain/errors.js";

describe("database test", () => {
  let dbInstance: DB;
  let startedPostgreSqlContainer: StartedTestContainer;
  let operationsService: OperationsService;
  let dbService: DBService;

  const tenantId: TenantId = generateId<TenantId>();
  const secondTenantId: TenantId = generateId<TenantId>();
  const purposeId: PurposeId = generateId<PurposeId>();
  const eservice_id = generateId();
  const todayTruncated = ISODateFormat.parse(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTruncated = ISODateFormat.parse(yesterday.toISOString());

  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearPurposesErrors(dbInstance);
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
      schema: config.dbSchemaName,
      useSSL: config.dbUseSSL,
    });

    dbService = dbServiceBuilder(dbInstance);
    operationsService = operationsServiceBuilder(dbService);

    await addEservice(
      { eservice_id, producer_id: generateId(), name: "eservice name" },
      dbInstance,
    );

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

    await addTenant(
      {
        id: secondTenantId,
        name: "pagoPa 2",
        origin: "external 2",
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
          expect(error.message).toContain("Database query failed");
          expect(error.message).toContain("QueryResultError");
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
          genericLogger,
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
          genericLogger,
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
          genericLogger,
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
          await operationsService.submitTracing(tracing, genericLogger);
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
          operationsService.submitTracing(tracing, genericLogger),
        ).rejects.toThrow();

        mockDb.mockRestore();
      });
    });

    describe("getTracings", () => {
      it("searching with 'states' parameter 'ERROR' should return an empty list of tracings", async () => {
        const filters: ApiGetTracingsQuery & { tenantId: string } = {
          states: [tracingState.error],
          offset: 0,
          limit: 10,
          tenantId,
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

        const result = await operationsService.getTracings(
          filters,
          genericLogger,
        );

        expect(result.results).toStrictEqual([]);
        expect(result.totalCount).toBe(0);
      });

      it("searching with 'states' parameter 'ERROR' should return only 1 record with 'ERROR' state", async () => {
        const filters: ApiGetTracingsQuery & { tenantId: string } = {
          states: [tracingState.error],
          offset: 0,
          limit: 10,
          tenantId,
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

        const result = await operationsService.getTracings(
          filters,
          genericLogger,
        );

        expect(result.totalCount).toBe(1);
        expect(result.results.length).toBe(1);
        expect(result.results[0].state).toBe(tracingState.error);
      });

      it("searching with 'states' parameter 'ERROR' & 'MISSING' should return 2 records with both states", async () => {
        const filters: ApiGetTracingsQuery & { tenantId: string } = {
          states: [tracingState.error, tracingState.missing],
          offset: 0,
          limit: 10,
          tenantId,
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

        const result = await operationsService.getTracings(
          filters,
          genericLogger,
        );

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
        const filters: ApiGetTracingsQuery & { tenantId: string } = {
          offset: 0,
          limit: 10,
          tenantId,
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

        const result = await operationsService.getTracings(
          filters,
          genericLogger,
        );

        expect(result.totalCount).toBe(3);
        expect(result.results.length).toBe(3);
      });

      it("searching with 'limit' parameter value to 1, should return 1 records with totalCount 2", async () => {
        const filters: ApiGetTracingsQuery & { tenantId: string } = {
          offset: 0,
          limit: 1,
          tenantId,
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

        const result = await operationsService.getTracings(
          filters,
          genericLogger,
        );

        expect(result.totalCount).toBe(2);
        expect(result.results.length).toBe(1);
      });
    });

    describe("getTracingErrors", () => {
      it("searching should return an empty list of tracing errors", async () => {
        const params: ApiGetTracingErrorsParams = {
          tracingId: generateId<TracingId>(),
        };

        const query: ApiGetTracingErrorsQuery = {
          offset: 0,
          limit: 10,
        };

        const tracingData: Tracing = {
          id: params.tracingId,
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        await addTracing(tracingData, dbInstance);

        const result = await operationsService.getTracingErrors(
          query,
          params,
          genericLogger,
        );

        expect(result.results).toStrictEqual([]);
        expect(result.totalCount).toBe(0);
      });

      it("searching with 'limit' parameter value to 1, should return only 1 record with an INVALID_STATUS_CODE errorCode and totalCount 2", async () => {
        const params: ApiGetTracingErrorsParams = {
          tracingId: generateId<TracingId>(),
        };

        const query: ApiGetTracingErrorsQuery = {
          offset: 0,
          limit: 1,
        };

        const tracingData: Tracing = {
          id: params.tracingId,
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const purposeErrorData: PurposeError = {
          id: generateId<PurposeErrorId>(),
          tracing_id: tracingData.id,
          version: tracingData.version,
          purpose_id: purposeId,
          error_code: PurposeErrorCodes.INVALID_STATUS_CODE,
          message: "INVALID_STATUS_CODE",
          row_number: 1,
        };

        await addTracing(tracingData, dbInstance);
        await addPurposeError(purposeErrorData, dbInstance);
        await addPurposeError(
          {
            ...purposeErrorData,
            id: generateId<PurposeErrorId>(),
            row_number: 2,
          },
          dbInstance,
        );

        const result = await operationsService.getTracingErrors(
          query,
          params,
          genericLogger,
        );

        expect(result.totalCount).toBe(2);
        expect(result.results.length).toBe(1);
        expect(result.results[0].errorCode).toBe(
          PurposeErrorCodes.INVALID_STATUS_CODE,
        );
      });

      it("searching with invalid 'tracingId' parameter value should throw an error", async () => {
        const params: ApiGetTracingErrorsParams = {
          tracingId: "invalid_uuid",
        };

        const query: ApiGetTracingErrorsQuery = {
          offset: 0,
          limit: 10,
        };

        try {
          await operationsService.getTracingErrors(
            query,
            params,
            genericLogger,
          );
        } catch (e) {
          const error = e as InternalError<CommonErrorCodes>;
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain("Database query failed");
          expect(error.message).toContain("invalid input syntax for type uuid");
          expect(error.code).toBe("genericError");
        }
      });
    });

    describe("updateTracingState", () => {
      it("should update a tracing by tracingId with new state 'ERROR' successfully", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const updateStateData: ApiUpdateTracingStatePayload = {
          state: tracingState.error,
        };

        const tracing = await addTracing(tracingData, dbInstance);

        expect(
          async () =>
            await operationsService.updateTracingState(
              {
                tracingId: tracing.id,
                version: tracing.version,
              },
              updateStateData,
              genericLogger,
            ),
        ).not.toThrowError();

        const result = await findTracingById(tracing.id, dbInstance);

        expect(result.id).toBe(tracingData.id);
        expect(result.state).toBe(tracingState.error);
      });

      it("should throw an error when attempting to update the state with a tracingId that is not found", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const updateStateData: ApiUpdateTracingStatePayload = {
          state: tracingState.error,
        };

        const tracing = await addTracing(tracingData, dbInstance);

        try {
          await operationsService.updateTracingState(
            {
              tracingId: generateId<TracingId>(),
              version: tracing.version,
            },
            updateStateData,
            genericLogger,
          );
        } catch (e) {
          const error = e as InternalError<CommonErrorCodes>;
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain("Database query failed");
          expect(error.message).toContain("queryResultErrorCode.noData");
          expect(error.code).toBe("genericError");
        }
      });
    });

    describe("savePurposeError", () => {
      it("should create a new purpose error successfully", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const purposeErrorData: ApiSavePurposeErrorPayload = {
          version: tracingData.version,
          purposeId: purposeId,
          errorCode: PurposeErrorCodes.INVALID_ROW_SCHEMA,
          message: `INVALID_ROW_SCHEMA`,
          rowNumber: 12,
        };

        const tracing = await addTracing(tracingData, dbInstance);

        expect(
          async () =>
            await operationsService.savePurposeError(
              {
                tracingId: tracing.id,
                version: tracing.version,
              },
              purposeErrorData,
              genericLogger,
            ),
        ).not.toThrowError();
      });

      it("should throw an error when attempting to create a new purpose error for related tracing_id not found", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const purposeErrorData: ApiSavePurposeErrorPayload = {
          version: tracingData.version,
          purposeId: purposeId,
          errorCode: PurposeErrorCodes.INVALID_ROW_SCHEMA,
          message: `INVALID_ROW_SCHEMA`,
          rowNumber: 12,
        };

        const tracing = await addTracing(tracingData, dbInstance);

        try {
          await operationsService.savePurposeError(
            {
              tracingId: generateId<TracingId>(),
              version: tracing.version,
            },
            purposeErrorData,
            genericLogger,
          );
        } catch (e) {
          const error = e as InternalError<CommonErrorCodes>;
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain("Database query failed");
          expect(error.message).toContain("purposes_errors_tracing_id_fkey");
          expect(error.code).toBe("genericError");
        }
      });
    });

    describe("recoverTracing", () => {
      it("should update an existing tracing from state 'ERROR/MISSING' to state 'PENDING' and new version successfully", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.error,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracing = await addTracing(tracingData, dbInstance);
        const result = await operationsService.recoverTracing(
          {
            tracingId: tracing.id,
          },
          genericLogger,
        );

        expect(result.tracingId).toBe(tracingData.id);
        expect(result.tenantId).toBe(tenantId);
        expect(result.previousState).toBe(tracingData.state);
        expect(result.version).toBe(tracingData.version + 1);
      });

      it("should throw an error tracingNotFound when attempting recover a tracing", async () => {
        const tracindId = generateId<TracingId>();

        expect(
          operationsService.recoverTracing(
            {
              tracingId: tracindId,
            },
            genericLogger,
          ),
        ).rejects.toThrowError(tracingNotFound(tracindId));
      });

      it("should throw an error tracingCannotBeUpdated when attempting recover a tracing", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.completed,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracing = await addTracing(tracingData, dbInstance);

        expect(
          operationsService.recoverTracing(
            {
              tracingId: tracing.id,
            },
            genericLogger,
          ),
        ).rejects.toThrowError(tracingRecoverCannotBeUpdated(tracing.id));
      });

      it("should throw an internal DB Service error when attempting recover a tracing", async () => {
        try {
          await operationsService.recoverTracing(
            {
              tracingId: "invalid_uuid",
            },
            genericLogger,
          );
        } catch (e) {
          const error = e as InternalError<CommonErrorCodes>;
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain("Database query failed");
          expect(error.code).toBe("genericError");
        }
      });
    });

    describe("replaceTracing", () => {
      it("should update an existing tracing from state 'COMPLETED' to state 'PENDING' and new version successfully", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.completed,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracing = await addTracing(tracingData, dbInstance);
        const result = await operationsService.replaceTracing(
          {
            tracingId: tracing.id,
          },
          genericLogger,
        );

        expect(result.tracingId).toBe(tracingData.id);
        expect(result.tenantId).toBe(tenantId);
        expect(result.previousState).toBe(tracingData.state);
        expect(result.version).toBe(tracingData.version + 1);
      });

      it("should throw an error tracingNotFound when attempting replace a tracing", async () => {
        const tracindId = generateId<TracingId>();

        expect(
          operationsService.replaceTracing(
            {
              tracingId: tracindId,
            },
            genericLogger,
          ),
        ).rejects.toThrowError(tracingNotFound(tracindId));
      });

      it("should throw an error tracingCannotBeUpdated when attempting replace a tracing", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.error,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracing = await addTracing(tracingData, dbInstance);

        expect(
          operationsService.replaceTracing(
            {
              tracingId: tracing.id,
            },
            genericLogger,
          ),
        ).rejects.toThrowError(tracingReplaceCannotBeUpdated(tracing.id));
      });

      it("should throw an internal DB Service error when attempting recover a tracing", async () => {
        try {
          await operationsService.replaceTracing(
            {
              tracingId: "invalid_uuid",
            },
            genericLogger,
          );
        } catch (e) {
          const error = e as InternalError<CommonErrorCodes>;
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain("Database query failed");
          expect(error.code).toBe("genericError");
        }
      });
    });

    describe("cancelTracingStateAndVersion", () => {
      it("should cancel the update of an existing tracing, reverting to the previous state and version", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.error,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracing = await addTracing(tracingData, dbInstance);
        const recoverTracing = await operationsService.recoverTracing(
          {
            tracingId: tracing.id,
          },
          genericLogger,
        );

        expect(recoverTracing.tracingId).toBe(tracingData.id);
        expect(recoverTracing.tenantId).toBe(tenantId);
        expect(recoverTracing.previousState).toBe(tracingData.state);
        expect(recoverTracing.version).toBe(tracingData.version + 1);
        expect(
          async () =>
            await operationsService.cancelTracingStateAndVersion(
              {
                tracingId: recoverTracing.tracingId,
              },
              {
                version: recoverTracing.version - 1,
                state: recoverTracing.previousState,
              },
              genericLogger,
            ),
        ).not.toThrowError();
      });

      it("should throw an error tracingNotFound when attempting to reverting the tracing to the previous state and version", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.missing,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        await expect(
          operationsService.cancelTracingStateAndVersion(
            {
              tracingId: tracingData.id,
            },
            {
              version: tracingData.version - 1,
              state: tracingData.state,
            },
            genericLogger,
          ),
        ).rejects.toThrowError(tracingNotFound(tracingData.id));
      });

      it("should throw an error tracingCannotBeCancelled when attempting to reverting the tracing to the previous state and version", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.missing,
          date: yesterdayTruncated,
          version: 1,
          errors: false,
        };

        const tracing = await addTracing(tracingData, dbInstance);

        await expect(
          operationsService.cancelTracingStateAndVersion(
            {
              tracingId: tracing.id,
            },
            {
              version: tracing.version - 1,
              state: tracing.state,
            },
            genericLogger,
          ),
        ).rejects.toThrowError(tracingCannotBeCancelled(tracing.id));
      });
    });

    describe("getTenantsWithMissingTracings", () => {
      it("searching with 'date' parameter '2024-08-01' should return an empty list of tenants, since tracing already exists", async () => {
        const date: string = "2024-08-01";
        const filters: ApiGetTenantsWithMissingTracingsQuery = {
          date,
          offset: 0,
          limit: 50,
        };

        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date,
          version: 1,
          errors: false,
        };

        await addTracing(tracingData, dbInstance);
        await addTracing(
          {
            ...tracingData,
            id: generateId<TracingId>(),
            tenant_id: secondTenantId,
          },
          dbInstance,
        );

        const result = await operationsService.getTenantsWithMissingTracings(
          filters,
          genericLogger,
        );

        expect(result.results).toStrictEqual([]);
        expect(result.totalCount).toBe(0);
      });

      it("searching with 'date' parameter '2024-08-01' should return 2 tenants, since tracings doesn't exists and must be created", async () => {
        const date: string = "2024-08-01";
        const filters: ApiGetTenantsWithMissingTracingsQuery = {
          date,
          offset: 0,
          limit: 50,
        };

        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: "2024-06-01",
          version: 1,
          errors: false,
        };

        await addTracing(tracingData, dbInstance);
        await addTracing(
          { ...tracingData, id: generateId<TracingId>(), date: "2024-07-01" },
          dbInstance,
        );
        await addTracing(
          {
            ...tracingData,
            id: generateId<TracingId>(),
            tenant_id: secondTenantId,
          },
          dbInstance,
        );
        await addTracing(
          {
            ...tracingData,
            id: generateId<TracingId>(),
            tenant_id: secondTenantId,
            date: "2024-07-01",
          },
          dbInstance,
        );

        const result = await operationsService.getTenantsWithMissingTracings(
          filters,
          genericLogger,
        );

        expect(result.totalCount).toBe(2);
        expect(result.results.length).toBe(2);
        expect(result.results).toContain(tenantId);
        expect(result.results).toContain(secondTenantId);
      });
    });

    describe("saveMissingTracing", () => {
      it("should create a missing tracing successfully for date '2024-08-01'", async () => {
        const saveMissingTracingData: ApiSaveMissingTracingPayload = {
          date: "2024-08-01",
        };

        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.pending,
          date: saveMissingTracingData.date,
          version: 1,
          errors: false,
        };

        await addTracing(tracingData, dbInstance);

        expect(
          async () =>
            await operationsService.saveMissingTracing(
              { tenantId },
              {
                date: saveMissingTracingData.date,
              },
              genericLogger,
            ),
        ).not.toThrowError();

        const tracing = await findTracingById(tracingData.id, dbInstance);

        expect(new Date(tracing.date)).toContain(
          new Date(saveMissingTracingData.date),
        );
      });
    });

    describe("deletePurposesErrors", () => {
      it("should delete purposes errors with version below the related tracing version with state ERROR, and return 1 record with version 3", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.error,
          date: "2024-08-01",
          version: 3,
          errors: false,
        };

        const purposeErrorData: PurposeError = {
          id: generateId<PurposeErrorId>(),
          tracing_id: tracingData.id,
          version: 1,
          purpose_id: purposeId,
          error_code: PurposeErrorCodes.INVALID_STATUS_CODE,
          message: "INVALID_STATUS_CODE",
          row_number: 1,
        };

        await addTracing(tracingData, dbInstance);
        await addPurposeError(purposeErrorData, dbInstance);
        await addPurposeError(
          {
            ...purposeErrorData,
            id: generateId<PurposeErrorId>(),
            version: 2,
          },
          dbInstance,
        );
        await addPurposeError(
          {
            ...purposeErrorData,
            id: generateId<PurposeErrorId>(),
            version: 3,
          },
          dbInstance,
        );

        await operationsService.deletePurposesErrors(genericLogger);

        const purposesErrors = await findPurposeErrors(dbInstance);

        expect(purposesErrors.length).toBe(1);
        expect(purposesErrors[0].version).toBe(tracingData.version);
      });

      it("should delete purposes errors with related tracing in state COMPLETED, and return 0 records", async () => {
        const tracingData: Tracing = {
          id: generateId<TracingId>(),
          tenant_id: tenantId,
          state: tracingState.completed,
          date: "2024-08-01",
          version: 2,
          errors: false,
        };

        const purposeErrorData: PurposeError = {
          id: generateId<PurposeErrorId>(),
          tracing_id: tracingData.id,
          version: 1,
          purpose_id: purposeId,
          error_code: PurposeErrorCodes.INVALID_STATUS_CODE,
          message: "INVALID_STATUS_CODE",
          row_number: 1,
        };

        await addTracing(tracingData, dbInstance);
        await addPurposeError(purposeErrorData, dbInstance);
        await addPurposeError(
          {
            ...purposeErrorData,
            id: generateId<PurposeErrorId>(),
          },
          dbInstance,
        );

        await operationsService.deletePurposesErrors(genericLogger);

        const purposesErrors = await findPurposeErrors(dbInstance);
        console.log("purposesErrors", purposesErrors);

        expect(purposesErrors.length).toBe(0);
      });
    });

    describe("saveEservice", () => {
      it("should save an eservice successfully", async () => {
        const eservicePayload = {
          producerId: generateId(),
          eserviceId: generateId(),
          name: "eservice name",
        };

        const operationsService = operationsServiceBuilder(dbService);

        await operationsService.saveEservice(eservicePayload, genericLogger);

        const result = await findEserviceById(
          eservicePayload.eserviceId,
          dbInstance,
        );

        expect(result?.eservice_id).toBe(eservicePayload.eserviceId);
      });

      it("should update name of existing eservice successfully", async () => {
        const eserviceId = generateId<EserviceId>();
        const producerId = generateId<TenantId>();

        await addEservice(
          {
            eservice_id: eserviceId,
            producer_id: generateId(),
            name: "eservice name",
          },
          dbInstance,
        );

        const eservicePayload = {
          eserviceId: eserviceId,
          producerId: producerId,
          name: "eservice name updated",
        };

        const operationsService = operationsServiceBuilder(dbService);

        await operationsService.saveEservice(eservicePayload, genericLogger);

        const result = await findEserviceById(eserviceId, dbInstance);
        expect(result?.name).toBe(eservicePayload.name);
      });

      it("should throw an error if the eservice payload is invalid", async () => {
        const invalidEservicePayload = {
          producerId: generateId(),
          eserviceId: "invalid_uuid",
          name: "eservice name",
        };

        const operationsService = operationsServiceBuilder(dbService);

        await expect(
          operationsService.saveEservice(invalidEservicePayload, genericLogger),
        ).rejects.toThrowError(/invalid_uuid/);
      });
    });

    describe("deleteEservice", () => {
      it("should delete an eservice successfully", async () => {
        const eserviceId = generateId<EserviceId>();
        const operationsService = operationsServiceBuilder(dbService);

        await addEservice(
          {
            eservice_id: eserviceId,
            producer_id: generateId(),
            name: "eservice name",
          },
          dbInstance,
        );
        await operationsService.deleteEservice({ eserviceId }, genericLogger);

        const result = await findEserviceById(eserviceId, dbInstance);
        expect(result).toBe(null);
      });

      it("should throw an error if the eserviceId param is invalid", async () => {
        const invalidEserviceParams = {
          eserviceId: "invalid_uuid",
        };

        const operationsService = operationsServiceBuilder(dbService);

        await expect(
          operationsService.deleteEservice(
            invalidEserviceParams,
            genericLogger,
          ),
        ).rejects.toThrowError(/invalid_uuid/);
      });
    });
  });
});
