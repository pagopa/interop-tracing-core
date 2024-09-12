import { z } from "zod";
import {
  SavePurposeErrorDto,
  TracingCorrelationIdDto,
  UpdateTracingStateDto,
} from "pagopa-interop-tracing-models";
import { SQS } from "pagopa-interop-tracing-commons";
import {
  decodeSQSMessageCorrelationIdError,
  decodeSQSMessageError,
} from "./domain/errors.js";

const ProcessingErrorMessageSchema = z.object({
  value: z.preprocess(
    (v) => (v != null ? JSON.parse(v.toString()) : null),
    SavePurposeErrorDto,
  ),
});

const UpdateTracingStateMessageSchema = z.object({
  value: z.preprocess(
    (v) => (v != null ? JSON.parse(v.toString()) : null),
    UpdateTracingStateDto,
  ),
});

export function decodeSQSPurposeErrorMessage(
  message: SQS.Message,
): SavePurposeErrorDto {
  const parsed = ProcessingErrorMessageSchema.safeParse({
    value: message.Body,
  });

  if (!parsed.success) {
    throw decodeSQSMessageError(
      `Failed to decode SQS ProcessingError message with MessageId: ${
        message.MessageId
      }. Error details: ${JSON.stringify(parsed.error)}`,
    );
  }

  return parsed.data.value;
}

export function decodeSQSUpdateTracingStateMessage(
  message: SQS.Message,
): UpdateTracingStateDto {
  const parsed = UpdateTracingStateMessageSchema.safeParse({
    value: message.Body,
  });
  if (!parsed.success) {
    throw decodeSQSMessageError(
      `Failed to decode SQS UpdateTracingState message with MessageId: ${
        message.MessageId
      }. Error details: ${JSON.stringify(parsed.error)}`,
    );
  }

  return parsed.data.value;
}

const CorrelationIdAttributeSchema = z.object({
  value: z.preprocess(
    (v) => (v ? { correlationId: v.toString() } : null),
    TracingCorrelationIdDto,
  ),
});

export function decodeSQSMessageCorrelationId(
  message: SQS.Message,
): TracingCorrelationIdDto {
  const parsed = CorrelationIdAttributeSchema.safeParse({
    value: message.MessageAttributes?.correlationId.StringValue,
  });

  if (!parsed.success) {
    throw decodeSQSMessageCorrelationIdError(
      `Failed to decode SQS correlationId attribute message with MessageId: ${
        message.MessageId
      }. Error details: ${JSON.stringify(parsed.error)}`,
    );
  }

  return {
    correlationId: parsed.data.value.correlationId,
  };
}
