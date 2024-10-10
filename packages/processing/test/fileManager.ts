import { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { TracingRecordSchema } from "../src/models/db.js";
import { SdkStream } from "@aws-sdk/types";

export const mockBodyStream = (records: TracingRecordSchema[]): GetObjectCommandOutput => {
  const csvHeaders = "date,purpose_id,status,requests_count,rowNumber";
  const csvRows = records
    .map(
      (record) =>
        `${record.date},${record.purpose_id || record.purpose_id},${
          record.status || ""
        },${record.requests_count || ""},${record.rowNumber || ""}`,
    )
    .join("\n");

  const mockCsvData = `${csvHeaders}\n${csvRows}`; 
  
  const readable = new Readable();
  readable._read = () => {};
  readable.push(mockCsvData);
  readable.push(null);
  return {
    $metadata: {
      httpStatusCode: 200,
    },
    Body: readable as SdkStream<Readable>,
    ContentLength: mockCsvData.length,
    ContentType: "text/csv",
  };
};