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
  ProcessingService,
  checkRecords,
  createS3Path,
  processingServiceBuilder,
  writeEnrichedTracingOrSendPurposeErrors,
} from "../src/services/processingService.js";
import { DBService, dbServiceBuilder } from "../src/services/db/dbService.js";
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
  SqsMockMessageForS3,
  addEservice,
  addPurpose,
  addTenant,
  eServiceData,
  eServiceDataNotAssociated,
  errorPurposesWithInvalidEserviceId,
  errorPurposesWithInvalidPurposeId,
  mockEnrichedPurposes,
  mockEnrichedPurposesWithErrors,
  mockMessage,
  mockTracingRecords,
  purposeData,
  purposeDataWithWrongEservice,
  tenantData,
  validPurpose,
  validPurposeNotAssociated,
  wrongMockTracingRecords,
} from "./utils.js";
import { TracingContent, TracingRecords } from "../src/models/messages.js";
import { InternalError } from "pagopa-interop-tracing-models";
import { ErrorCodes } from "../src/models/errors.js";
import { decodeSqsMessage } from "../src/models/models.js";
import { processMessage } from "../src//messageHandler.js";
import { postgreSQLContainer } from "./config.js";
import { StartedTestContainer } from "testcontainers";

describe("Processing Service", () => {
  const sqsClient: SQS.SQSClient = SQS.instantiateClient({
    region: config.awsRegion,
  });
  const s3client: S3Client = new S3Client({
    region: config.awsRegion,
  });

  let bucketService: BucketService = bucketServiceBuilder(s3client);
  let producerService: ProducerService = producerServiceBuilder(sqsClient);
  let startedPostgreSqlContainer: StartedTestContainer;
  let processingService: ProcessingService;
  let dbService: DBService;

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
    processingService = processingServiceBuilder(
      dbService,
      bucketService,
      producerService,
    );
    await addEservice(eServiceData, dbInstance);
    await addEservice(eServiceDataNotAssociated, dbInstance);

    await addTenant(tenantData, dbInstance);

    await addPurpose(purposeData, dbInstance);
    await addPurpose(purposeDataWithWrongEservice, dbInstance);
  });

  describe("decodeSqsMessage", () => {
    it("should throw error when message is wrong or empty", async () => {
      const emptyMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify({}),
      };

      try {
        await decodeSqsMessage(emptyMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "decodeSQSMessageError",
        );
      }
    });

    it("should call processTracing with the correct message", async () => {
      const sqsMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(SqsMockMessageForS3.Body),
      };

      const processMessageFn = processMessage(processingService);

      vi.spyOn(processingService, "processTracing");

      await processMessageFn(sqsMessage);
      const decoded = decodeSqsMessage(sqsMessage);
      expect(processingService.processTracing).toBeCalledWith(decoded);
      expect(decoded).toMatchObject({
        tenantId: expect.any(String),
        date: expect.any(String),
        version: expect.any(String),
        correlationId: expect.any(String),
        tracingId: expect.any(String),
      });
    });
  });

  describe("createS3Path", () => {
    it("should generate correct S3 path ", () => {
      const path = createS3Path(mockMessage);

      expect(path).toBe(
        "tenantId=223e4567-e89b-12d3-a456-426614174001/date=2024-12-12/tracingId=a33e4567-e89b-12d3-a456-426614174abe/version=1/correlationId=133e4567-e89b-12d3-a456-426614174e3a/a33e4567-e89b-12d3-a456-426614174abe.csv",
      );
    });
  });

  describe("checkRecords", () => {
    it("should not send error messages when all records pass formal check", async () => {
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        mockTracingRecords,
      );
      const records = await bucketService.readObject("dummy-s3-key");
      const hasError = await checkRecords(records, mockMessage);

      expect(hasError).toHaveLength(0);
    });

    it("should send error messages when all records don't pass formal check", async () => {
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        wrongMockTracingRecords as unknown as TracingRecords,
      );

      const records = await bucketService.readObject("dummy-s3-key");
      const errors = await checkRecords(records, mockMessage);

      const dateNotValidError = errors.filter(
        (error) => error.errorCode === "DATE_NOT_VALID",
      );
      const invalidFormalCheckError = errors.filter(
        (error) => error.errorCode === "INVALID_FORMAL_CHECK",
      );
      const statusNotValidError = errors.filter(
        (error) => error.errorCode === "INVALID_STATUS_CODE",
      );
      const purposeIdNotValid = errors.filter(
        (error) => error.errorCode === "INVALID_PURPOSE",
      );
      const requestsCountNotValid = errors.filter(
        (error) => error.errorCode === "INVALID_REQUEST_COUNT",
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(invalidFormalCheckError.length).toBeGreaterThan(0);
      expect(statusNotValidError.length).toBeGreaterThan(0);
      expect(dateNotValidError.length).toBeGreaterThan(0);
      expect(purposeIdNotValid.length).toBeGreaterThan(0);
      expect(requestsCountNotValid.length).toBeGreaterThan(0);
    });
  });

  describe("processTracing", () => {
    let originalGetEnrichedPurpose: typeof dbService.getEnrichedPurpose;

    beforeEach(() => {
      originalGetEnrichedPurpose = dbService.getEnrichedPurpose;
    });

    afterEach(() => {
      dbService.getEnrichedPurpose = originalGetEnrichedPurpose;
    });
    it("should get errors on message not tipe of TracingContent", async () => {
      try {
        await processingService.processTracing({} as unknown as TracingContent);
      } catch (error) {
        const e = error as InternalError<ErrorCodes>;
        expect(error).toBeInstanceOf(InternalError);
        expect(e.code).toBe("genericError");
      }
    });

    it("should get errors on enriched purposes when purposes are not found and call producerService", async () => {
      vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValue(
        mockEnrichedPurposesWithErrors,
      );

      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        mockTracingRecords,
      );

      vi.spyOn(bucketService, "writeObject").mockResolvedValueOnce(undefined);
      vi.spyOn(producerService, "sendErrorMessage").mockResolvedValue(
        undefined,
      );
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        [],
        mockMessage,
      );
      const errorPurposes = enrichedPurposes.filter(
        (enrichedPurpose) => enrichedPurpose.errorCode,
      );

      await processingService.processTracing(mockMessage);

      expect(errorPurposes.length).toBeGreaterThan(0);

      expect(producerService.sendErrorMessage).toHaveBeenCalledTimes(3);

      expect(bucketService.writeObject).toHaveBeenCalledTimes(0);
    });

    it("should call writeObject when there are no error purposes", async () => {
      vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValue(
        mockEnrichedPurposes,
      );
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        mockTracingRecords,
      );
      vi.spyOn(bucketService, "writeObject").mockResolvedValueOnce(undefined);

      vi.spyOn(producerService, "sendErrorMessage").mockResolvedValue(
        undefined,
      );

      const enrichedPurposes = await dbService.getEnrichedPurpose(
        [],
        mockMessage,
      );

      await processingService.processTracing(mockMessage);

      expect(bucketService.writeObject).toHaveBeenCalledWith(
        enrichedPurposes,
        createS3Path(mockMessage),
      );

      expect(producerService.sendErrorMessage).toHaveBeenCalledTimes(0);
    });
  });

  describe("sendErrorMessage", () => {
    it("should send error messages when all records don't pass formal check", async () => {
      vi.spyOn(bucketService, "readObject").mockResolvedValue(
        wrongMockTracingRecords as unknown as TracingRecords,
      );

      const records = await bucketService.readObject("dummy-s3-key");
      const errors = await checkRecords(records, mockMessage);

      const dateNotValidError = errors.filter(
        (error) => error.errorCode === "DATE_NOT_VALID",
      );
      const invalidFormalCheckError = errors.filter(
        (error) => error.errorCode === "INVALID_FORMAL_CHECK",
      );
      const statusNotValidError = errors.filter(
        (error) => error.errorCode === "INVALID_STATUS_CODE",
      );
      const purposeIdNotValid = errors.filter(
        (error) => error.errorCode === "INVALID_PURPOSE",
      );
      const requestsCountNotValid = errors.filter(
        (error) => error.errorCode === "INVALID_REQUEST_COUNT",
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(invalidFormalCheckError.length).toBeGreaterThan(0);
      expect(statusNotValidError.length).toBeGreaterThan(0);
      expect(dateNotValidError.length).toBeGreaterThan(0);
      expect(purposeIdNotValid.length).toBeGreaterThan(0);
      expect(requestsCountNotValid.length).toBeGreaterThan(0);
    }),
      it("only last message should have updateTracingState true", async () => {
        const producerService = producerServiceBuilder(sqsClient);
        const errorPurposes = mockEnrichedPurposesWithErrors;
        vi.spyOn(producerService, "sendErrorMessage").mockResolvedValue(
          undefined,
        );

        vi.spyOn(processingService, "processTracing");
        vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValueOnce(
          errorPurposes,
        );

        await writeEnrichedTracingOrSendPurposeErrors(
          bucketService,
          producerService,
          dbService,
          errorPurposes,
          "s3KeyPath",
          mockMessage,
        );

        expect(producerService.sendErrorMessage).toBeCalledTimes(
          errorPurposes.length,
        );

        for (let i = 1; i < errorPurposes.length - 1; i++) {
          expect(producerService.sendErrorMessage).nthCalledWith(
            i,
            expect.objectContaining({
              updateTracingState: false,
            }),
          );
        }

        expect(producerService.sendErrorMessage).lastCalledWith(
          expect.objectContaining({
            updateTracingState: true,
          }),
        );
      });
  });
  describe("getEnrichedPurpose", () => {
    it("should return errorCode PURPOSE_NOT_FOUND if purpose is not found", async () => {
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        errorPurposesWithInvalidPurposeId,
        mockMessage,
      );
      enrichedPurposes.forEach((item) => {
        expect(item.errorCode).toBe("PURPOSE_NOT_FOUND");
      });
    });
    it("should return errorCode ESERVICE_NOT_FOUND if eservice is not found", async () => {
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        errorPurposesWithInvalidEserviceId,
        mockMessage,
      );
      enrichedPurposes.forEach((item) => {
        expect(item.errorCode).toBe("ESERVICE_NOT_FOUND");
      });
    });
    it("should return ESERVICE_NOT_ASSOCIATED  if tenant is not a consumer or a producer", async () => {
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        validPurposeNotAssociated,
        mockMessage,
      );
      enrichedPurposes.forEach((item) => {
        expect(item.errorCode).toBe("ESERVICE_NOT_ASSOCIATED");
      });
    });

    it("should return empty errorCode if purpose is valid", async () => {
      const producer = eServiceData.producer_id;
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        validPurpose,
        { ...mockMessage, ...{ tenantId: producer } },
      );
      enrichedPurposes.forEach((item) => {
        expect(item.errorCode).toBe(undefined);
      });
    });
  });
});
