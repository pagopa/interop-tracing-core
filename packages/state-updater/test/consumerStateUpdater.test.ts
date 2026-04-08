import { describe, expect, it, vi, afterAll } from "vitest";
import { sqsMessages } from "./sqsMessages.js";
import { processProcessingResultMessage } from "../src/messagesHandler.js";
import { SQS } from "pagopa-interop-tracing-commons";
import { decodeSQSProcessingResultMessage } from "../src/model/models.js";
import { InternalError } from "pagopa-interop-tracing-models";
import { ErrorCodes } from "../src/model/domain/errors.js";
import { v4 as uuidv4 } from "uuid";

describe("Consumer state updater queue test", () => {
  const mockTracingStoreService = {
    checkTracingVersion: vi.fn().mockResolvedValue(true),
    copyPurposeErrorsFromS3: vi.fn().mockResolvedValue(undefined),
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

  it("given valid completed message, method should call updateTracingState", async () => {
    const validMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.processingResult.validCompleted),
      MessageAttributes: correlationIdMessageAttribute,
    };

    await processProcessingResultMessage(mockTracingStoreService)(validMessage);

    expect(mockTracingStoreService.updateTracingState).toHaveBeenCalledWith(
      decodeSQSProcessingResultMessage(validMessage),
    );
  });

  it("given invalid message, method should throw an error", async () => {
    const invalidMessage = {};

    try {
      await processProcessingResultMessage(mockTracingStoreService)(
        invalidMessage as SQS.Message,
      );
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
      Body: JSON.stringify(sqsMessages.processingResult.empty),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processProcessingResultMessage(mockTracingStoreService)(
        emptyMessage,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockTracingStoreService.updateTracingState).not.toBeCalled();
    }
  });

  it("when tracingId field is missing, method should throw an error", async () => {
    const missingEserviceRecordId: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.processingResult.missingTracingId),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processProcessingResultMessage(mockTracingStoreService)(
        missingEserviceRecordId,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockTracingStoreService.updateTracingState).not.toBeCalled();
    }
  });

  it("when message is bad formatted, method should throw an error", async () => {
    const badFormattedMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.processingResult.badFormatted),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processProcessingResultMessage(mockTracingStoreService)(
        badFormattedMessage,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockTracingStoreService.updateTracingState).not.toBeCalled();
    }
  });
});
