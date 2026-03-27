import { z } from "zod";

export const EnrichedPurposeRow = z.object({
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
  tracingId: (row) => row.tracingId,
  submitterId: () => submitterId,
  date: (row) => row.date,
  purposeId: (row) => row.purposeId,
  purposeName: (row) => row.purposeName,
  status: (row) => row.status,
  token_id: (row) => row.token_id,
  requestsCount: (row) => row.requestsCount,
  eserviceId: (row) => row.eserviceId,
  consumerId: (row) => row.consumerId,
  consumerOrigin: (row) => row.consumerOrigin,
  consumerName: (row) => row.consumerName,
  consumerExternalId: (row) => row.consumerExternalId,
  producerId: (row) => row.producerId,
  producerName: (row) => row.producerName,
  producerOrigin: (row) => row.producerOrigin,
  producerExternalId: (row) => row.producerExternalId,
});

export const errorsCsvMapping: CsvMapping<PurposeErrorRow> = {
  id: (row) => row.id,
  tracing_id: (row) => row.tracingId,
  version: (row) => row.version,
  purpose_id: (row) => row.purposeId,
  error_code: (row) => row.errorCode,
  message: (row) => row.message,
  row_number: (row) => row.rowNumber,
};
