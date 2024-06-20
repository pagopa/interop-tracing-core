import {
  ApiSubmitTracingResponse,
  createApiClient,
} from "pagopa-interop-tracing-operations-client";
import {
  generateId,
  tracingAlreadyExists,
} from "pagopa-interop-tracing-models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../src/utilities/config.js";
import {
  ExpressContext,
  contextMiddleware,
  logger,
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
import { ApiExternal } from "../src/model/types.js";
import { configureMulterEndpoints } from "../src/routers/config/multer.js";
import {
  correlationIdToHeader,
  purposeIdToHeader,
} from "../src/model/headers.js";

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
): string => `${tenantId}/${date}/${tracingId}/${version}/${tracingId}`;

describe("Tracing Router", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("submitTracing should upload to bucket the submitted tracing file, update database with related record and return 200 status", async () => {
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

  it("submitTracing should return a 400 status bad request error if a tracing already exists for the provided date", async () => {
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

    const operationsApiClientError = mockOperationsApiClientError(errorApiMock);

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
