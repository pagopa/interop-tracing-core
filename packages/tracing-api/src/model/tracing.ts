import { TracingState } from "pagopa-interop-tracing-models";
import z from "zod";

const PurposeError = z.object({
  purposeId: z.string().uuid(),
  errorCode: z.string(),
  message: z.string(),
  rowNumber: z.number(),
});

export const ApiTracingErrorsContent = z.object({
  results: z.array(PurposeError),
  totalCount: z.number(),
});

export type ApiTracingErrorsContent = z.infer<typeof ApiTracingErrorsContent>;

const TracingContent = z.object({
  tracingId: z.string().uuid(),
  date: z.string(),
  state: TracingState,
});

export const ApiTracingsContent = z.object({
  results: z.array(TracingContent),
  totalCount: z.number(),
});

export type ApiTracingsContent = z.infer<typeof ApiTracingsContent>;
