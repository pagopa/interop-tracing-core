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
  consumerOrigin: z.string(),
  consumerName: z.string(),
  consumerExternalId: z.string(),
  producerId: z.string(),
  producerName: z.string(),
  producerOrigin: z.string(),
  producerExternalId: z.string(),
});

export type TracingEnriched = z.infer<typeof TracingEnriched>;
