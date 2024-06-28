import { z } from "zod";

export const TracingContent = z.object({
  tenantId: z.string(),
  date: z.string(),
  version: z.number(),
  correlationId: z.string(),
  tracingId: z.string(),
});

export const TracingRecordSchema = z.object({
  date: z.string(),
  purpose_id: z.string().uuid(),
  status: z.string(),
  requests_count: z.string(),
  rowNumber: z.number(),
});

export const EserviceSchema = z.object({
  eserviceId: z.string(),
  purposeId: z.string().uuid(),
  consumerId: z.string(),
  producerId: z.string(),
  date: z.string(),
  origin: z.string(),
  externalId: z.string(),
  purposeTitle: z.string(),
  producerName: z.string(),
  consumerName: z.string(),
});

export const PurposeSchema = z.object({
  purposeName: z.string(),
  date: z.string(),
  purpose_id: z.string().uuid(),
  status: z.string(),
  requests_count: z.string(),
  rowNumber: z.number(),
  error: z.string().optional(),
});

export const TracingRecords = z.array(TracingRecordSchema);
export type EnrichedPurpose = z.infer<typeof PurposeSchema> & {
  eservice: z.infer<typeof EserviceSchema>;
};

export type TracingRecordSchema = z.infer<typeof TracingRecordSchema>;
export type TracingRecords = z.infer<typeof TracingRecords>;
export type TracingContent = z.infer<typeof TracingContent>;
export type EserviceSchema = z.infer<typeof EserviceSchema>;
export type PurposeSchema = z.infer<typeof PurposeSchema>;
