import { describe, expect, it, vi, afterAll } from "vitest";
import { sqsMessages } from "./sqsMessages.js";
import { processPurposeErrorMessage } from "../src/messagesHandler.js";
import {
  AppContext,
  SQS,
  WithSQSMessageId,
} from "pagopa-interop-tracing-commons";
import {
  decodeSQSMessageCorrelationId,
  decodeSQSPurposeErrorMessage,
} from "../src/model/models.js";
import {
  CorrelationId,
  InternalError,
  UpdateTracingStateDto,
  tracingState,
  unsafeBrandId,
} from "pagopa-interop-tracing-models";
import { ErrorCodes } from "../src/model/domain/errors.js";
import { v4 as uuidv4 } from "uuid";
import { config } from "../src/utilities/config.js";

describe("Consumer processing error queue test", () => {
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

  it("given valid message with updateTracingState=false, method should call savePurposeError only", async () => {
    const validMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.savePurposeError.valid),
      MessageAttributes: correlationIdMessageAttribute,
    };

    const attributes = decodeSQSMessageCorrelationId(validMessage);
    const ctx: WithSQSMessageId<AppContext> = {
      serviceName: config.applicationName,
      correlationId: unsafeBrandId<CorrelationId>(attributes.correlationId),
      messageId: validMessage.MessageId,
    };

    expect(async () => {
      await processPurposeErrorMessage(mockOperationsService)(validMessage);
    }).not.toThrowError();

    expect(mockOperationsService.savePurposeError).toHaveBeenCalledWith(
      decodeSQSPurposeErrorMessage(validMessage),
      ctx,
    );

    expect(mockOperationsService.updateTracingState).not.toHaveBeenCalled();
  });

  it("given valid message with updateTracingState=true, should call updateTracingState only", async () => {
    const message: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(
        sqsMessages.savePurposeError.validWithTacingUpdateStateTrue,
      ),
      MessageAttributes: correlationIdMessageAttribute,
    };

    const attributes = decodeSQSMessageCorrelationId(message);

    const ctx: WithSQSMessageId<AppContext> = {
      serviceName: config.applicationName,
      correlationId: unsafeBrandId<CorrelationId>(attributes.correlationId),
      messageId: message.MessageId,
    };

    const purposeErrorPayload = decodeSQSPurposeErrorMessage(message);

    const updateTracingStatePayload: UpdateTracingStateDto = {
      tracingId: purposeErrorPayload.tracingId,
      version: purposeErrorPayload.version,
      state: tracingState.error,
    };

    await processPurposeErrorMessage(mockOperationsService)(message);

    expect(mockOperationsService.updateTracingState).toHaveBeenCalledWith(
      updateTracingStatePayload,
      ctx,
    );

    expect(mockOperationsService.savePurposeError).not.toHaveBeenCalled();
  });

  it("given invalid message, method should throw an error", async () => {
    const invalidMessage = {};

    try {
      await processPurposeErrorMessage(mockOperationsService)(invalidMessage);
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
      Body: JSON.stringify(sqsMessages.savePurposeError.empty),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processPurposeErrorMessage(mockOperationsService)(emptyMessage);
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockOperationsService.savePurposeError).not.toBeCalled();
    }
  });

  it("when tracingId field is missing, method should throw an error", async () => {
    const missingEserviceRecordId: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.savePurposeError.missingTracingId),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processPurposeErrorMessage(mockOperationsService)(
        missingEserviceRecordId,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockOperationsService.savePurposeError).not.toBeCalled();
    }
  });

  it("when message is bad formatted, method should throw an error", async () => {
    const badFormattedMessage: SQS.Message = {
      MessageId: "12345",
      ReceiptHandle: "receipt_handle_id",
      Body: JSON.stringify(sqsMessages.savePurposeError.badFormatted),
      MessageAttributes: correlationIdMessageAttribute,
    };

    try {
      await processPurposeErrorMessage(mockOperationsService)(
        badFormattedMessage,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(InternalError);
      expect((error as InternalError<ErrorCodes>).code).toBe(
        "decodeSQSMessageError",
      );
      expect(mockOperationsService.savePurposeError).not.toBeCalled();
    }
  });
});
