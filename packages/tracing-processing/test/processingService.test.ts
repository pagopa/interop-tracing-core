import { describe, expect, it, vi } from "vitest";
import {
  ProcessingService,
  processingServiceBuilder,
} from "../src/services/processingService.js";
import { dbServiceBuilder } from "../src/services/db/dbService.js";
import { dbConfig } from "../src/utilities/dbConfig.js";
import {
  BucketService,
  bucketServiceBuilder,
} from "../src/services/bucketService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "../src/services/producerService.js";
import { config } from "../src/utilities/config.js";
import { S3Client } from "@aws-sdk/client-s3";
import { SQS, initDB } from "pagopa-interop-tracing-commons";
import {
  generateEnrichedPurposes,
  generateEnrichedPurposesWithErrors,
  generateMockTracingRecords,
  generateWrongMockTracingRecords,
  mockMessage,
} from "./utils.js";
import { TracingContent, TracingRecords } from "../src/models/messages.js";

describe("Processing Service", () => {
  const sqsClient: SQS.SQSClient = SQS.instantiateClient({
    region: config.awsRegion,
  });
  const s3client: S3Client = new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID || "",
      secretAccessKey: process.env.SECRET_ACCESS_KEY || "",
    },
  });

  let processingService: ProcessingService;
  const bucketService: BucketService = bucketServiceBuilder(s3client);
  const producerService: ProducerService = producerServiceBuilder(sqsClient);

  const dbInstance = initDB({
    username: dbConfig.dbUsername,
    password: dbConfig.dbPassword,
    host: dbConfig.dbHost,
    port: dbConfig.dbPort,
    database: dbConfig.dbName,
    schema: dbConfig.dbSchemaName,
    useSSL: dbConfig.dbUseSSL,
  });
  const dbService = dbServiceBuilder(dbInstance);

  processingService = processingServiceBuilder(
    dbService,
    bucketService,
    producerService,
  );

  describe("createS3Path", () => {
    it("should generate correct S3 path ", () => {
      const path = processingService.createS3Path(mockMessage);
      expect(path).toBe(
        "2024-12-12/223e4567-e89b-12d3-a456-426614174001/a33e4567-e89b-12d3-a456-426614174abe/1/133e4567-e89b-12d3-a456-426614174e3a/a33e4567-e89b-12d3-a456-426614174abe.csv",
      );
    });
  });

  describe("checkRecords", () => {
    it("should not send error messages when all records pass formal check", async () => {
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        generateMockTracingRecords(),
      );
      const { tracingId, correlationId } = {
        tracingId: "",
        correlationId: "",
      };
      const records = await bucketService.readObject("dummy-s3-key");
      const hasError = await processingService.checkRecords(
        records,
        tracingId,
        correlationId,
      );
      expect(hasError).toBe(false);
    });

    it("should send error messages when all records don't pass formal check", async () => {
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        generateWrongMockTracingRecords() as unknown as TracingRecords,
      );

      const tracingId = "";
      const correlationId = "";

      const records = await bucketService.readObject("dummy-s3-key");
      const hasError = await processingService.checkRecords(
        records,
        tracingId,
        correlationId,
      );

      expect(hasError).toBe(true);
    });
  });

  describe("processTracing", () => {
    it("should get errors on message not tipe of TracingContent", async () => {
      try {
        await processingService.processTracing({} as unknown as TracingContent);
      } catch (error) {
        const e = error as Error;
        expect(error).toBeInstanceOf(Error);
        expect(e.message).toContain("tracing message is not valid");
      }
    });

    it("should get errors on enriched purposes when purposes are not found and call producerService", async () => {
      vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValue(
        generateEnrichedPurposesWithErrors(),
      );

      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        generateMockTracingRecords(),
      );

      vi.spyOn(bucketService, "writeObject").mockResolvedValue(undefined);
      vi.spyOn(producerService, "handleMissingPurposes").mockResolvedValue();

      const enrichedPurposes = await dbService.getEnrichedPurpose([]);
      const errorPurposes = enrichedPurposes.filter(
        (enrichedPurpose) => enrichedPurpose.error,
      );

      await processingService.processTracing(mockMessage);

      expect(errorPurposes).toHaveLength(1);
      expect(producerService.handleMissingPurposes).toHaveBeenCalledWith(
        errorPurposes,
        mockMessage.tracingId,
        mockMessage.correlationId,
      );
      expect(bucketService.writeObject).toHaveBeenCalledTimes(0);
    });

    it("should call writeObject when there are no error purposes", async () => {
      vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValue(
        generateEnrichedPurposes(),
      );
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        generateMockTracingRecords(),
      );

      vi.spyOn(bucketService, "writeObject").mockResolvedValue(undefined);
      vi.spyOn(producerService, "handleMissingPurposes").mockResolvedValue();

      const enrichedPurposes = await dbService.getEnrichedPurpose([]);

      await processingService.processTracing(mockMessage);

      expect(bucketService.writeObject).toHaveBeenCalledWith(
        enrichedPurposes,
        processingService.createS3Path(mockMessage),
      );
      expect(producerService.handleMissingPurposes).toHaveBeenCalledTimes(0);
    });
  });
});
