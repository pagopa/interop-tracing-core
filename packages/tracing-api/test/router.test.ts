import {
  ApiGetTracingErrorsResponse,
  ApiGetTracingsResponse,
  ApiSubmitTracingResponse,
  createApiClient,
} from "pagopa-interop-tracing-operations-client";
import {
  PurposeId,
  TracingId,
  generateId,
  tracingAlreadyExists,
  tracingState,
} from "pagopa-interop-tracing-models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../src/utilities/config.js";
import {
  ExpressContext,
  contextMiddleware,
  logger,
  PurposeErrorCodes,
  zodiosCtx,
} from "pagopa-interop-tracing-commons";
import tracingRouter from "../src/routers/tracingRouter.js";
import supertest from "supertest";
import { S3Client } from "@aws-sdk/client-s3";
import {
  BucketService,
  bucketServiceBuilder,
} from "../src/services/bucketService.js";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { NextFunction, Response, Request } from "express";
import { mockOperationsApiClientError } from "./utils.js";
import { makeApiProblem } from "../src/model/domain/errors.js";
import { errorMapper } from "../src/utilities/errorMapper.js";
import { ZodiosApp } from "@zodios/express";
import {
  ApiExternal,
  ApiExternalGetTracingErrorsParams,
  ApiExternalGetTracingErrorsQuery,
  ApiExternalGetTracingsQuery,
} from "../src/model/types.js";
import { configureMulterEndpoints } from "../src/routers/config/multer.js";
import {
  correlationIdToHeader,
  purposeIdToHeader,
} from "../src/model/headers.js";
import { ISODateFormat } from "../src/model/dates.js";

const operationsApiClient = createApiClient(config.operationsBaseUrl);
const operationsService: OperationsService =
  operationsServiceBuilder(operationsApiClient);

const s3client: S3Client = new S3Client({ region: config.awsRegion });
const bucketService: BucketService = bucketServiceBuilder(s3client);

const app: ZodiosApp<ApiExternal, ExpressContext> = zodiosCtx.app();
app.use(contextMiddleware(config.applicationName));
configureMulterEndpoints(app);

const mockAppCtx = {
  requesterAuthData: {
    purposeId: generateId(),
  },
  correlationId: generateId(),
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
app.use(tracingRouter(zodiosCtx)(operationsService, bucketService));

const tracingApiClient = supertest(app);

interface RequestWithZodiosCtx extends Request {
  ctx: {
    requesterAuthData: {
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

      vi.spyOn(bucketService, "writeObject").mockResolvedValue();

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

      expect(bucketService.writeObject).toHaveBeenCalledWith(
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
            ...purposeIdToHeader(mockAppCtx.requesterAuthData.purposeId),
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
      const errorApiMock = makeApiProblem(
        tracingAlreadyExists(errorMessage),
        errorMapper,
        logger({}),
      );

      const operationsApiClientError =
        mockOperationsApiClientError(errorApiMock);

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
});
