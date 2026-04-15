import { describe, expect, it, vi, afterAll, beforeAll } from "vitest";
import {
  EnrichedService,
  enrichedServiceBuilder,
} from "../src/services/enrichedService.js";
import { DBService, dbServiceBuilder } from "../src/services/db/dbService.js";
import { TracingStoreDBService } from "../src/services/db/tracingStoreDbService.js";
import {
  AppContext,
  DB,
  WithSQSMessageId,
  initDB,
  FileManager,
  fileManagerBuilder,
  DBContext,
  logger,
} from "pagopa-interop-tracing-commons";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../src/utilities/config.js";
import { InternalError, generateId } from "pagopa-interop-tracing-models";
import { mockEnrichedTracing, mockTracingFromCsv } from "./constants.js";
import { postgreSQLContainer } from "./config.js";
import { StartedTestContainer } from "testcontainers";
import { insertTracesError } from "../src/models/errors.js";
import { mockBodyStream } from "./fileManger.js";
import { setupDbServiceBuilder } from "../src/utilities/setupDbService.js";
import { TracingTable } from "../src/models/traces.js";
import { retryConnection } from "../src/services/db/connection.js";
import { getTraces } from "./utils.js";
import { TracingFromCsv } from "../src/models/messages.js";
import { beforeEach } from "vitest";

describe("Enriched Service", () => {
  let enrichedService: EnrichedService;
  let dbService: DBService;
  let tracingStoreDbService: TracingStoreDBService;
  let startedPostgreSqlContainer: StartedTestContainer;
  let dbInstance: DB;
  let fileManager: FileManager;
  let dbContext: DBContext;

  const mockAppCtx: WithSQSMessageId<AppContext> = {
    serviceName: config.applicationName,
    messageId: "12345",
    correlationId: mockTracingFromCsv.correlationId,
  };

  const s3client = new S3Client({ region: config.awsRegion });
  afterAll(async () => {
    await startedPostgreSqlContainer.stop();
  });

  beforeAll(async () => {
    startedPostgreSqlContainer = await postgreSQLContainer(config).start();
    config.analyticsDbPort = startedPostgreSqlContainer.getMappedPort(5432);

    dbInstance = initDB({
      username: config.analyticsDbUsername,
      password: config.analyticsDbPassword,
      host: config.analyticsDbHost,
      port: config.analyticsDbPort,
      database: config.analyticsDbName,
      schema: config.analyticsDbSchemaName,
      useSSL: config.analyticsDbUseSSL,
    });

    const connection = await dbInstance.connect();

    dbContext = {
      conn: connection,
      pgp: dbInstance.$config.pgp,
    };

    await retryConnection(
      dbInstance,
      dbContext,
      config,
      async (db) => {
        await setupDbServiceBuilder(db.conn).setupStagingTables([
          TracingTable.Traces,
        ]);
      },
      logger({ serviceName: config.applicationName }),
    );

    dbService = dbServiceBuilder(dbContext);
    fileManager = fileManagerBuilder(s3client, config.bucketEnrichedS3Name);

    tracingStoreDbService = {
      checkTracingVersion: vi.fn().mockResolvedValue(true),
    };

    enrichedService = enrichedServiceBuilder(
      dbService,
      fileManager,
      tracingStoreDbService,
    );
  });

  beforeEach(() => {
    vi.spyOn(tracingStoreDbService, "checkTracingVersion").mockResolvedValue(
      true,
    );
  });

  describe("insertEnrichedTrace", () => {
    it("should insert a tracing successfully", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockEnrichedTracing),
      );

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);

      const insertedRecords = await getTraces(dbContext.conn, {
        tracingId: mockTracingFromCsv.tracingId,
      });

      expect(insertedRecords).toHaveLength(mockEnrichedTracing.length);
    });

    it("should skip insert when message version is older than current version", async () => {
      const readObjectSpy = vi.spyOn(fileManager, "readObject");
      const insertTracingSpy = vi.spyOn(dbService, "insertToStaging");
      const finalizeMergeSpy = vi.spyOn(dbService, "finalizeMergeToTarget");

      vi.spyOn(
        tracingStoreDbService,
        "checkTracingVersion",
      ).mockResolvedValueOnce(false);

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);

      expect(readObjectSpy).not.toHaveBeenCalled();
      expect(insertTracingSpy).not.toHaveBeenCalled();
      expect(finalizeMergeSpy).not.toHaveBeenCalled();
    });

    it("should delete old records when inserting new ones for the same tracingId", async () => {
      const commonTracingId = generateId();
      const newPurposeId = generateId();

      const firstTracingCsv = mockEnrichedTracing.map((r) => ({
        ...r,
        tracingId: commonTracingId,
      }));

      const secondTracingCsv = [
        ...mockEnrichedTracing,
        ...mockEnrichedTracing,
      ].map((r) => ({
        ...r,
        tracingId: commonTracingId,
        purposeId: newPurposeId,
      }));

      vi.spyOn(fileManager, "readObject")
        .mockResolvedValueOnce(mockBodyStream(firstTracingCsv))
        .mockResolvedValueOnce(mockBodyStream(secondTracingCsv));

      await enrichedService.insertEnrichedTrace(
        { ...mockTracingFromCsv, tracingId: commonTracingId },
        mockAppCtx,
      );

      let recordsAfterFirstInsert = await getTraces(dbContext.conn, {
        tracingId: commonTracingId,
      });

      expect(recordsAfterFirstInsert).toHaveLength(firstTracingCsv.length);

      await enrichedService.insertEnrichedTrace(
        { ...mockTracingFromCsv, tracingId: commonTracingId },
        mockAppCtx,
      );

      const recordsAfterSecondInsert = await getTraces(dbContext.conn, {
        tracingId: commonTracingId,
      });

      expect(recordsAfterSecondInsert).toHaveLength(secondTracingCsv.length);

      for (const trace of recordsAfterSecondInsert) {
        expect(trace.purposeId).toBe(newPurposeId);
      }
    });

    it("should throw an error if tracing message is not valid", async () => {
      const invalidMessage = { tracingId: generateId() };

      const readObjectSpy = vi.spyOn(fileManager, "readObject");
      const insertTracingSpy = vi.spyOn(dbService, "insertToStaging");
      try {
        await enrichedService.insertEnrichedTrace(
          invalidMessage as unknown as TracingFromCsv,
          mockAppCtx,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(InternalError);
        expect(readObjectSpy).not.toHaveBeenCalled();
        expect(insertTracingSpy).not.toHaveBeenCalled();
      }
    });

    it("should handle empty CSV without errors", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(mockBodyStream([]));

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);
    });

    it("should not send update if DB insert fails", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockEnrichedTracing),
      );

      vi.spyOn(dbService, "insertToStaging").mockRejectedValue(
        insertTracesError(""),
      );

      await expect(
        enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx),
      ).rejects.toBeInstanceOf(InternalError);
    });
  });
});
