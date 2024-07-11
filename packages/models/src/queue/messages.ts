import { z } from "zod";
import { TracingState } from "../tracing/tracing.js";

export const UpdateTracingStateDto = z.object({
  tracingId: z.string().uuid(),
  state: TracingState,
  version: z.coerce.number(),
});

export type UpdateTracingStateDto = z.infer<typeof UpdateTracingStateDto>;

export const SavePurposeErrorDto = z.object({
  tracingId: z.string().uuid(),
  purposeId: z.string().uuid(),
  version: z.coerce.number(),
  errorCode: z.string(),
  message: z.string(),
  rowNumber: z.coerce.number(),
  updateTracingState: z.boolean(),
});

export type SavePurposeErrorDto = z.infer<typeof SavePurposeErrorDto>;

export const TracingFromS3KeyPathDto = z.object({
  tenantId: z.string(),
  date: z.string(),
  version: z.coerce.number(),
  correlationId: z.string(),
  tracingId: z.string(),
});
export type TracingFromS3KeyPathDto = z.infer<typeof TracingFromS3KeyPathDto>;
