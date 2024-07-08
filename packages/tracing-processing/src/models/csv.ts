import { z } from "zod";

export const Eservice = z.object({
  eserviceId: z.string(),
  consumerId: z.string(),
  producerId: z.string(),
});

export const PurposeEnriched = z.object({
  tracingId: z.string(),
  producerOrigin: z.string(),
  producerExternalId: z.string(),
  producerName: z.string(),
  consumerExternalId: z.string(),
  consumerOrigin: z.string(),
  consumerName: z.string(),
  purposeName: z.string(),
  date: z.string(),
  purposeId: z.string().uuid(),
  status: z.number(),
  requestsCount: z.string(),
  rowNumber: z.number(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
});

export type EnrichedPurpose = z.infer<typeof PurposeEnriched> & {
  eservice: z.infer<typeof Eservice>;
};
export type Eservice = z.infer<typeof Eservice>;

export type PurposeEnriched = z.infer<typeof PurposeEnriched>;
