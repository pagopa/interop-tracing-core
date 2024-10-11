import {
  ApiGetTracingErrorsResponse,
  ApiGetTracingsResponse,
  ApiRecoverTracingResponse,
  ApiReplaceTracingResponse,
  ApiSubmitTracingResponse,
  createApiClient,
} from "pagopa-interop-tracing-operations-client";
import {
  PurposeId,
  TracingId,
  correlationIdToHeader,
  generateId,
  genericInternalError,
  purposeIdToHeader,
  tracingAlreadyExists,
  tracingRecoverCannotBeUpdated,
  tracingReplaceCannotBeUpdated,
  tracingNotFound,
  tracingState,
} from "pagopa-interop-tracing-models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../src/utilities/config.js";
import {
  ISODateFormat,
  contextMiddleware,
  PurposeErrorCodes,
  genericLogger,
  FileManager,
  fileManagerBuilder,
} from "pagopa-interop-tracing-commons";
import tracingRouter from "../src/routers/tracingRouter.js";
import supertest from "supertest";
import { S3Client } from "@aws-sdk/client-s3";

import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { NextFunction, Response, Request } from "express";
import { mockOperationsApiClientError } from "./utils.js";
import {
  makeApiProblem,
  writeObjectS3BucketError,
} from "../src/model/domain/errors.js";
import { errorMapper } from "../src/utilities/errorMapper.js";
import { ZodiosApp } from "@zodios/express";
import {
  ApiExternal,
  ApiExternalGetTracingErrorsParams,
  ApiExternalGetTracingErrorsQuery,
  ApiExternalGetTracingsQuery,
} from "../src/model/types.js";
import { configureMulterEndpoints } from "../src/routers/config/multer.js";
import { LocalExpressContext, localZodiosCtx } from "../src/context/index.js";

const operationsApiClient = createApiClient(config.operationsBaseUrl);
const operationsService: OperationsService =
  operationsServiceBuilder(operationsApiClient);

const s3client: S3Client = new S3Client({ region: config.awsRegion });
const fileManager: FileManager = fileManagerBuilder(
  s3client,
  config.bucketS3Name,
);

const app: ZodiosApp<ApiExternal, LocalExpressContext> = localZodiosCtx.app();
app.use(contextMiddleware(config.applicationName));
configureMulterEndpoints(app);

const mockAppCtx = {
  correlationId: generateId(),
  authData: {
    purposeId: generateId(),
  },
};

const mockAuthenticationMiddleware = (
  req: RequestWithZodiosCtx,
  _res: Response,
  next: NextFunction,
) => {
  req.ctx = mockAppCtx;
  next();
};

app.use(mockAuthenticationMiddleware);
app.use(tracingRouter(localZodiosCtx)(operationsService, fileManager));

const tracingApiClient = supertest(app);

interface RequestWithZodiosCtx extends Request {
  ctx: {
    authData: {
      purposeId: string;
    };
    correlationId: string;
  };
}

const buildS3Key = (
  tenantId: string,
  date: string,
  tracingId: string,
  version: number,
  correlationId: string,
): string =>
  `tenantId=${tenantId}/date=${ISODateFormat.parse(
    date,
  )}/tracingId=${tracingId}/version=${version}/correlationId=${correlationId}/${tracingId}.csv`;

describe("Tracing Router", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("submitTracing", () => {
    it("should upload to bucket the submitted tracing file, update database with related record and return 200 status", async () => {
      const mockFile = Buffer.from("test file content");
      const mockSubmitTracingResponse: ApiSubmitTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 1,
        errors: false,
      };

      vi.spyOn(operationsApiClient, "submitTracing").mockResolvedValue(
        mockSubmitTracingResponse,
      );

      vi.spyOn(fileManager, "writeObject").mockResolvedValue();

      vi.spyOn(operationsService, "updateTracingState").mockResolvedValue();

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post("/tracings/submit")
        .attach("file", mockFile, originalFilename)
        .field("date", mockSubmitTracingResponse.date)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(response.status).toBe(200);
      expect(response.body.tracingId).toBe(mockSubmitTracingResponse.tracingId);
      expect(response.body.errors).toEqual(false);

      const bucketS3Key = buildS3Key(
        mockSubmitTracingResponse.tenantId,
        mockSubmitTracingResponse.date,
        mockSubmitTracingResponse.tracingId,
        mockSubmitTracingResponse.version,
        mockAppCtx.correlationId,
      );

      expect(fileManager.writeObject).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: originalFilename }),
        bucketS3Key,
      );

      expect(operationsApiClient.submitTracing).toHaveBeenCalledWith(
        {
          date: mockSubmitTracingResponse.date,
        },
        {
          headers: {
            ...correlationIdToHeader(mockAppCtx.correlationId),
            ...purposeIdToHeader(mockAppCtx.authData.purposeId),
          },
        },
      );
    });

    it("should return a 400 status bad request error if a tracing already exists for the provided date", async () => {
      const mockFile = Buffer.from("test file content");
      const mockSubmitTracingResponse: ApiSubmitTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 1,
        errors: false,
      };

      const errorMessage = `A tracing for the current tenant already exists on this date: ${mockSubmitTracingResponse.date}`;
      const apiErrorMock = makeApiProblem(
        tracingAlreadyExists(errorMessage),
        errorMapper,
        genericLogger,
      );

      const operationsApiClientError =
        mockOperationsApiClientError(apiErrorMock);

      vi.spyOn(operationsApiClient, "submitTracing").mockRejectedValue(
        operationsApiClientError,
      );

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post("/tracings/submit")
        .attach("file", mockFile, originalFilename)
        .field("date", mockSubmitTracingResponse.date)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(response.text).contains(errorMessage);
      expect(response.status).toBe(400);
    });
  });

  describe("getTracings", () => {
    it("retrieve non-empty list of tracings", async () => {
      const searchQuery: ApiExternalGetTracingsQuery = {
        states: [tracingState.error, tracingState.pending],
        offset: 0,
        limit: 10,
      };

      const results = [
        {
          tracingId: generateId<TracingId>(),
          date: ISODateFormat.parse(new Date().toISOString()),
          state: tracingState.error,
        },
        {
          tracingId: generateId<TracingId>(),
          date: ISODateFormat.parse(new Date().toISOString()),
          state: tracingState.missing,
        },
      ];

      const result: ApiGetTracingsResponse = {
        results,
        totalCount: 2,
      };

      vi.spyOn(operationsApiClient, "getTracings").mockResolvedValue(result);

      const response = await tracingApiClient
        .get(`/tracings`)
        .set("Content-Type", "application/json")
        .query(searchQuery);

      expect(response.status).toBe(200);
    });

    it("retrieve empty list of tracings", async () => {
      const searchQuery: ApiExternalGetTracingsQuery = {
        offset: 0,
        limit: 10,
      };

      const result: ApiGetTracingsResponse = {
        results: [],
        totalCount: 0,
      };

      vi.spyOn(operationsApiClient, "getTracings").mockResolvedValue(result);

      const response = await tracingApiClient
        .get(`/tracings`)
        .set("Content-Type", "application/json")
        .query(searchQuery);

      expect(response.status).toBe(200);
    });

    it("throw bad request status when invalid 'states' parameter is provided", async () => {
      const searchQuery = {
        states: ["INVALID_STATE"],
        offset: 0,
        limit: 10,
      };

      const response = await tracingApiClient
        .get(`/tracings`)
        .set("Content-Type", "application/json")
        .query(searchQuery);

      expect(response.status).toBe(400);
    });

    it("throw bad request status when no offset/limit parameter is provided", async () => {
      const searchQuery = {};

      const response = await tracingApiClient
        .get(`/tracings`)
        .set("Content-Type", "application/json")
        .query(searchQuery);

      expect(response.status).toBe(400);
    });
  });

  describe("getTracingErrors", () => {
    it("retrieve non-empty list of tracing errors", async () => {
      const searchParams: ApiExternalGetTracingErrorsParams = {
        tracingId: generateId<TracingId>(),
      };

      const searchQuery: ApiExternalGetTracingErrorsQuery = {
        offset: 0,
        limit: 10,
      };

      const result: ApiGetTracingErrorsResponse = {
        results: [
          {
            purposeId: generateId<PurposeId>(),
            errorCode: PurposeErrorCodes.INVALID_STATUS_CODE,
            message: "INVALID_STATUS_CODE",
            rowNumber: 2,
          },
        ],
        totalCount: 2,
      };

      vi.spyOn(operationsApiClient, "getTracingErrors").mockResolvedValue(
        result,
      );

      const response = await tracingApiClient
        .get(`/tracings/${searchParams.tracingId}/errors`)
        .set("Content-Type", "application/json")
        .query(searchQuery);

      expect(response.status).toBe(200);
    });

    it("retrieve empty list of tracing errors", async () => {
      const searchParams: ApiExternalGetTracingErrorsParams = {
        tracingId: generateId<TracingId>(),
      };

      const searchQuery: ApiExternalGetTracingErrorsQuery = {
        offset: 0,
        limit: 10,
      };

      const result: ApiGetTracingErrorsResponse = {
        results: [],
        totalCount: 0,
      };

      vi.spyOn(operationsApiClient, "getTracingErrors").mockResolvedValue(
        result,
      );

      const response = await tracingApiClient
        .get(`/tracings/${searchParams.tracingId}/errors`)
        .set("Content-Type", "application/json")
        .query(searchQuery);

      expect(response.status).toBe(200);
    });

    it("throw bad request status when invalid 'tracingId' parameter is provided", async () => {
      const searchParams: ApiExternalGetTracingErrorsParams = {
        tracingId: "invalid_uuid",
      };

      const searchQuery: ApiExternalGetTracingErrorsQuery = {
        offset: 0,
        limit: 10,
      };

      const response = await tracingApiClient
        .get(`/tracings/${searchParams.tracingId}/errors`)
        .set("Content-Type", "application/json")
        .query(searchQuery);

      expect(response.status).toBe(400);
    });

    it("throw bad request status when no offset/limit parameter is provided", async () => {
      const searchParams = {
        tracingId: generateId<TracingId>(),
      };

      const response = await tracingApiClient
        .get(`/tracings/${searchParams.tracingId}/errors`)
        .set("Content-Type", "application/json")
        .query({});

      expect(response.status).toBe(400);
    });
  });

  describe("recoverTracing", () => {
    it("should upload to bucket a revisited tracing file, update relative db existing tracing version and state to 'PENDING'", async () => {
      const mockFile = Buffer.from("test file content");
      const mockRecoverTracingResponse: ApiRecoverTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "MISSING",
      };

      const bucketS3Key = buildS3Key(
        mockRecoverTracingResponse.tenantId,
        mockRecoverTracingResponse.date,
        mockRecoverTracingResponse.tracingId,
        mockRecoverTracingResponse.version,
        mockAppCtx.correlationId,
      );

      vi.spyOn(operationsApiClient, "recoverTracing").mockResolvedValueOnce(
        mockRecoverTracingResponse,
      );

      vi.spyOn(fileManager, "writeObject").mockResolvedValueOnce();

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockRecoverTracingResponse.tracingId}/recover`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(response.status).toBe(200);
      expect(response.body.tracingId).toBe(
        mockRecoverTracingResponse.tracingId,
      );

      expect(fileManager.writeObject).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: originalFilename }),
        bucketS3Key,
      );

      expect(operationsApiClient.recoverTracing).toHaveBeenCalledWith(
        undefined,
        {
          params: { tracingId: mockRecoverTracingResponse.tracingId },
          headers: {
            ...correlationIdToHeader(mockAppCtx.correlationId),
            ...purposeIdToHeader(mockAppCtx.authData.purposeId),
          },
        },
      );
    });

    it("should return a 409 status error if the tracing to update does not have a state ERROR or MISSING", async () => {
      const mockFile = Buffer.from("test file content");
      const mockRecoverTracingResponse: ApiRecoverTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "MISSING",
      };

      const apiErrorMock = makeApiProblem(
        tracingRecoverCannotBeUpdated(mockRecoverTracingResponse.tracingId),
        errorMapper,
        genericLogger,
      );

      const operationsApiClientError =
        mockOperationsApiClientError(apiErrorMock);

      vi.spyOn(operationsApiClient, "recoverTracing").mockRejectedValueOnce(
        operationsApiClientError,
      );

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockRecoverTracingResponse.tracingId}/recover`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(response.text).contains(apiErrorMock.detail);
      expect(response.status).toBe(409);
    });

    it("should return a 404 status error if the tracing cannot be found", async () => {
      const mockFile = Buffer.from("test file content");
      const mockRecoverTracingResponse: ApiRecoverTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "ERROR",
      };

      const apiErrorMock = makeApiProblem(
        tracingNotFound(mockRecoverTracingResponse.tracingId),
        errorMapper,
        genericLogger,
      );

      const operationsApiClientError =
        mockOperationsApiClientError(apiErrorMock);

      vi.spyOn(operationsApiClient, "recoverTracing").mockRejectedValueOnce(
        operationsApiClientError,
      );

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockRecoverTracingResponse.tracingId}/recover`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(response.text).contains(apiErrorMock.detail);
      expect(response.status).toBe(404);
    });

    it("should return a 500 status error if the tracing upload to the bucket fails, then call cancelTracingStateAndVersion API with 204 response status", async () => {
      const mockFile = Buffer.from("test file content");
      const mockRecoverTracingResponse: ApiRecoverTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "ERROR",
      };

      const bucketS3Key = buildS3Key(
        mockRecoverTracingResponse.tenantId,
        mockRecoverTracingResponse.date,
        mockRecoverTracingResponse.tracingId,
        mockRecoverTracingResponse.version,
        mockAppCtx.correlationId,
      );

      vi.spyOn(operationsApiClient, "recoverTracing").mockResolvedValueOnce(
        mockRecoverTracingResponse,
      );

      const mockSQSError =
        "The SQS service is currently unavailable. Please try again later.";

      const writeObjectS3BucketErrorMock = writeObjectS3BucketError(
        `Unable to write tracing with pathName: ${bucketS3Key}. Details: ${mockSQSError}`,
      );

      vi.spyOn(fileManager, "writeObject").mockRejectedValueOnce(
        writeObjectS3BucketErrorMock,
      );

      vi.spyOn(
        operationsApiClient,
        "cancelTracingStateAndVersion",
      ).mockResolvedValueOnce();

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockRecoverTracingResponse.tracingId}/recover`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(fileManager.writeObject).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: originalFilename }),
        bucketS3Key,
      );

      expect(
        operationsApiClient.cancelTracingStateAndVersion,
      ).toHaveBeenCalledWith(
        {
          state: mockRecoverTracingResponse.previousState,
          version: mockRecoverTracingResponse.version - 1,
        },
        {
          params: {
            tracingId: mockRecoverTracingResponse.tracingId,
          },
          headers: {
            ...correlationIdToHeader(mockAppCtx.correlationId),
            ...purposeIdToHeader(mockAppCtx.authData.purposeId),
          },
        },
      );

      expect(response.text).contains("Unexpected error");
      expect(response.status).toBe(500);
    });

    it("should return a 500 status error if the tracing upload to the bucket fails, then call cancelTracingStateAndVersion API with 500 response status", async () => {
      const mockFile = Buffer.from("test file content");
      const mockRecoverTracingResponse: ApiRecoverTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "ERROR",
      };

      const bucketS3Key = buildS3Key(
        mockRecoverTracingResponse.tenantId,
        mockRecoverTracingResponse.date,
        mockRecoverTracingResponse.tracingId,
        mockRecoverTracingResponse.version,
        mockAppCtx.correlationId,
      );

      vi.spyOn(operationsApiClient, "recoverTracing").mockResolvedValueOnce(
        mockRecoverTracingResponse,
      );

      const mockSQSError =
        "The SQS service is currently unavailable. Please try again later.";

      const writeObjectS3BucketErrorMock = writeObjectS3BucketError(
        `Unable to write tracing with pathName: ${bucketS3Key}. Details: ${mockSQSError}`,
      );

      vi.spyOn(fileManager, "writeObject").mockRejectedValueOnce(
        writeObjectS3BucketErrorMock,
      );

      const errorMessage = `Tracing with Id ${mockRecoverTracingResponse.tracingId} cannot be cancelled. The state of tracing must be PENDING.`;
      const apiErrorMock = makeApiProblem(
        genericInternalError(errorMessage),
        errorMapper,
        genericLogger,
      );

      const operationsApiClientError =
        mockOperationsApiClientError(apiErrorMock);

      vi.spyOn(
        operationsApiClient,
        "cancelTracingStateAndVersion",
      ).mockRejectedValueOnce(operationsApiClientError);

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockRecoverTracingResponse.tracingId}/recover`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(fileManager.writeObject).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: originalFilename }),
        bucketS3Key,
      );

      expect(
        operationsApiClient.cancelTracingStateAndVersion,
      ).toHaveBeenCalledWith(
        {
          state: mockRecoverTracingResponse.previousState,
          version: mockRecoverTracingResponse.version - 1,
        },
        {
          params: {
            tracingId: mockRecoverTracingResponse.tracingId,
          },
          headers: {
            ...correlationIdToHeader(mockAppCtx.correlationId),
            ...purposeIdToHeader(mockAppCtx.authData.purposeId),
          },
        },
      );

      expect(response.text).contains("Unexpected error");
      expect(response.status).toBe(500);
    });
  });

  describe("replaceTracing", () => {
    it("should upload to bucket a revisited tracing file, update relative db existing tracing version and state to 'PENDING'", async () => {
      const mockFile = Buffer.from("test file content");
      const mockReplaceTracingResponse: ApiRecoverTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "COMPLETED",
      };

      const bucketS3Key = buildS3Key(
        mockReplaceTracingResponse.tenantId,
        mockReplaceTracingResponse.date,
        mockReplaceTracingResponse.tracingId,
        mockReplaceTracingResponse.version,
        mockAppCtx.correlationId,
      );

      vi.spyOn(operationsApiClient, "replaceTracing").mockResolvedValueOnce(
        mockReplaceTracingResponse,
      );

      vi.spyOn(fileManager, "writeObject").mockResolvedValueOnce();

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockReplaceTracingResponse.tracingId}/replace`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(response.status).toBe(200);
      expect(response.body.tracingId).toBe(
        mockReplaceTracingResponse.tracingId,
      );
      expect(fileManager.writeObject).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: originalFilename }),
        bucketS3Key,
      );

      expect(operationsApiClient.replaceTracing).toHaveBeenCalledWith(
        undefined,
        {
          params: { tracingId: mockReplaceTracingResponse.tracingId },
          headers: {
            ...correlationIdToHeader(mockAppCtx.correlationId),
            ...purposeIdToHeader(mockAppCtx.authData.purposeId),
          },
        },
      );
    });

    it("should return a 409 status error if the tracing to update does not have a state COMPLETED", async () => {
      const mockFile = Buffer.from("test file content");
      const mockReplaceTracingResponse: ApiRecoverTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "COMPLETED",
      };

      const apiErrorMock = makeApiProblem(
        tracingReplaceCannotBeUpdated(mockReplaceTracingResponse.tracingId),
        errorMapper,
        genericLogger,
      );

      const operationsApiClientError =
        mockOperationsApiClientError(apiErrorMock);

      vi.spyOn(operationsApiClient, "replaceTracing").mockRejectedValueOnce(
        operationsApiClientError,
      );

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockReplaceTracingResponse.tracingId}/replace`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(response.text).contains(apiErrorMock.detail);
      expect(response.status).toBe(409);
    });

    it("should return a 404 status error if the tracing cannot be found", async () => {
      const mockFile = Buffer.from("test file content");
      const mockReplaceTracingResponse: ApiReplaceTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "ERROR",
      };

      const apiErrorMock = makeApiProblem(
        tracingNotFound(mockReplaceTracingResponse.tracingId),
        errorMapper,
        genericLogger,
      );

      const operationsApiClientError =
        mockOperationsApiClientError(apiErrorMock);

      vi.spyOn(operationsApiClient, "replaceTracing").mockRejectedValueOnce(
        operationsApiClientError,
      );

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockReplaceTracingResponse.tracingId}/replace`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(response.text).contains(apiErrorMock.detail);
      expect(response.status).toBe(404);
    });

    it("should return a 500 status error if the tracing upload to the bucket fails, then call cancelTracingStateAndVersion API with 204 response status", async () => {
      const mockFile = Buffer.from("test file content");
      const mockReplaceTracingResponse: ApiReplaceTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "ERROR",
      };

      const bucketS3Key = buildS3Key(
        mockReplaceTracingResponse.tenantId,
        mockReplaceTracingResponse.date,
        mockReplaceTracingResponse.tracingId,
        mockReplaceTracingResponse.version,
        mockAppCtx.correlationId,
      );

      vi.spyOn(operationsApiClient, "replaceTracing").mockResolvedValueOnce(
        mockReplaceTracingResponse,
      );

      const mockSQSError =
        "The SQS service is currently unavailable. Please try again later.";

      const writeObjectS3BucketErrorMock = writeObjectS3BucketError(
        `Unable to write tracing with pathName: ${bucketS3Key}. Details: ${mockSQSError}`,
      );

      vi.spyOn(fileManager, "writeObject").mockRejectedValueOnce(
        writeObjectS3BucketErrorMock,
      );

      vi.spyOn(
        operationsApiClient,
        "cancelTracingStateAndVersion",
      ).mockResolvedValueOnce();

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockReplaceTracingResponse.tracingId}/replace`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(fileManager.writeObject).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: originalFilename }),
        bucketS3Key,
      );

      expect(
        operationsApiClient.cancelTracingStateAndVersion,
      ).toHaveBeenCalledWith(
        {
          state: mockReplaceTracingResponse.previousState,
          version: mockReplaceTracingResponse.version - 1,
        },
        {
          params: { tracingId: mockReplaceTracingResponse.tracingId },
          headers: {
            ...correlationIdToHeader(mockAppCtx.correlationId),
            ...purposeIdToHeader(mockAppCtx.authData.purposeId),
          },
        },
      );

      expect(response.text).contains("Unexpected error");
      expect(response.status).toBe(500);
    });

    it("should return a 500 status error if the tracing upload to the bucket fails, then call cancelTracingStateAndVersion API with 500 response status", async () => {
      const mockFile = Buffer.from("test file content");
      const mockReplaceTracingResponse: ApiReplaceTracingResponse = {
        tracingId: generateId(),
        tenantId: generateId(),
        date: "2024-06-11",
        version: 2,
        previousState: "ERROR",
      };

      const bucketS3Key = buildS3Key(
        mockReplaceTracingResponse.tenantId,
        mockReplaceTracingResponse.date,
        mockReplaceTracingResponse.tracingId,
        mockReplaceTracingResponse.version,
        mockAppCtx.correlationId,
      );

      vi.spyOn(operationsApiClient, "replaceTracing").mockResolvedValueOnce(
        mockReplaceTracingResponse,
      );

      const mockSQSError =
        "The SQS service is currently unavailable. Please try again later.";

      const writeObjectS3BucketErrorMock = writeObjectS3BucketError(
        `Unable to write tracing with pathName: ${bucketS3Key}. Details: ${mockSQSError}`,
      );

      vi.spyOn(fileManager, "writeObject").mockRejectedValueOnce(
        writeObjectS3BucketErrorMock,
      );

      const errorMessage = `Tracing with Id ${mockReplaceTracingResponse.tracingId} cannot be cancelled. The state of tracing must be PENDING.`;
      const apiErrorMock = makeApiProblem(
        genericInternalError(errorMessage),
        errorMapper,
        genericLogger,
      );

      const operationsApiClientError =
        mockOperationsApiClientError(apiErrorMock);

      vi.spyOn(
        operationsApiClient,
        "cancelTracingStateAndVersion",
      ).mockRejectedValueOnce(operationsApiClientError);

      const originalFilename: string = "testfile.txt";
      const response = await tracingApiClient
        .post(`/tracings/${mockReplaceTracingResponse.tracingId}/replace`)
        .attach("file", mockFile, originalFilename)
        .set("Authorization", `Bearer test-token`)
        .set("Content-Type", "multipart/form-data");

      expect(fileManager.writeObject).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: originalFilename }),
        bucketS3Key,
      );

      expect(
        operationsApiClient.cancelTracingStateAndVersion,
      ).toHaveBeenCalledWith(
        {
          state: mockReplaceTracingResponse.previousState,
          version: mockReplaceTracingResponse.version - 1,
        },
        {
          params: { tracingId: mockReplaceTracingResponse.tracingId },
          headers: {
            ...correlationIdToHeader(mockAppCtx.correlationId),
            ...purposeIdToHeader(mockAppCtx.authData.purposeId),
          },
        },
      );

      expect(response.text).contains("Unexpected error");
      expect(response.status).toBe(500);
    });
  });
});
