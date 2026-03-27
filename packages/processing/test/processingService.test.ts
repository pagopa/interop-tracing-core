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
  processingServiceBuilder,
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
  parseCSV,
} from "pagopa-interop-tracing-commons";
import {
  addEservice,
  addNotAssociatedPurposeAndTenant,
  addPurpose,
  addTenant,
  insertDelegation,
  parseCSVFromString,
} from "./utils.js";

import {
  CorrelationId,
  InternalError,
  generateId,
  EnrichedPurposeRowArray,
  createEnrichedCsvMapping,
  tracingState,
  unsafeBrandId,
} from "pagopa-interop-tracing-models";
import { ErrorCodes } from "../src/models/errors.js";
import { decodeSQSEventMessage } from "../src/models/models.js";
import { postgreSQLContainer } from "./config.js";
import { StartedTestContainer } from "testcontainers";
import {
  eServiceData,
  tenantData,
  purposeData,
  purposeDataWithWrongEservice,
  SqsMockMessageForS3,
  mockMessage,
  mockTracingRecords,
  wrongMockTracingRecords,
  mockEnrichedPurposes,
  validPurpose,
  errorPurposesWithInvalidPurposeId,
  errorPurposesWithInvalidEserviceId,
  validPurposeNotAssociated,
  validEnrichedPurpose,
  eServiceDataNotAssociated,
  tenant_id,
} from "./costants.js";
import { PurposeErrorRow } from "pagopa-interop-tracing-models";
import { TracingRecordSchema } from "../src/models/db.js";
import { TracingEnriched } from "../src/models/tracing.js";
import { mockBodyStream } from "./fileManager.js";
import { checkRecords } from "../src/utilities/checkCSVFormalErrors.js";
import { text } from "stream/consumers";
import { CsvWriter } from "../src/utilities/csvWriter.js";

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
    correlationId: unsafeBrandId<CorrelationId>(
      decodeSQSEventMessage(sqsMessage).correlationId,
    ),
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
        `tenantId=${mockMessage.tenantId}/date=${mockMessage.date}/tracingId=${mockMessage.tracingId}/version=${mockMessage.version}/correlationId=${mockMessage.correlationId}/${mockMessage.tracingId}.csv`,
      );
    });
  });

  describe("checkRecords", () => {
    it("should not send error messages when all records pass formal check", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockTracingRecords),
      );
      const dataObject = await fileManager.readObject("dummy-s3-key");

      let tracingRowNumber = 0;
      const records: TracingRecordSchema[] = [];

      await parseCSV<TracingRecordSchema>(dataObject, async (rows) => {
        rows.forEach((row) => {
          tracingRowNumber++;
          row.rowNumber = tracingRowNumber;
        });
        records.push(...rows);
      });

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

    it("should write CSV and update state to COMPLETED when there are no error purposes", async () => {
      vi.spyOn(dbService, "getEnrichedPurpose").mockResolvedValue({
        enriched: mockEnrichedPurposes,
        errors: [],
      });

      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(mockTracingRecords),
      );

      const writeStreamSpy = vi
        .spyOn(fileManager, "writeStream")
        .mockResolvedValueOnce(undefined);

      const sendResultSpy = vi
        .spyOn(producerService, "sendProcessingResultMessage")
        .mockResolvedValue(undefined);

      await processingService.processTracing(mockMessage, mockAppCtx);

      expect(writeStreamSpy).toHaveBeenCalledTimes(1);
      expect(sendResultSpy).toHaveBeenCalledWith(
        {
          tracingId: mockMessage.tracingId,
          version: mockMessage.version,
          state: tracingState.completed,
        },
        mockAppCtx,
      );
    });

    it("should call writeStream when csv is empty", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(mockBodyStream([]));

      const writeStreamSpy = vi
        .spyOn(fileManager, "writeStream")
        .mockResolvedValueOnce(undefined);

      const sendResultSpy = vi
        .spyOn(producerService, "sendProcessingResultMessage")
        .mockResolvedValue(undefined);

      await processingService.processTracing(mockMessage, mockAppCtx);

      const bucketS3Key = fileManager.buildS3Key(
        mockMessage.tenantId,
        mockMessage.date,
        mockMessage.tracingId,
        mockMessage.version,
        mockMessage.correlationId,
      );

      expect(writeStreamSpy).toHaveBeenCalledTimes(1);

      const [stream, contentType, key, bucket] = writeStreamSpy.mock.calls[0];

      expect(stream).toBeInstanceOf(Object);
      expect(contentType).toBe("text/csv");
      expect(key).toBe(bucketS3Key);
      expect(bucket).toBe(config.bucketEnrichedS3Name);

      expect(sendResultSpy).toHaveBeenCalledWith(
        {
          tracingId: mockMessage.tracingId,
          version: mockMessage.version,
          state: tracingState.completed,
        },
        mockAppCtx,
      );
    });
  });

  describe("checkRecords", () => {
    it("should send error messages when all records don't pass formal check", async () => {
      vi.spyOn(fileManager, "readObject").mockResolvedValue(
        mockBodyStream(wrongMockTracingRecords),
      );

      const dataObject = await fileManager.readObject("dummy-s3-key");

      const records: TracingRecordSchema[] = [];

      await parseCSV<TracingRecordSchema>(dataObject, async (rows) => {
        rows.forEach((row) => {
          // Test invalidRowSchemaError
          row.rowNumber = undefined as unknown as number;
        });
        records.push(...rows);
      });

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

  describe("getEnrichedPurpose", () => {
    const delegationId = tenant_id;
    it("should return a type of EnrichedPurpose if purpose is valid", async () => {
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        validPurpose,
        mockMessage,
      );

      const safeEnriched = EnrichedPurposeRowArray.safeParse(
        enrichedPurposes.enriched,
      );
      expect(safeEnriched.success).toBe(true);
    });

    it("should return errorCode PURPOSE_NOT_FOUND if purpose is not found", async () => {
      const enrichedPurposes = await dbService.getEnrichedPurpose(
        errorPurposesWithInvalidPurposeId,
        mockMessage,
      );
      const purposeErrors = enrichedPurposes.errors.filter(
        (item) => PurposeErrorRow.safeParse(item).success,
      );

      purposeErrors.forEach((item) => {
        expect(item.errorCode).toBe("PURPOSE_NOT_FOUND");
      });
    });

    it("should return getEnrichedPurposeError if eservice is not found", async () => {
      try {
        await dbService.getEnrichedPurpose(
          errorPurposesWithInvalidEserviceId,
          mockMessage,
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
        await dbService.getEnrichedPurpose(validPurpose, {
          ...mockMessage,
          ...{ tenantId: invalidConsumer },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "getEnrichedPurposeError",
        );
      }
    });

    it("should return TENANT_IS_NOT_PRODUCER_OR_CONSUMER  if tenant is not a consumer or a producer or a delegation", async () => {
      await insertDelegation(
        {
          id: generateId(),
          delegate_id: delegationId,
          eservice_id: validPurposeNotAssociated[0].eserviceId,
          state: "REVOKED",
        },
        dbInstance,
      );

      await addNotAssociatedPurposeAndTenant(
        validPurposeNotAssociated[0],
        dbInstance,
      );

      const enrichedPurposes = await dbService.getEnrichedPurpose(
        validPurposeNotAssociated,
        mockMessage,
      );
      const purposeErrors = enrichedPurposes.errors.filter(
        (item) => PurposeErrorRow.safeParse(item).success,
      );

      purposeErrors.forEach((item) => {
        expect(item.errorCode).toBe("TENANT_IS_NOT_PRODUCER_OR_CONSUMER");
      });
    });

    it("should success if tenant is not a consumer or a producer but a delegate", async () => {
      await insertDelegation(
        {
          id: generateId(),
          delegate_id: delegationId,
          eservice_id: validPurposeNotAssociated[0].eserviceId,
          state: "ACTIVE",
        },
        dbInstance,
      );

      const enrichedPurposes = await dbService.getEnrichedPurpose(
        validPurposeNotAssociated,
        mockMessage,
      );

      const safeEnriched = EnrichedPurposeRowArray.safeParse(
        enrichedPurposes.enriched,
      );
      expect(safeEnriched.success).toBe(true);
    });
  });

  describe("generateCsv", () => {
    it("should generate a TracingEnriched object from csv", async () => {
      const tracingCsv = new CsvWriter(
        createEnrichedCsvMapping(mockMessage.tenantId),
      );

      tracingCsv.writeBatch(validEnrichedPurpose);
      tracingCsv.close();

      const csvContent = await text(tracingCsv.getStream());

      const parsedCsv = await parseCSVFromString(csvContent);

      expect(parsedCsv).toBeDefined();

      parsedCsv.forEach((item, index) => {
        if (index) {
          // skipping index 0 because is csv header
          const validationResult = TracingEnriched.safeParse(item);
          expect(validationResult.success).toBe(true);
        }
      });
    });

    it("should correctly handle commas within a field during CSV generation", async () => {
      const tracingCsv = new CsvWriter(
        createEnrichedCsvMapping(mockMessage.tenantId),
      );

      tracingCsv.writeBatch([
        {
          ...validEnrichedPurpose[0],
          purposeName: "name,with,commas",
        },
      ]);

      tracingCsv.close();

      const csvContent = await text(tracingCsv.getStream());
      const parsedCsv = await parseCSVFromString(csvContent);

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
