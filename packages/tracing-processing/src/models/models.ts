import { logger } from "pagopa-interop-tracing-commons";
import {
  genericInternalError,
  S3BodySchema,
} from "pagopa-interop-tracing-models";
import { TracingContent, TracingRecords } from "./messages.js";
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

  return {
    date: keyParts[0],
    tenantId: keyParts[1],
    version: keyParts[2],
    correlationId: keyParts[3],
    tracingId: keyParts[4].replace(".csv", ""),
  };
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
