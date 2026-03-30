import { decodeSQSEventMessageError } from "./errors.js";
import { SQS } from "pagopa-interop-tracing-commons";
import {
  TracingFromS3KeyPathDto,
  S3BodySchema,
  parseTracingS3Key,
} from "pagopa-interop-tracing-models";

export function decodeSQSEventMessage(
  message: SQS.Message,
): TracingFromS3KeyPathDto {
  try {
    if (!message.Body) {
      throw new Error("Message body is undefined");
    }

    const s3Body: S3BodySchema = JSON.parse(message.Body);
    if (!s3Body.Records.length) {
      throw new Error("S3Body doesn't contain records");
    }

    const key = s3Body.Records[0].s3.object.key;

    return parseTracingS3Key(key);
  } catch (error: unknown) {
    throw decodeSQSEventMessageError(
      `Failed to decode SQS S3 event message with MessageId: ${message.MessageId}. Details: ${error}`,
    );
  }
}
