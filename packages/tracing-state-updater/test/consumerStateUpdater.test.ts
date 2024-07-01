import { describe, expect, it, vi, afterAll } from "vitest";
import { sqsMessages } from "./sqsMessages.js";
import { processTracingStateMessage } from "../src/messagesHandler.js";
import { SQS } from "pagopa-interop-tracing-commons";
import { decodeSQSUpdateTracingStateMessage } from "../src/model/models.js";
import { InternalError } from "pagopa-interop-tracing-models";
import { ErrorCodes } from "../src/model/domain/errors.js";

describe("Consumer state updater queue test", () => {
  const mockOperationsService = {
    savePurposeError: vi.fn().mockResolvedValue(undefined),
    updateTracingState: vi.fn().mockResolvedValue(undefined),
  };

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("given valid message, method should call updateTracingState", async () => {
    const validMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.updateTracingState.valid),
    };

    expect(async () => {
      await processTracingStateMessage(mockOperationsService)(validMessage);
    }).not.toThrowError();

    expect(mockOperationsService.updateTracingState).toHaveBeenCalledWith(
      decodeSQSUpdateTracingStateMessage(validMessage),
    );
  });

  it("given invalid message, method should throw an error", async () => {
    const invalidMessage = {};

    try {
      await processTracingStateMessage(mockOperationsService)(invalidMessage);
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
    }
  });

  it("given empty message, method should throw an error", async () => {
    const emptyMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.savePurposeError.empty),
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
