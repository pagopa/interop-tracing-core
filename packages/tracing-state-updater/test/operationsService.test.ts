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
  decodeSQSMessageCorrelationId,
  decodeSQSPurposeErrorMessage,
  decodeSQSUpdateTracingStateMessage,
} from "../src/model/models.js";
import { InternalError } from "pagopa-interop-tracing-models";
import {
  ErrorCodes,
  errorProcessingSavePurposeError,
  errorProcessingUpdateTracingState,
} from "../src/model/domain/errors.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, WithSQSMessageId } from "pagopa-interop-tracing-commons";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Operations service test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const correlationIdMessageAttribute = {
    correlationId: {
      DataType: "String",
      StringValue: uuidv4(),
    },
  };

  describe("savePurposeError", () => {
    it("save a new purpose error should return a successfully response", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.savePurposeError.valid),
        MessageAttributes: correlationIdMessageAttribute,
      };

      const decodedMessage = decodeSQSPurposeErrorMessage(validMessage);
      const attributes = decodeSQSMessageCorrelationId(validMessage);
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: attributes.correlationId,
        messageId: validMessage.MessageId,
      };

      vi.spyOn(apiClient, "savePurposeError").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await operationsService.savePurposeError(decodedMessage, ctx),
      ).not.toThrowError();
    });

    it("save a new purpose error should return an exception errorProcessingSavePurposeError", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.savePurposeError.valid),
        MessageAttributes: correlationIdMessageAttribute,
      };

      const decodedMessage = decodeSQSPurposeErrorMessage(validMessage);
      const attributes = decodeSQSMessageCorrelationId(validMessage);
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: attributes.correlationId,
        messageId: validMessage.MessageId,
      };

      const apiClientError = mockApiClientError(500, "Internal server error");
      errorProcessingSavePurposeError(
        `Error saving purpose error for tracingId: ${decodedMessage.tracingId}. Details: ${apiClientError}`,
      );

      vi.spyOn(apiClient, "savePurposeError").mockRejectedValueOnce(
        apiClientError,
      );

      try {
        await operationsService.savePurposeError(decodedMessage, ctx);
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
        MessageAttributes: correlationIdMessageAttribute,
      };

      const decodedMessage = decodeSQSUpdateTracingStateMessage(validMessage);
      const attributes = decodeSQSMessageCorrelationId(validMessage);
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: attributes.correlationId,
        messageId: validMessage.MessageId,
      };

      vi.spyOn(apiClient, "updateTracingState").mockResolvedValueOnce(
        undefined,
      );

      expect(
        async () =>
          await operationsService.updateTracingState(decodedMessage, ctx),
      ).not.toThrowError();
    });

    it("update tracing state should return an exception errorProcessingUpdateTracingState", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.updateTracingState.valid),
        MessageAttributes: correlationIdMessageAttribute,
      };

      const decodedMessage = decodeSQSUpdateTracingStateMessage(validMessage);
      const attributes = decodeSQSMessageCorrelationId(validMessage);
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: attributes.correlationId,
        messageId: validMessage.MessageId,
      };

      const apiClientError = mockApiClientError(500, "Internal server error");
      errorProcessingUpdateTracingState(
        `Error updating tracingId: ${decodedMessage.tracingId}. Details: ${apiClientError}`,
      );

      vi.spyOn(apiClient, "updateTracingState").mockRejectedValueOnce(
        apiClientError,
      );

      try {
        await operationsService.updateTracingState(decodedMessage, ctx);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorProcessingUpdateTracingState",
        );
      }
    });
  });

  describe("triggerCopy", () => {
    it("it should return a succesfully response", () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.updateTracingState.replacing),
        MessageAttributes: correlationIdMessageAttribute,
      };

      const decodedMessage = decodeSQSUpdateTracingStateMessage(validMessage);
      const attributes = decodeSQSMessageCorrelationId(validMessage);
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: attributes.correlationId,
        messageId: validMessage.MessageId,
      };

      vi.spyOn(apiClient, "triggerCopy").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await operationsService.triggerS3Copy(decodedMessage.tracingId, ctx),
      ).not.toThrowError();
    });

    it("it should return an exception errorProcessingUpdateTracingState", async () => {
      const validMessage: SQS.Message = {
        MessageId: "12345",
        ReceiptHandle: "receipt_handle_id",
        Body: JSON.stringify(sqsMessages.updateTracingState.replacing),
        MessageAttributes: correlationIdMessageAttribute,
      };

      const decodedMessage = decodeSQSUpdateTracingStateMessage(validMessage);
      const attributes = decodeSQSMessageCorrelationId(validMessage);
      const ctx: WithSQSMessageId<AppContext> = {
        serviceName: config.applicationName,
        correlationId: attributes.correlationId,
        messageId: validMessage.MessageId,
      };

      vi.spyOn(apiClient, "triggerCopy").mockRejectedValue(undefined);

      try {
        await operationsService.triggerS3Copy(decodedMessage.tracingId, ctx);
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorProcessingUpdateTracingState",
        );
      }
    });
  });
});
