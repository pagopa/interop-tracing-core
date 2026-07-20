import { z } from "zod";
import { PurposeErrorSeverity } from "./purposeError.js";

export const EnrichedPurposeRow = z.object({
  id: z.string(),
  tracingId: z.string(),
  producerOrigin: z.string().optional(),
  producerExternalId: z.string().optional(),
  producerName: z.string().optional(),
  consumerId: z.string(),
  consumerExternalId: z.string().optional(),
  consumerOrigin: z.string().optional(),
  consumerName: z.string().optional(),
  purposeName: z.string(),
  date: z.string(),
  purposeId: z.string().uuid(),
  token_id: z.string().uuid(),
  status: z.coerce.number(),
  requestsCount: z.coerce.number(),
  rowNumber: z.number(),
  eserviceId: z.string(),
  producerId: z.string(),
});

export const EnrichedPurposeRowArray = z.array(EnrichedPurposeRow);

export type EnrichedPurposeRow = z.infer<typeof EnrichedPurposeRow>;
export type EnrichedPurposeRowArray = z.infer<typeof EnrichedPurposeRowArray>;

export const PurposeErrorRow = z.object({
  id: z.string().uuid(),
  tracingId: z.string().uuid(),
  version: z.coerce.number(),
  purposeId: z.string(),
  severity: PurposeErrorSeverity,
  errorCode: z.string(),
  message: z.string(),
  rowNumber: z.coerce.number(),
});

export type PurposeErrorRow = z.infer<typeof PurposeErrorRow>;

type CsvMappingValue = string | number | boolean | Date | null | undefined;
type CsvMapping<Row> = Record<string, (row: Row) => CsvMappingValue>;

export const createEnrichedCsvMapping = (
  submitterId: string,
): CsvMapping<EnrichedPurposeRow> => ({
  id: (row) => row.id,
  tracingId: (row) => row.tracingId,
  submitterId: () => submitterId,
  date: (row) => row.date,
  purposeId: (row) => row.purposeId,
  token_id: (row) => row.token_id,
  status: (row) => row.status,
  requestsCount: (row) => row.requestsCount,
  consumerId: (row) => row.consumerId,
  producerId: (row) => row.producerId,
  eserviceId: (row) => row.eserviceId,
  purposeName: (row) => row.purposeName,
  consumerOrigin: (row) => row.consumerOrigin,
  consumerName: (row) => row.consumerName,
  consumerExternalId: (row) => row.consumerExternalId,
  producerOrigin: (row) => row.producerOrigin,
  producerName: (row) => row.producerName,
  producerExternalId: (row) => row.producerExternalId,
});

export const enrichedCsvColumnOrder: string[] = Object.keys(
  createEnrichedCsvMapping(""),
);

export const errorsCsvMapping: CsvMapping<PurposeErrorRow> = {
  id: (row) => row.id,
  tracing_id: (row) => row.tracingId,
  version: (row) => row.version,
  purpose_id: (row) => row.purposeId,
  severity: (row) => row.severity,
  error_code: (row) => row.errorCode,
  message: (row) => row.message,
  row_number: (row) => row.rowNumber,
};
