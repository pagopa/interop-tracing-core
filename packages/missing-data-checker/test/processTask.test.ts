import { describe, expect, it, vi, afterEach } from "vitest";
import { processTask } from "../src/processTask.js";
import { config } from "../src/utilities/config.js";
import { mockApiClientError } from "./utils.js";
import {
  ApiGetTenantsWithMissingTracingsResponse,
  createApiClient,
} from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { v4 as uuidv4 } from "uuid";
import {
  ErrorCodes,
  errorGetTenantsWithMissingTracings,
} from "../src/model/domain/errors.js";
import { InternalError } from "pagopa-interop-tracing-models";

describe("Process task test", async () => {
  const apiClient = createApiClient(config.operationsBaseUrl);
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invoke processTask should call getTenantsWithMissingTracings 1 time and saveMissingTracing 2 times", async () => {
    const mockResponseGetTenantsWithMissingTracings: ApiGetTenantsWithMissingTracingsResponse =
      {
        results: [uuidv4(), uuidv4()],
        totalCount: 2,
      };

    vi.spyOn(apiClient, "getTenantsWithMissingTracings").mockResolvedValueOnce(
      mockResponseGetTenantsWithMissingTracings,
    );

    vi.spyOn(apiClient, "saveMissingTracing").mockResolvedValueOnce(undefined);

    await processTask(operationsService);

    await expect(apiClient.getTenantsWithMissingTracings).toHaveBeenCalledTimes(
      1,
    );
    await expect(apiClient.saveMissingTracing).toHaveBeenCalledTimes(2);
  });

  it("invoke processTask should throw an error when getTenantsWithMissingTracings returns a response error", async () => {
    const mockOperationsClientError = mockApiClientError(
      500,
      "Internal server error",
    );
    const mockGetTenantsWithMissingTracingsError =
      errorGetTenantsWithMissingTracings(
        `Error get tenants with missing tracings for date: "yyyy-MM-dd". Details: ${mockOperationsClientError}`,
      );

    vi.spyOn(
      operationsService,
      "getTenantsWithMissingTracings",
    ).mockRejectedValueOnce(mockGetTenantsWithMissingTracingsError);

    try {
      await processTask(operationsService);
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "errorGetTenantsWithMissingTracings",
      );
    }
  });
});
