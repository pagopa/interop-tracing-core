import { z } from "zod";

export const PurposeError = z.object({
  tracingId: z.string().uuid(),
  purposeId: z.string(),
  version: z.coerce.number(),
  errorCode: z.string(),
  message: z.string(),
  rowNumber: z.coerce.number(),
});
export type PurposeError = z.infer<typeof PurposeError>;
