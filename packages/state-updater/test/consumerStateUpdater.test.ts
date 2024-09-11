import { describe, expect, it, vi, afterAll } from "vitest";
import { sqsMessages } from "./sqsMessages.js";
import { processTracingStateMessage } from "../src/messagesHandler.js";
import {
  AppContext,
  SQS,
  WithSQSMessageId,
} from "pagopa-interop-tracing-commons";
import {
  decodeSQSMessageCorrelationId,
  decodeSQSUpdateTracingStateMessage,
} from "../src/model/models.js";
import { InternalError } from "pagopa-interop-tracing-models";
import { ErrorCodes } from "../src/model/domain/errors.js";
import { v4 as uuidv4 } from "uuid";
import { config } from "../src/utilities/config.js";

describe("Consumer state updater queue test", () => {
  const mockOperationsService = {
    savePurposeError: vi.fn().mockResolvedValue(undefined),
    updateTracingState: vi.fn().mockResolvedValue(undefined),
  };

  const correlationIdMessageAttribute = {
    correlationId: {
      DataType: "String",
      StringValue: uuidv4(),
    },
  };

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("given valid message, method should call updateTracingState", async () => {
    const validMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.updateTracingState.valid),
      MessageAttributes: correlationIdMessageAttribute,
    };

    const attributes = decodeSQSMessageCorrelationId(validMessage);
    const ctx: WithSQSMessageId<AppContext> = {
      serviceName: config.applicationName,
      correlationId: attributes.correlationId,
      messageId: validMessage.MessageId,
    };

    expect(async () => {
      await processTracingStateMessage(mockOperationsService)(validMessage);
    }).not.toThrowError();

    expect(mockOperationsService.updateTracingState).toHaveBeenCalledWith(
      decodeSQSUpdateTracingStateMessage(validMessage),
      ctx,
    );
  });

  it("given invalid message, method should throw an error", async () => {
    const invalidMessage = {};

    try {
      await processTracingStateMessage(mockOperationsService)(invalidMessage);
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageCorrelationIdError",
      );
    }
  });

  it("given empty message, method should throw an error", async () => {
    const emptyMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.updateTracingState.empty),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processTracingStateMessage(mockOperationsService)(emptyMessage);
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockOperationsService.updateTracingState).not.toBeCalled();
    }
  });

  it("when tracingId field is missing, method should throw an error", async () => {
    const missingEserviceRecordId: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.updateTracingState.missingTracingId),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processTracingStateMessage(mockOperationsService)(
        missingEserviceRecordId,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockOperationsService.updateTracingState).not.toBeCalled();
    }
  });

  it("when message is bad formatted, method should throw an error", async () => {
    const badFormattedMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.updateTracingState.badFormatted),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processTracingStateMessage(mockOperationsService)(
        badFormattedMessage,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockOperationsService.updateTracingState).not.toBeCalled();
    }
  });
});
