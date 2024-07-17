import { z } from "zod";

export const Eservice = z.object({
  eserviceId: z.string(),
  producerId: z.string(),
});

export const EnrichedPurpose = z.object({
  tracingId: z.string(),
  producerOrigin: z.string(),
  producerExternalId: z.string(),
  producerName: z.string(),
  consumerId: z.string(),
  consumerExternalId: z.string(),
  consumerOrigin: z.string(),
  consumerName: z.string(),
  purposeName: z.string(),
  date: z.string(),
  purposeId: z.string().uuid(),
  status: z.coerce.number(),
  requestsCount: z.coerce.number(),
  rowNumber: z.number(),
  eserviceId: z.string(),
  producerId: z.string(),
});

export const PurposeErrorMessage = z.object({
  purposeId: z.string().uuid(),
  rowNumber: z.number(),
  message: z.string(),
  errorCode: z.string(),
});

export const PurposeErrorMessageArray = z.array(PurposeErrorMessage);

export const EnrichedPurposeArray = z.array(EnrichedPurpose);

export type EnrichedPurpose = z.infer<typeof EnrichedPurpose>;

export type Eservice = z.infer<typeof Eservice>;

export type PurposeErrorMessage = z.infer<typeof PurposeErrorMessage>;
export type PurposeErrorMessageArray = z.infer<typeof PurposeErrorMessageArray>;
