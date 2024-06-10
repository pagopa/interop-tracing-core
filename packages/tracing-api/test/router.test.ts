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

const operationsApiClient = createApiClient(config.operationsBaseUrl);
const app = zodiosCtx.app();
app.use(tracingRouter(zodiosCtx)(operationsApiClient));
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
