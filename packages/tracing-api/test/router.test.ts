import {
  ApiGetTracingsQuery,
  createApiClient,
} from "pagopa-interop-tracing-operations-client";
import { tracingState } from "pagopa-interop-tracing-models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../src/utilities/config.js";
import { zodiosCtx } from "pagopa-interop-tracing-commons";
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

const operationsApiClient = createApiClient(config.operationsBaseUrl);
const operationsService: OperationsService =
  operationsServiceBuilder(operationsApiClient);

const s3client: S3Client = new S3Client({ region: config.awsRegion });
const bucketService: BucketService = bucketServiceBuilder(s3client);

const app = zodiosCtx.app();
app.use(tracingRouter(zodiosCtx)(operationsService, bucketService));
const tracingApiClient = supertest(app);

describe("Tracing Router", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("the list of tracings has been retrieved with empty results", async () => {
    const getTracings: ApiGetTracingsQuery = {
      offset: 0,
      limit: 2,
      states: [tracingState.error, tracingState.missing],
    };

    vi.spyOn(operationsApiClient, "getTracings").mockResolvedValue({
      results: [],
      totalCount: 0,
    });

    const response = await tracingApiClient
      .get(`/tracings`)
      .set("Content-Type", "application/json")
      .query(getTracings);

    expect(response.status).toBe(200);
  });
});
