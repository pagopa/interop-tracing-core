import { z } from "zod";
import { TracingState } from "../tracing/tracing.js";

export const UpdateTracingStateDto = z.object({
  tracingId: z.string().uuid(),
  state: TracingState,
  version: z.number(),
});

export type UpdateTracingStateDto = z.infer<typeof UpdateTracingStateDto>;

export const SavePurposeErrorDto = z.object({
  tracingId: z.string().uuid(),
  purposeId: z.string().uuid(),
  version: z.number(),
  date: z.string(),
  status: z.number(),
  errorCode: z.string(),
  message: z.string(),
  rowNumber: z.number(),
  updateTracingState: z.boolean(),
});

export type SavePurposeErrorDto = z.infer<typeof SavePurposeErrorDto>;
