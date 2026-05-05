import { z } from "zod";
import {
  TracingCorrelationIdDto,
  ProcessingResultDto,
} from "pagopa-interop-tracing-models";
import { SQS } from "pagopa-interop-tracing-commons";
import {
  decodeSQSMessageCorrelationIdError,
  decodeSQSMessageError,
} from "./domain/errors.js";

const ProcessingResultMessageSchema = z.object({
  value: z.preprocess(
    (v) => (v != null ? JSON.parse(v.toString()) : null),
    ProcessingResultDto,
  ),
});

export function decodeSQSProcessingResultMessage(
  message: SQS.Message,
): ProcessingResultDto {
  const parsed = ProcessingResultMessageSchema.safeParse({
    value: message.Body,
  });
  if (!parsed.success) {
    throw decodeSQSMessageError(
      `Failed to decode SQS ProcessingResult message with MessageId: ${
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
