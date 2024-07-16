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
  purposeName: z.string(),
  status: z.coerce.number(),
  requestsCount: z.string(),
  eserviceId: z.string(),
  consumerId: z.string(),
  consumerOrigin: z.string(),
  consumerName: z.string(),
  consumerExternalId: z.string(),
  producerId: z.string(),
  producerName: z.string(),
  producerOrigin: z.string(),
  producerExternalId: z.string(),
});

export type TracingFromCsv = z.infer<typeof TracingFromCsv>;
export type TracingEnriched = z.infer<typeof TracingEnriched>;
