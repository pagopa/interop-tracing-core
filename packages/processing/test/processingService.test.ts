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
  processingServiceBuilder,
  writeEnrichedTracingOrSendPurposeErrors,
} from "../src/services/processingService.js";
import {
  DBService,
  dbServiceBuilder,
} from "../src/services/enricherService.js";
import {
  ProducerService,
  producerServiceBuilder,
} from "../src/services/producerService.js";
import { config } from "../src/utilities/config.js";
import { S3Client } from "@aws-sdk/client-s3";
import {
  AppContext,
  DB,
  FileManager,
  PurposeErrorCodes,
  SQS,
  WithSQSMessageId,
  fileManagerBuilder,
  initDB,
} from "pagopa-interop-tracing-commons";
import {
  addEservice,
  addPurpose,
  addTenant,
  parseCSVFromString,
  removeAndInsertWrongEserviceAndPurpose,
} from "./utils.js";

import {
  InternalError,
  TracingId,
  generateId,
} from "pagopa-interop-tracing-models";
import { ErrorCodes } from "../src/models/errors.js";
import { decodeSQSEventMessage } from "../src/models/models.js";
import { postgreSQLContainer } from "./config.js";
import { StartedTestContainer } from "testcontainers";
import { generateCSV, parseCSV } from "../src/utilities/csvHandler.js";
import {
  eServiceData,
  tenantData,
  purposeData,
  purposeDataWithWrongEservice,
  SqsMockMessageForS3,
  mockMessage,
  mockTracingRecords,
  wrongMockTracingRecords,
  mockEnrichedPurposesWithErrors,
  mockEnrichedPurposes,
  validPurpose,
  errorPurposesWithInvalidPurposeId,
  errorPurposesWithInvalidEserviceId,
  validPurposeNotAssociated,
  validEnrichedPurpose,
  eServiceDataNotAssociated,
  mockFormalErrors,
} from "./costants.js";
import {
  EnrichedPurposeArray,
  PurposeErrorMessage,
  PurposeErrorMessageArray,
} from "../src/models/csv.js";
import { TracingRecordSchema } from "../src/models/db.js";
import { TracingEnriched } from "../src/models/tracing.js";
import { mockBodyStream } from "./fileManager.js";

describe("Processing Service", () => {
  const sqsClient: SQS.SQSClient = SQS.instantiateClient({
    region: config.awsRegion,
    ...(config.sqsEndpoint ? { endpoint: config.sqsEndpoint } : {}),
  });

  const s3client: S3Client = new S3Client({
    region: config.awsRegion,
  });

  let fileManager: FileManager = fileManagerBuilder(
    s3client,
    config.bucketS3Name,
  );
  let producerService: ProducerService = producerServiceBuilder(sqsClient);
  let startedPostgreSqlContainer: StartedTestContainer;
  let processingService: ProcessingService;
  let dbService: DBService;
  let dbInstance: DB;

  const sqsMessage: SQS.Message = {
    MessageId: "12345",
    ReceiptHandle: "receipt_handle_id",
    Body: JSON.stringify(SqsMockMessageForS3.Body),
  };

  const mockAppCtx: WithSQSMessageId<AppContext> = {
    serviceName: config.applicationName,
    messageId: SqsMockMessageForS3.MessageId,
    correlationId: decodeSQSEventMessage(sqsMessage).correlationId,
  };

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
    fileManager = fileManagerBuilder(s3client, config.bucketS3Name);
    producerService = producerServiceBuilder(sqsClient);
    processingService = processingServiceBuilder(
      dbService,
      fileManager,
      producerService,
    );

    await addEservice(eServiceData, dbInstance);
    await addEservice(eServiceDataNotAssociated, dbInstance);

    await addTenant(tenantData, dbInstance);

    await addPurpose(purposeData, dbInstance);
    await addPurpose(purposeDataWithWrongEservice, dbInstance);
  });

  describe("decodeSQSEventMessage", () => {
    it("should throw error when message is wrong or empty", async () => {
      const emptyMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify({}),
      };

      try {
        await decodeSQSEventMessage(emptyMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "decodeSQSEventMessageError",
        );
      }
    });

    it("should call processTracing with the correct message", async () => {
      const sqsMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(SqsMockMessageForS3.Body),
      };

      vi.spyOn(processingService, "processTracing").mockResolvedValueOnce();

      const decoded = decodeSQSEventMessage(sqsMessage);
      await processingService.processTracing(decoded, mockAppCtx);
      expect(processingService.processTracing).toBeCalledWith(
        decoded,
        mockAppCtx,
      );
      expect(decoded).toMatchObject({
        tenantId: expect.any(String),
        date: expect.any(String),
        version: expect.any(Number),
        correlationId: expect.any(String),
        tracingId: expect.any(String),
      });
    });
  });

  describe("buildS3Key", () => {
    it("should generate correct S3 path ", () => {
      const path = fileManager.buildS3Key(
        mockMessage.tenantId,
        mockMessage.date,
        mockMessage.tracingId,
        mockMessage.version,
        mockMessage.correlationId,
      );

      expect(path).toBe(
        "tenantId=123e4567-e89b-12d3-a456-426614174001/date=2024-12-12/tracingId=87dcfab8-3161-430b-97db-7787a77a7a3d/version=1/correlationId=8fa62e67-92bf-48f8-a9e1-4e73a37c4682/87dcfab8-3161-430b-97db-7787a77a7a3d.csv",
      );
    });
  });

  describe("checkRecords", () => {
    it("should not send error messages when all records pass formal check", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockTracingRecords),
      );
      const dataObject = await fileManager.readObject("dummy-s3-key");
      const records: TracingRecordSchema[] = await parseCSV(dataObject);

      const hasError = await checkRecords(records, mockMessage);

      expect(hasError).toHaveLength(0);
    });

    it("should send error messages when all records don't pass formal check", async () => {
      const records = wrongMockTracingRecords;
      const errors = await checkRecords(records, mockMessage);

      const dateNotValidError = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_DATE,
      );
      const invalidRowSchemaError = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_ROW_SCHEMA,
      );
      const statusNotValidError = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_STATUS_CODE,
      );
      const purposeIdNotValid = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_PURPOSE,
      );
      const requestsCountNotValid = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_REQUEST_COUNT,
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(invalidRowSchemaError.length).toBeGreaterThan(0);
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

    it("should get errors on enriched purposes when purposes are not found and call producerService", async () => {
      vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValue([
        mockEnrichedPurposesWithErrors,
      ]);

      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockTracingRecords),
      );

      vi.spyOn(fileManager, "writeObject").mockResolvedValueOnce(undefined);
      vi.spyOn(producerService, "sendErrorMessage").mockResolvedValue(
        undefined,
      );
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        [],
        mockMessage,
        mockAppCtx,
      );
      const purposeErrorsFiltered = enrichedPurposes.filter((item) => {
        if (PurposeErrorMessageArray.safeParse(item).success) {
          return item;
        } else {
          return null;
        }
      });

      await processingService.processTracing(mockMessage, mockAppCtx);

      expect(purposeErrorsFiltered?.length).toBeGreaterThan(0);

      expect(producerService.sendErrorMessage).toHaveBeenCalledTimes(3);

      expect(fileManager.writeObject).toHaveBeenCalledTimes(0);
    });

    it("should call writeObject when there are no error purposes", async () => {
      vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValue(
        mockEnrichedPurposes,
      );
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockTracingRecords),
      );
      vi.spyOn(fileManager, "writeObject").mockResolvedValueOnce();

      vi.spyOn(producerService, "sendErrorMessage").mockResolvedValue(
        undefined,
      );

      const enrichedPurposes = await dbService.getEnrichedPurpose(
        [],
        mockMessage,
        mockAppCtx,
      );

      await processingService.processTracing(mockMessage, mockAppCtx);

      const purposeEnriched = EnrichedPurposeArray.parse(enrichedPurposes);

      const csvData = generateCSV(purposeEnriched, generateId<TracingId>());
      const input = Buffer.from(csvData);
      const bucketS3Key = fileManager.buildS3Key(
        mockMessage.tenantId,
        mockMessage.date,
        mockMessage.tracingId,
        mockMessage.version,
        mockMessage.correlationId,
      );
      await fileManager.writeObject(
        input,
        "text/csv",
        bucketS3Key,
        config.bucketEnrichedS3Name,
      );

      expect(fileManager.writeObject).toHaveBeenCalledWith(
        input,
        "text/csv",
        bucketS3Key,
        config.bucketEnrichedS3Name,
      );

      expect(producerService.sendErrorMessage).toHaveBeenCalledTimes(0);
    });
  });

  describe("sendErrorMessage", () => {
    it("should send error messages when all records don't pass formal check", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(wrongMockTracingRecords),
      );

      const dataObject = await fileManager.readObject("dummy-s3-key");

      const records: TracingRecordSchema[] = await parseCSV(dataObject);

      const errors = await checkRecords(records, mockMessage);
      const dateNotValidError = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_DATE,
      );
      const invalidRowSchemaError = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_ROW_SCHEMA,
      );
      const statusNotValidError = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_STATUS_CODE,
      );
      const purposeIdNotValid = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_PURPOSE,
      );
      const requestsCountNotValid = errors.filter(
        (error) => error.errorCode === PurposeErrorCodes.INVALID_REQUEST_COUNT,
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(invalidRowSchemaError.length).toBeGreaterThan(0);
      expect(statusNotValidError.length).toBeGreaterThan(0);
      expect(dateNotValidError.length).toBeGreaterThan(0);
      expect(purposeIdNotValid.length).toBeGreaterThan(0);
      expect(requestsCountNotValid.length).toBeGreaterThan(0);
    });

    it("only last message should have updateTracingState true", async () => {
      const producerService = producerServiceBuilder(sqsClient);
      const errorPurposes = [mockEnrichedPurposesWithErrors];
      const sendErrorMessageSpy = vi
        .spyOn(producerService, "sendErrorMessage")
        .mockResolvedValue(undefined);

      vi.spyOn(processingService, "processTracing");
      vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValueOnce(
        errorPurposes,
      );

      await writeEnrichedTracingOrSendPurposeErrors(
        fileManager,
        producerService,
        dbService,
        mockTracingRecords,
        "s3KeyPath",
        mockMessage,
        mockFormalErrors,
        mockAppCtx,
      );

      expect(producerService.sendErrorMessage).toBeCalledTimes(
        mockFormalErrors.length,
      );

      for (let i = 1; i < mockFormalErrors.length - 1; i++) {
        const [firstArg] = sendErrorMessageSpy.mock.calls[i];
        expect(firstArg.updateTracingState).toBe(false);
      }

      const [firstArg] =
        sendErrorMessageSpy.mock.calls[mockFormalErrors.length - 1];

      expect(firstArg.updateTracingState).toBe(true);
    });
  });

  describe("getEnrichedPurpose", () => {
    it("should return a type of EnrichedPurpose if purpose is valid", async () => {
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        validPurpose,
        mockMessage,
        mockAppCtx,
      );

      const safeEnriched = EnrichedPurposeArray.safeParse(enrichedPurposes);
      expect(safeEnriched.success).toBe(true);
    });

    it("should return errorCode PURPOSE_NOT_FOUND if purpose is not found", async () => {
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        errorPurposesWithInvalidPurposeId,
        mockMessage,
        mockAppCtx,
      );
      const purposeErrorsFiltered = enrichedPurposes.filter((item) => {
        if (PurposeErrorMessage.safeParse(item).success) {
          return item;
        } else {
          return null;
        }
      });

      const { data: purposeErrors } = PurposeErrorMessageArray.safeParse(
        purposeErrorsFiltered,
      );

      purposeErrors?.forEach((item) => {
        expect(item.errorCode).toBe("PURPOSE_NOT_FOUND");
      });
    });

    it("should return getEnrichedPurposeError if eservice is not found", async () => {
      try {
        await dbService.getEnrichedPurpose(
          errorPurposesWithInvalidEserviceId,
          mockMessage,
          mockAppCtx,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "getEnrichedPurposeError",
        );
      }
    });

    it("should return getEnrichedPurposeError if consumer is not found", async () => {
      try {
        const invalidConsumer = generateId();
        await dbService.getEnrichedPurpose(
          validPurpose,
          {
            ...mockMessage,
            ...{ tenantId: invalidConsumer },
          },
          mockAppCtx,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "getEnrichedPurposeError",
        );
      }
    });

    it("should return TENANT_IS_NOT_PRODUCER_OR_CONSUMER  if tenant is not a consumer or a producer", async () => {
      await removeAndInsertWrongEserviceAndPurpose(
        eServiceData.eserviceId,
        validPurposeNotAssociated[0],
        mockMessage.tenantId,
        purposeData.id,
        dbInstance,
      );
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        validPurposeNotAssociated,
        mockMessage,
        mockAppCtx,
      );
      const purposeErrorsFiltered = enrichedPurposes.filter((item) => {
        if (PurposeErrorMessage.safeParse(item).success) {
          return item;
        } else {
          return null;
        }
      });

      const { data: purposeErrors } = PurposeErrorMessageArray.safeParse(
        purposeErrorsFiltered,
      );

      purposeErrors?.forEach((item) => {
        expect(item.errorCode).toBe("TENANT_IS_NOT_PRODUCER_OR_CONSUMER");
      });
    });
  });

  describe("generateCsv", () => {
    it("should generate a TracingEnriched object from csv", async () => {
      const csv = generateCSV(validEnrichedPurpose, mockMessage.tenantId);
      const parsedCsv = await parseCSVFromString(csv);
      expect(parsedCsv).toBeDefined();
      parsedCsv.forEach((item, index) => {
        if (index) {
          // skipping index 0 because is csv header
          const validationResult = TracingEnriched.safeParse(item);
          expect(validationResult.success).toBe(true);
        }
      });
    });
  });
});
