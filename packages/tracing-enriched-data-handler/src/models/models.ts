import { decodeSqsMessageError } from "./errors.js";
import { SQS } from "pagopa-interop-tracing-commons";

import {
  TracingFromS3KeyPathDto,
  S3BodySchema,
} from "pagopa-interop-tracing-models";

export function decodeSqsMessage(
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

    const parsedResult = TracingFromS3KeyPathDto.safeParse(parseS3Key(key));
    if (parsedResult.success) {
      return parsedResult.data;
    } else {
      throw new Error(
        `Error parsing S3 key: ${JSON.stringify(parsedResult.error)}`,
      );
    }
  } catch (error: unknown) {
    throw decodeSqsMessageError(
      `Failed to decode SQS s3 event message with MessageId: ${message.MessageId}. Details: ${error}`,
    );
  }
}

function parseS3Key(key: string): Partial<TracingFromS3KeyPathDto> {
  return key
    .split("/")
    .map((part) => {
      const [k, v] = decodeURIComponent(part).split("=");
      return { [k]: v };
    })
    .reduce((acc, obj) => ({ ...acc, ...obj }), {});
}
