import { z } from "zod";

export const TracingContent = z.object({
  tenantId: z.string(),
  date: z.string(),
  version: z.string(),
  correlationId: z.string(),
  tracingId: z.string(),
});

export const TracingRecordSchema = z.object({
  date: z.string(),
  purpose_id: z.string().uuid(),
  status: z.string(),
  requests_count: z.string(),
});

export const EnrichedPurpose = z.object({
  purposeName: z.string(),
  date: z.string(),
  purpose_id: z.string().uuid(),
  status: z.string(),
  requests_count: z.string(),
});

export const TracingRecords = z.array(TracingRecordSchema);

export type TracingRecordSchema = z.infer<typeof TracingRecordSchema>;
export type TracingRecords = z.infer<typeof TracingRecords>;
export type TracingContent = z.infer<typeof TracingContent>;
export type EnrichedPurpose = z.infer<typeof EnrichedPurpose>;
