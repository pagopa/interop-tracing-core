import { z } from "zod";

const acceptedStatusCodes = [
  "200",
  "201",
  "202",
  "204",
  "301",
  "302",
  "304",
  "400",
  "401",
  "403",
  "404",
  "405",
  "409",
  "500",
  "501",
  "502",
  "503",
  "504",
] as const;

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
  status: z.enum(acceptedStatusCodes),
  requests_count: z.string(),
  rowNumber: z.number(),
});

export const EserviceSchema = z.object({
  id: z.string(),
  purposeId: z.string().uuid(),
  consumer_id: z.string(),
  producer_id: z.string(),
  date: z.string(),
  origin: z.string(),
  external_id: z.string(),
  purpose_title: z.string(),
  producer_name: z.string(),
  consumer_name: z.string(),
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
