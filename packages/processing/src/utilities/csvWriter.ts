import { PassThrough, Readable } from "stream";
import { EnrichedPurpose } from "../models/csv.js";

export class CsvWriter {
  private readonly csvStream = new PassThrough();
  private recordsCount = 0;
  private readonly tenantId: string;

  private readonly columns = [
    "tracingId",
    "submitterId",
    "date",
    "purposeId",
    "purposeName",
    "status",
    "token_id",
    "requestsCount",
    "eserviceId",
    "consumerId",
    "consumerOrigin",
    "consumerName",
    "consumerExternalId",
    "producerId",
    "producerName",
    "producerOrigin",
    "producerExternalId",
  ];

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.csvStream.write(this.columns.join(",") + "\n");
  }

  writeBatch(records: EnrichedPurpose[]): void {
    for (const record of records) {
      const row = [
        record.tracingId,
        this.tenantId,
        record.date,
        record.purposeId,
        record.purposeName,
        record.status,
        record.token_id,
        record.requestsCount,
        record.eserviceId,
        record.consumerId,
        record.consumerOrigin,
        record.consumerName,
        record.consumerExternalId,
        record.producerId,
        record.producerName,
        record.producerOrigin,
        record.producerExternalId,
      ]
        .map((field) => {
          if (field == null) return "";

          const value = String(field).replace(/"/g, '""');

          return /[",\n]/.test(value) ? `"${value}"` : value;
        })
        .join(",");

      this.csvStream.write(row + "\n");
      this.recordsCount++;
    }
  }

  hasRecords(): boolean {
    return this.recordsCount > 0;
  }

  getStream(): Readable {
    return this.csvStream;
  }

  close(): void {
    this.csvStream.end();
  }
}
