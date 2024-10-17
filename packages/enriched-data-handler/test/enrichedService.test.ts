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
} from "pagopa-interop-tracing-commons";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../src/utilities/config.js";
import { TracingEnriched, TracingFromCsv } from "../src/models/messages.js";
import {
  InternalError,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
import { mockEnrichedPurposes, mockTracingFromCsv } from "./constants.js";
import { postgreSQLContainer } from "./config.js";
import { StartedTestContainer } from "testcontainers";
import { insertTracesError } from "../src/models/errors.js";
import { mockBodyStream } from "./fileManger.js";
import { parseCSV } from "../src/utilities/csvHandler.js";

describe("Enriched Service", () => {
  let enrichedService: EnrichedService;
  let dbService: DBService;
  let producerService: ProducerService;
  let startedPostgreSqlContainer: StartedTestContainer;
  let dbInstance: DB;
  let fileManager: FileManager;

  const mockAppCtx: WithSQSMessageId<AppContext> = {
    serviceName: config.applicationName,
    messageId: "12345",
    correlationId: mockTracingFromCsv.correlationId,
  };

  const s3client = new S3Client({
    region: config.awsRegion,
  });
  const sqsClient = SQS.instantiateClient({
    region: config.awsRegion,
  });

  afterAll(async () => {
    startedPostgreSqlContainer.stop();
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
      const readObjectSpy = vi
        .spyOn(fileManager, "readObject")
        .mockResolvedValue(mockBodyStream(mockEnrichedPurposes));

      const parsedmockEnrichedPurposes = mockEnrichedPurposes.map((record) => ({
        ...record,
        status: Number(record.status),
      }));

      const tracesInserted = await dbService.insertTraces(
        mockTracingFromCsv.tracingId,
        parsedmockEnrichedPurposes,
      );

      const sendUpdateStateSpy = vi
        .spyOn(producerService, "sendTracingUpdateStateMessage")
        .mockResolvedValue();

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);

      expect(readObjectSpy).toHaveBeenCalledWith(expect.any(String));

      expect(tracesInserted).toHaveLength(mockEnrichedPurposes.length);

      expect(sendUpdateStateSpy).toHaveBeenCalledWith(
        {
          tracingId: mockTracingFromCsv.tracingId,
          version: mockTracingFromCsv.version,
          state: tracingState.completed,
        },
        mockAppCtx,
      );
    });

    it("should throw an error if tracing message is not valid", async () => {
      const invalidMessage = { tracingId: generateId() };

      const readObjectSpy = vi.spyOn(fileManager, "readObject");
      const insertTracingSpy = vi.spyOn(dbService, "insertTraces");
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

    it("should throw an error if no record found in the bucket", async () => {
      const readObjectSpy = vi
        .spyOn(fileManager, "readObject")
        .mockResolvedValue(mockBodyStream([]));
      const insertTracingSpy = vi.spyOn(dbService, "insertTraces");
      const sendUpdateStateSpy = vi.spyOn(
        producerService,
        "sendTracingUpdateStateMessage",
      );
      try {
        await enrichedService.insertEnrichedTrace(
          mockTracingFromCsv,
          mockAppCtx,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(InternalError);
        expect(readObjectSpy).toHaveBeenCalled();
        expect(insertTracingSpy).not.toHaveBeenCalled();
        expect(sendUpdateStateSpy).not.toHaveBeenCalled();
      }
    });
    it("should not send update if DB insert fails", async () => {
      const readObjectSpy = vi
        .spyOn(fileManager, "readObject")
        .mockResolvedValue(mockBodyStream(mockEnrichedPurposes));
      const insertTracingSpy = vi
        .spyOn(dbService, "insertTraces")
        .mockRejectedValue(insertTracesError(``));
      const sendUpdateStateSpy = vi.spyOn(
        producerService,
        "sendTracingUpdateStateMessage",
      );
      const enrichedTracingRecords: TracingEnriched[] = await parseCSV(
        mockBodyStream(mockEnrichedPurposes),
      );

      try {
        await enrichedService.insertEnrichedTrace(
          mockTracingFromCsv,
          mockAppCtx,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(InternalError);
        expect(readObjectSpy).toHaveBeenCalled();
        expect(insertTracingSpy).toHaveBeenCalledWith(
          mockTracingFromCsv.tracingId,
          enrichedTracingRecords,
        );
        expect(sendUpdateStateSpy).not.toHaveBeenCalled();
      }
    });

    it("should send update 'COMPLETED' if DB insert succeded", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockEnrichedPurposes),
      );
      vi.spyOn(dbService, "insertTraces").mockReturnValue(
        Promise.resolve([{ id: mockTracingFromCsv.tracingId }]),
      );
      const sendUpdateStateSpy = vi.spyOn(
        producerService,
        "sendTracingUpdateStateMessage",
      );

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);

      mockTracingFromCsv.tracingId,
        mockEnrichedPurposes,
        expect(sendUpdateStateSpy).toHaveBeenCalledWith(
          {
            tracingId: mockTracingFromCsv.tracingId,
            version: mockTracingFromCsv.version,
            state: tracingState.completed,
          },
          mockAppCtx,
        );
    });
  });
});
