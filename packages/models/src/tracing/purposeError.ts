import { z } from "zod";

export const purposeErrorSeverity = {
  invalid: "INVALID",
  warning: "WARNING",
} as const;

export const PurposeErrorSeverity = z.enum([
  purposeErrorSeverity.invalid,
  purposeErrorSeverity.warning,
]);
export type PurposeErrorSeverity = z.infer<typeof PurposeErrorSeverity>;

export const PurposeError = z.object({
  tracingId: z.string().uuid(),
  purposeId: z.string(),
  version: z.coerce.number(),
  severity: PurposeErrorSeverity,
  errorCode: z.string(),
  message: z.string(),
  rowNumber: z.coerce.number(),
});
export type PurposeError = z.infer<typeof PurposeError>;
