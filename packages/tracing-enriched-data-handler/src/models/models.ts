import { decodeSqsMessageError } from "./errors.js";
import { SQS } from "pagopa-interop-tracing-commons";
import { TracingFromCsv } from "./messages.js";

export function decodeSqsMessage(message: SQS.Message): TracingFromCsv {
  try {
    const messageBody = message.Body;

    if (!messageBody) {
      throw "Message body is undefined";
    }

    const s3Body = JSON.parse(messageBody);

    if (!s3Body.Records.length) {
      throw `S3Body doesn't contain records`;
    }

    const key = s3Body.Records[0].s3.object.key;

    const keyParts = key.split("/");

    const result: Partial<{
      [K in keyof TracingFromCsv]: string | undefined;
    }> = {};

    keyParts.forEach((part: string) => {
      const decodedPart = decodeURIComponent(part);
      const [key, value] = decodedPart.split("=");
      // eslint-disable-next-line no-prototype-builtins
      if (TracingFromCsv.shape.hasOwnProperty(key)) {
        result[key as keyof TracingFromCsv] = value;
      }
    });

    const parsedResult = TracingFromCsv.safeParse(result);

    if (parsedResult.success) {
      return parsedResult.data;
    } else {
      throw `error parsing s3Key ${JSON.stringify(parsedResult.error)}`;
    }
  } catch (error: unknown) {
    throw decodeSqsMessageError(
      `Failed to decode SQS s3 event message with MessageId: ${message.MessageId}. Error details: ${error}`,
    );
  }
}
