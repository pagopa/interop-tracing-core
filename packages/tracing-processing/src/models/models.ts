import { decodeSQSMessageError } from "./errors.js";
import { SQS } from "pagopa-interop-tracing-commons";
import { TracingFromS3Path } from "./tracing.js";
import { S3BodySchema } from "pagopa-interop-tracing-models";

export function decodeSQSMessage(message: SQS.Message): TracingFromS3Path {
  try {
    const messageBody = message.Body;
    if (!messageBody) {
      throw "Message body is undefined";
    }

    const s3Body: S3BodySchema = JSON.parse(messageBody);
    if (!s3Body.Records.length) {
      throw `S3Body doesn't contain records`;
    }

    const key = s3Body.Records[0].s3.object.key;

    const keyParts = key.split("/");

    const result: Partial<{
      [K in keyof TracingFromS3Path]: string | undefined;
    }> = {};

    keyParts.forEach((part) => {
      const decodedPart = decodeURIComponent(part);
      const [key, value] = decodedPart.split("=");
      // eslint-disable-next-line no-prototype-builtins
      if (TracingFromS3Path.shape.hasOwnProperty(key)) {
        result[key as keyof TracingFromS3Path] = value;
      }
    });

    const parsedResult = TracingFromS3Path.safeParse(result);

    if (parsedResult.success) {
      return parsedResult.data;
    } else {
      throw `error parsing s3Key ${JSON.stringify(parsedResult.error)}`;
    }
  } catch (error: unknown) {
    throw decodeSQSMessageError(
      `Failed to decode SQS s3 event message with MessageId: ${message.MessageId}. Error details: ${error}`,
    );
  }
}
