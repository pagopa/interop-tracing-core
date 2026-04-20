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
  token_id: z.string(),
  requestsCount: z.string(),
  consumerId: z.string().optional(),
  producerId: z.string().optional(),
  eserviceId: z.string().optional(),
  purposeName: z.string().optional(),
  consumerOrigin: z.string().optional(),
  consumerName: z.string().optional(),
  consumerExternalId: z.string().optional(),
  producerOrigin: z.string().optional(),
  producerName: z.string().optional(),
  producerExternalId: z.string().optional(),
});

export const TracingEnrichedSchema = z.object({
  submitterId: z.string(),
  date: z.string(),
  purposeId: z.string(),
  status: z.coerce.number(),
  token_id: z.string(),
  requestsCount: z.string(),
  id: z.string(),
  tracingId: z.string(),
});

export const TracingEnrichedSchemaWithDomainIds = TracingEnrichedSchema.extend({
  consumerId: z.string(),
  producerId: z.string(),
  eserviceId: z.string(),
  purposeName: z.string(),
  consumerOrigin: z.string(),
  consumerName: z.string(),
  consumerExternalId: z.string(),
  producerOrigin: z.string(),
  producerName: z.string(),
  producerExternalId: z.string(),
});

export type TracingFromCsv = z.infer<typeof TracingFromCsv>;
export type TracingEnriched = z.infer<typeof TracingEnriched>;
export type TracingEnrichedSchema = z.infer<typeof TracingEnrichedSchema>;
export type TracingEnrichedSchemaWithDomainIds = z.infer<
  typeof TracingEnrichedSchemaWithDomainIds
>;
