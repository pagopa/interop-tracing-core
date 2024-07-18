import { describe, expect, it, vi, afterAll, beforeAll } from "vitest";
import {
  EnrichedService,
  enrichedServiceBuilder,
} from "../src/services/enrichedService.js";
import {
  BucketService,
  bucketServiceBuilder,
} from "../src/services/bucketService.js";
import { DBService, dbServiceBuilder } from "../src/services/db/dbService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "../src/services/producerService.js";
import { dbConfig } from "../src/utilities/dbConfig.js";
import {
  AppContext,
  SQS,
  WithSQSMessageId,
  initDB,
} from "pagopa-interop-tracing-commons";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../src/utilities/config.js";
import { TracingFromCsv } from "../src/models/messages.js";
import {
  InternalError,
  generateId,
  tracingState,
} from "pagopa-interop-tracing-models";
import { mockEnrichedPuposes, mockTracingFromCsv } from "./constants.js";
import { postgreSQLContainer } from "./config.js";
import { StartedTestContainer } from "testcontainers";
import { insertTraceError } from "../src/models/errors.js";

describe("Enriched Service", () => {
  let enrichedService: EnrichedService;
  let dbService: DBService;
  let bucketService: BucketService;
  let producerService: ProducerService;
  let startedPostgreSqlContainer: StartedTestContainer;

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
    startedPostgreSqlContainer = await postgreSQLContainer(dbConfig).start();
    dbConfig.dbPort = startedPostgreSqlContainer.getMappedPort(5432);
    const dbInstance = initDB({
      username: dbConfig.dbUsername,
      password: dbConfig.dbPassword,
      host: dbConfig.dbHost,
      port: dbConfig.dbPort,
      database: dbConfig.dbName,
      schema: dbConfig.dbSchemaName,
      useSSL: dbConfig.dbUseSSL,
    });
    dbService = dbServiceBuilder(dbInstance);
    bucketService = bucketServiceBuilder(s3client);
    producerService = producerServiceBuilder(sqsClient);

    enrichedService = enrichedServiceBuilder(
      dbService,
      bucketService,
      producerService,
    );
  });

  describe("insertEnrichedTrace", () => {
    it("should insert a tracing successfully", async () => {
      const readObjectSpy = vi
        .spyOn(bucketService, "readObject")
        .mockResolvedValue(mockEnrichedPuposes);
      const insertTracingSpy = vi
        .spyOn(dbService, "insertTraces")
        .mockResolvedValue([{ id: generateId() }]);
      const sendTracingUpdateStateMessageSpy = vi
        .spyOn(producerService, "sendTracingUpdateStateMessage")
        .mockResolvedValue();

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);

      expect(readObjectSpy).toHaveBeenCalledWith(expect.any(String));

      expect(insertTracingSpy).toHaveBeenCalledWith(
        mockTracingFromCsv.tracingId,
        mockEnrichedPuposes,
      );
      expect(sendTracingUpdateStateMessageSpy).toHaveBeenCalledWith(
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

      const readObjectSpy = vi.spyOn(bucketService, "readObject");
      const insertTracingSpy = vi.spyOn(dbService, "insertTraces");
      const sendTracingUpdateStateMessageSpy = vi.spyOn(
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
        expect(sendTracingUpdateStateMessageSpy).not.toHaveBeenCalled();
      }
    });

    it("should throw an error if no record found in the bucket", async () => {
      const readObjectSpy = vi
        .spyOn(bucketService, "readObject")
        .mockResolvedValue([]);
      const insertTracingSpy = vi.spyOn(dbService, "insertTraces");
      const sendTracingUpdateStateMessageSpy = vi.spyOn(
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
        expect(sendTracingUpdateStateMessageSpy).not.toHaveBeenCalled();
      }
    });

    it("should not send update if DB insert fails", async () => {
      const readObjectSpy = vi
        .spyOn(bucketService, "readObject")
        .mockResolvedValue(mockEnrichedPuposes);
      const insertTracingSpy = vi
        .spyOn(dbService, "insertTraces")
        .mockRejectedValue(insertTraceError(``));
      const sendTracingUpdateStateMessageSpy = vi.spyOn(
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
        expect(insertTracingSpy).toHaveBeenCalledWith(
          mockTracingFromCsv.tracingId,
          mockEnrichedPuposes,
        );
        expect(sendTracingUpdateStateMessageSpy).not.toHaveBeenCalled();
      }
    });

    it("should send update 'COMPLETE' if DB insert succeded", async () => {
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        mockEnrichedPuposes,
      );
      vi.spyOn(dbService, "insertTraces").mockReturnValue(
        Promise.resolve([{ id: generateId() }]),
      );
      const sendTracingUpdateStateMessageSpy = vi.spyOn(
        producerService,
        "sendTracingUpdateStateMessage",
      );

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv, mockAppCtx);
      mockTracingFromCsv.tracingId,
        mockEnrichedPuposes,
        expect(sendTracingUpdateStateMessageSpy).toHaveBeenCalledWith(
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
