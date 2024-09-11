import { describe, expect, it, vi, afterEach } from "vitest";
import { processTask } from "../src/processTask.js";
import { config } from "../src/utilities/config.js";
import { mockApiClientError } from "./utils.js";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import {
  ErrorCodes,
  errorDeletePurposesErrors,
} from "../src/model/domain/errors.js";
import { InternalError } from "pagopa-interop-tracing-models";

describe("Process task test", async () => {
  const apiClient = createApiClient(config.operationsBaseUrl);
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invoke processTask should execute successfully", async () => {
    vi.spyOn(apiClient, "deletePurposesErrors").mockResolvedValueOnce(
      undefined,
    );

    expect(async () => await processTask(operationsService)).not.toThrowError();
  });

  it("invoke processTask should throw error", async () => {
    const mockOperationsClientError = mockApiClientError(
      500,
      "Internal server error",
    );

    const mockGetTenantsWithMissingTracingsError = errorDeletePurposesErrors(
      `Error delete purposes errors. Details: ${mockOperationsClientError}`,
    );

    vi.spyOn(operationsService, "deletePurposesErrors").mockRejectedValueOnce(
      mockGetTenantsWithMissingTracingsError,
    );

    try {
      await processTask(operationsService);
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "errorDeletePurposesErrors",
      );
    }
  });
});
