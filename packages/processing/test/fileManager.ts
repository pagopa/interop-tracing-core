import { Readable } from "stream";
import { TracingRecordSchema } from "../src/models/db.js";

export const mockBodyStream = (records: TracingRecordSchema[]): Readable => {
  const csvHeaders = "date,purpose_id,status,token_id,requests_count";
  const mockCsvData = [
    csvHeaders,
    ...records.map(
      (record) =>
        `${record.date},${record.purpose_id},${record.status},${record.token_id},${record.requests_count}`,
    ),
  ].join("\n");

  return Readable.from([mockCsvData]);
};
