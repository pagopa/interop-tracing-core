import { z } from "zod";

export const TracingFromCsv = z.object({
  tenantId: z.string(),
  date: z.string(),
  version: z.coerce.number(),
  correlationId: z.string(),
  tracingId: z.string(),
});

export const TracingEnriched = z.object({
  submitterId: z.string(),
  date: z.string(),
  purposeId: z.string(),
  status: z.coerce.number(),
  tokenId: z.string(),
  requestsCount: z.string(),
});

export const TracingEnrichedSchema = TracingEnriched.extend({
  id: z.string(),
  createdAt: z.string(),
  tracingId: z.string(),
});

export type TracingFromCsv = z.infer<typeof TracingFromCsv>;
export type TracingEnriched = z.infer<typeof TracingEnriched>;
export type TracingEnrichedSchema = z.infer<typeof TracingEnrichedSchema>;
