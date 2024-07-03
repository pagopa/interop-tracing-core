import { S3BodySchema } from "pagopa-interop-tracing-models";
import { EnrichedPurpose, TracingContent, TracingRecords } from "./messages.js";
import csv from "csv-parser";
import { Readable } from "stream";
import { decodeSQSMessageError } from "./errors.js";
import { SQS } from "pagopa-interop-tracing-commons";

export function decodeSqsMessage(message: SQS.Message): TracingContent {
  try {
    const messageBody = message.Body;

    if (!messageBody) {
      throw "Message body is undefined";
    }
    const s3Body = S3BodySchema.safeParse(JSON.parse(messageBody));
    if (s3Body.error) {
      throw `error parsing s3Body ${s3Body.error}`;
    }

    const key = s3Body.data.Records[0].s3.object.key;

    const keyParts = key.split("/");

    const result: Partial<{ [K in keyof TracingContent]: string | undefined }> =
      {};

    keyParts.forEach((part) => {
      const decodedPart = decodeURIComponent(part);
      const [key, value] = decodedPart.split("=");
      // eslint-disable-next-line no-prototype-builtins
      if (TracingContent.shape.hasOwnProperty(key)) {
        result[key as keyof TracingContent] = value;
      }
    });

    const parsedResult = TracingContent.safeParse(result);

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

export async function parseCSV(stream: Readable): Promise<TracingRecords> {
  const results: TracingRecords = [];
  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

export function generateCSV(records: EnrichedPurpose[]): string {
  const header = [
    "date",
    "purpose_id",
    "status",
    "requests_count",
    "purpose_name",
    "eservice_id",
    "consumer_id",
    "producer_id",
    "origin",
    "external_id",
    "purpose_title",
    "producer_name",
    "consumer_name",
  ].join(",");

  const rows = records
    .map((record) => {
      return [
        record.date,
        record.purpose_id,
        record.status,
        record.requests_count,
        record.purposeName,
        record.eservice.eservice_id,
        record.eservice.consumer_id,
        record.eservice.producer_id,
        record.eservice.origin,
        record.eservice.external_id,
        record.eservice.purpose_title,
        record.eservice.producer_name,
        record.eservice.consumer_name,
      ]
        .map((field) => (field === null || field === undefined ? "" : field))
        .join(",");
    })
    .join("\n");

  return `${header}\n${rows}`;
}
