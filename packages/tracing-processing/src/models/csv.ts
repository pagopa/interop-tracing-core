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
});

export const PurposeErrorMessage = z.object({
  purposeId: z.string().uuid(),
  status: z.number(),
  rowNumber: z.number(),
  message: z.string(),
  errorCode: z.string(),
});
export const PurposeErrorMessageArray = z.array(PurposeErrorMessage);

const EnrichedPurpose = PurposeEnriched.extend({
  eservice: Eservice,
});

export type EnrichedPurpose = z.infer<typeof PurposeEnriched> & {
  eservice: z.infer<typeof Eservice>;
};

export const EnrichedPurposeArray = z.array(EnrichedPurpose);

export type Eservice = z.infer<typeof Eservice>;

export type PurposeErrorMessage = z.infer<typeof PurposeErrorMessage>;
