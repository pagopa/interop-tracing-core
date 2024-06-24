import { logger } from "pagopa-interop-tracing-commons";
import {
  genericInternalError,
  S3BodySchema,
} from "pagopa-interop-tracing-models";
import { EnrichedPurpose, TracingContent, TracingRecords } from "./messages.js";
import csv from "csv-parser";
import { Readable } from "stream";

export function decodeSqsMessage(
  jsonStr: string | undefined,
): TracingContent | undefined {
  if (!jsonStr) {
    throw genericInternalError("Message body is undefined");
  }
  const s3Body = S3BodySchema.safeParse(JSON.parse(jsonStr));

  if (s3Body.error) {
    logger.error(`error parsing s3Body ${s3Body.error}`);
    return undefined;
  }

  const key = s3Body.data.Records[0].s3.object.key;
  const keyParts = key.split("/");

  const result: Partial<TracingContent> = {};

  keyParts.forEach((part) => {
    const [key, value] = part.split("=");
    if (TracingContent.shape.hasOwnProperty(key)) {
      result[key as keyof TracingContent] = value;
    }
  });

  const parsedResult = TracingContent.safeParse(result);
  if (parsedResult.success) {
    return parsedResult.data;
  } else {
    logger.error(`error parsing s3Key ${parsedResult.error.message}`);
    return undefined;
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
  const header = "date,purpose_id,status,requests_count,purposeName\n";
  const rows = records
    .map(
      (record) =>
        `${record.date},${record.purpose_id},${record.status},${record.requests_count},${record.purposeName}`,
    )
    .join("\n");
  return `${header}${rows}`;
}
