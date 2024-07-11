import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "./../src/utilities/config.js";
import { mockApiClientError } from "./utils.js";
import { sqsMessages } from "./sqsMessages.js";
import { SQS } from "../../commons/dist/sqs/index.js";
import {
  decodeSQSPurposeErrorMessage,
  decodeSQSUpdateTracingStateMessage,
} from "../src/model/models.js";
import { InternalError } from "pagopa-interop-tracing-models";
import {
  ErrorCodes,
  errorProcessingSavePurposeError,
  errorProcessingUpdateTracingState,
} from "../src/model/domain/errors.js";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Operations service test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  describe("savePurposeError", () => {
    it("save a new purpose error should return a successfully response", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.savePurposeError.valid),
      };

      const decodedMessage = decodeSQSPurposeErrorMessage(validMessage);

      vi.spyOn(apiClient, "savePurposeError").mockResolvedValueOnce(undefined);

      expect(
        async () => await operationsService.savePurposeError(decodedMessage),
      ).not.toThrowError();
    });

    it("save a new purpose error should return an exception errorProcessingSavePurposeError", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.savePurposeError.valid),
      };

      const decodedMessage = decodeSQSPurposeErrorMessage(validMessage);

      const apiClientError = mockApiClientError(500, "Internal server error");
      errorProcessingSavePurposeError(
        `Error saving purpose error for tracingId: ${decodedMessage.tracingId}. Details: ${apiClientError}`,
      );

      vi.spyOn(apiClient, "savePurposeError").mockRejectedValueOnce(
        apiClientError,
      );

      try {
        await operationsService.savePurposeError(decodedMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorProcessingSavePurposeError",
        );
      }
    });
  });

  describe("updateTracingState", () => {
    it("update tracing state should return a successfully response", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.updateTracingState.valid),
      };

      const decodedMessage = decodeSQSUpdateTracingStateMessage(validMessage);

      vi.spyOn(apiClient, "updateTracingState").mockResolvedValueOnce(
        undefined,
      );

      expect(
        async () => await operationsService.updateTracingState(decodedMessage),
      ).not.toThrowError();
    });

    it("update tracing state should return an exception errorProcessingUpdateTracingState", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.updateTracingState.valid),
      };

      const decodedMessage = decodeSQSUpdateTracingStateMessage(validMessage);

      const apiClientError = mockApiClientError(500, "Internal server error");
      errorProcessingUpdateTracingState(
        `Error updating tracingId: ${decodedMessage.tracingId}. Details: ${apiClientError}`,
      );

      vi.spyOn(apiClient, "updateTracingState").mockRejectedValueOnce(
        apiClientError,
      );

      try {
        await operationsService.updateTracingState(decodedMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorProcessingUpdateTracingState",
        );
      }
    });
  });
});
