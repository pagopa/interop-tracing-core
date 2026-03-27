import { z } from "zod";

export const expectedInputCSVHeaders = [
  "date",
  "purpose_id",
  "requests_count",
  "status",
  "token_id",
];

export const Eservice = z.object({
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

export type Eservice = z.infer<typeof Eservice>;

export type PurposeErrorMessage = z.infer<typeof PurposeErrorMessage>;
export type PurposeErrorMessageArray = z.infer<typeof PurposeErrorMessageArray>;
