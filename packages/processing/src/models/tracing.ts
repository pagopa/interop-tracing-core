import { z } from "zod";

export const TracingEnriched = z.object({
  tracingId: z.string(),
  submitterId: z.string(),
  date: z.string(),
  purposeId: z.string(),
  purposeName: z.string(),
  status: z.coerce.number(),
  requestsCount: z.string(),
  eserviceId: z.string(),
  consumerId: z.string(),
  consumerOrigin: z.string().optional(),
  consumerName: z.string().optional(),
  consumerExternalId: z.string().optional(),
  producerId: z.string(),
  producerName: z.string().optional(),
  producerOrigin: z.string().optional(),
  producerExternalId: z.string().optional(),
});

export type TracingEnriched = z.infer<typeof TracingEnriched>;
