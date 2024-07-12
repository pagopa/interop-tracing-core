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
import {
  ReplacementService,
  replacementServiceBuilder,
} from "../src/services/replacementService.js";
import { dbConfig } from "../src/utilities/dbConfig.js";
import { SQS, initDB } from "pagopa-interop-tracing-commons";
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
import { deleteTraceError, insertTraceError } from "../src/models/errors.js";

describe("Enriched Service", () => {
  let enrichedService: EnrichedService;
  let dbService: DBService;
  let bucketService: BucketService;
  let producerService: ProducerService;
  let replacementService: ReplacementService;
  let startedPostgreSqlContainer: StartedTestContainer;

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
    replacementService = replacementServiceBuilder(dbService, producerService);

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
        .spyOn(dbService, "insertTracing")
        .mockResolvedValue([{ id: generateId() }]);
      const sendUpdateStateSpy = vi
        .spyOn(producerService, "sendUpdateState")
        .mockResolvedValue();

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv);

      expect(readObjectSpy).toHaveBeenCalledWith(expect.any(String));
      expect(insertTracingSpy).toHaveBeenCalledWith(
        mockTracingFromCsv.tracingId,
        mockEnrichedPuposes,
      );
      expect(sendUpdateStateSpy).toHaveBeenCalledWith(
        mockTracingFromCsv.tracingId,
        mockTracingFromCsv.version,
        tracingState.completed,
      );
    });

    it("should throw an error if tracing message is not valid", async () => {
      const invalidMessage = { tracingId: generateId() };

      const readObjectSpy = vi.spyOn(bucketService, "readObject");
      const insertTracingSpy = vi.spyOn(dbService, "insertTracing");
      const sendUpdateStateSpy = vi.spyOn(producerService, "sendUpdateState");
      try {
        await enrichedService.insertEnrichedTrace(
          invalidMessage as unknown as TracingFromCsv,
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
        .spyOn(bucketService, "readObject")
        .mockResolvedValue([]);
      const insertTracingSpy = vi.spyOn(dbService, "insertTracing");
      const sendUpdateStateSpy = vi.spyOn(producerService, "sendUpdateState");
      try {
        await enrichedService.insertEnrichedTrace(mockTracingFromCsv);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalError);
        expect(readObjectSpy).toHaveBeenCalled();
        expect(insertTracingSpy).not.toHaveBeenCalled();
        expect(sendUpdateStateSpy).not.toHaveBeenCalled();
      }
    });
    it("should not send update if DB insert fails", async () => {
      const readObjectSpy = vi
        .spyOn(bucketService, "readObject")
        .mockResolvedValue(mockEnrichedPuposes);
      const insertTracingSpy = vi
        .spyOn(dbService, "insertTracing")
        .mockRejectedValue(insertTraceError(``));
      const sendUpdateStateSpy = vi.spyOn(producerService, "sendUpdateState");

      try {
        await enrichedService.insertEnrichedTrace(mockTracingFromCsv);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalError);
        expect(readObjectSpy).toHaveBeenCalled();
        expect(insertTracingSpy).toHaveBeenCalledWith(
          mockTracingFromCsv.tracingId,
          mockEnrichedPuposes,
        );
        expect(sendUpdateStateSpy).not.toHaveBeenCalled();
      }
    });

    it("should send update 'COMPLETED' if DB insert succeded", async () => {
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        mockEnrichedPuposes,
      );
      vi.spyOn(dbService, "insertTracing").mockReturnValue(
        Promise.resolve([{ id: mockTracingFromCsv.tracingId }]),
      );
      const sendUpdateStateSpy = vi.spyOn(producerService, "sendUpdateState");

      await enrichedService.insertEnrichedTrace(mockTracingFromCsv);
      mockTracingFromCsv.tracingId,
        mockEnrichedPuposes,
        expect(sendUpdateStateSpy).toHaveBeenCalledWith(
          mockTracingFromCsv.tracingId,
          mockTracingFromCsv.version,
          "COMPLETED",
        );
    });
  });
  describe("deleteTrace", () => {
    it("should delete a tracing and send update successfully", async () => {
      const deleteTracingSpy = vi
        .spyOn(dbService, "deleteTracing")
        .mockResolvedValue({ id: generateId() });
      const sendUpdateStateSpy = vi
        .spyOn(producerService, "sendUpdateState")
        .mockResolvedValue();

      await replacementService.deleteTracing(mockTracingFromCsv);

      expect(deleteTracingSpy).toHaveBeenCalledWith(
        mockTracingFromCsv.tracingId,
      );
      expect(sendUpdateStateSpy).toHaveBeenCalledWith(
        mockTracingFromCsv.tracingId,
        mockTracingFromCsv.version,
        tracingState.completed,
        true,
      );
    });

    it("should throw an error if deletion fails", async () => {
      const deleteTracingSpy = vi
        .spyOn(dbService, "deleteTracing")
        .mockRejectedValue(deleteTraceError(``));
      const sendUpdateStateSpy = vi.spyOn(producerService, "sendUpdateState");

      try {
        await replacementService.deleteTracing(mockTracingFromCsv);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalError);
        expect(deleteTracingSpy).toHaveBeenCalledWith(
          mockTracingFromCsv.tracingId,
        );
        expect(sendUpdateStateSpy).not.toHaveBeenCalled();
      }
    });
  });
});
