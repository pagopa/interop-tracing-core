import { describe, expect, it, vi, afterAll, beforeAll } from "vitest";
import {
  EnrichedService,
  enrichedServiceBuilder,
} from "../src/services/enrichedService.js";
import { DBService, dbServiceBuilder } from "../src/services/db/dbService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "../src/services/producerService.js";
import {
  AppContext,
  DB,
  SQS,
  WithSQSMessageId,
  initDB,
  FileManager,
  fileManagerBuilder,
  DBContext,
  logger,
} from "pagopa-interop-tracing-commons";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../src/utilities/config.js";
import {
  InternalError,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
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

describe("Enriched Service", () => {
  let enrichedService: EnrichedService;
  let dbService: DBService;
  let producerService: ProducerService;
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
  const sqsClient = SQS.instantiateClient({ region: config.awsRegion });

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
    producerService = producerServiceBuilder(sqsClient);

    enrichedService = enrichedServiceBuilder(
      dbService,
      producerService,
      fileManager,
    );
  });

  describe("insertEnrichedTrace", () => {
    it("should insert a tracing successfully", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockEnrichedTracing),
      );

      const sendUpdateStateSpy = vi
        .spyOn(producerService, "sendTracingUpdateStateMessage")
        .mockResolvedValue();

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);

      const insertedRecords = await getTraces(dbContext.conn, {
        tracingId: mockTracingFromCsv.tracingId,
      });

      expect(insertedRecords).toHaveLength(mockEnrichedTracing.length);

      expect(sendUpdateStateSpy).toHaveBeenCalledWith(
        {
          tracingId: mockTracingFromCsv.tracingId,
          version: mockTracingFromCsv.version,
          state: tracingState.completed,
        },
        mockAppCtx,
      );
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
      const sendUpdateStateSpy = vi.spyOn(
        producerService,
        "sendTracingUpdateStateMessage",
      );
      try {
        await enrichedService.insertEnrichedTrace(
          invalidMessage as unknown as TracingFromCsv,
          mockAppCtx,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(InternalError);
        expect(readObjectSpy).not.toHaveBeenCalled();
        expect(insertTracingSpy).not.toHaveBeenCalled();
        expect(sendUpdateStateSpy).not.toHaveBeenCalled();
      }
    });

    it("should send COMPLETED even if CSV has no records", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(mockBodyStream([]));

      const sendUpdateStateSpy = vi.spyOn(
        producerService,
        "sendTracingUpdateStateMessage",
      );

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);

      expect(sendUpdateStateSpy).toHaveBeenCalledWith(
        {
          tracingId: mockTracingFromCsv.tracingId,
          version: mockTracingFromCsv.version,
          state: tracingState.completed,
        },
        mockAppCtx,
      );
    });

    it("should not send update if DB insert fails", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockEnrichedTracing),
      );

      vi.spyOn(dbService, "insertToStaging").mockRejectedValue(
        insertTracesError(""),
      );

      const sendUpdateStateSpy = vi.spyOn(
        producerService,
        "sendTracingUpdateStateMessage",
      );

      await expect(
        enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx),
      ).rejects.toBeInstanceOf(InternalError);

      expect(sendUpdateStateSpy).not.toHaveBeenCalled();
    });
  });
});
