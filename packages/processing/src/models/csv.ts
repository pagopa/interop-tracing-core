import { z } from "zod";

const stripCommas = (val: string) => val.replace(/,/g, "").trim();

export const Eservice = z.object({
  eserviceId: z.string(),
  producerId: z.string(),
});

export const EnrichedPurpose = z.object({
  tracingId: z.string(),
  producerOrigin: z.string().transform(stripCommas),
  producerExternalId: z.string().transform(stripCommas),
  producerName: z.string().transform(stripCommas),
  consumerId: z.string(),
  consumerExternalId: z.string().transform(stripCommas),
  consumerOrigin: z.string().transform(stripCommas),
  consumerName: z.string().transform(stripCommas),
  purposeName: z.string().transform(stripCommas),
  date: z.string(),
  purposeId: z.string().uuid(),
  token_id: z.string().uuid(),
  status: z.coerce.number(),
  requestsCount: z.coerce.number(),
  rowNumber: z.number(),
  eserviceId: z.string(),
  producerId: z.string(),
});

export const PurposeErrorMessage = z.object({
  purposeId: z.string(),
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
