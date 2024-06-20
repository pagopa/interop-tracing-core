import { z } from "zod";
import { TracingState } from "../tracing/tracing.js";

export const UpdateTracingStateDto = z.object({
  tracingId: z.string().uuid(),
  state: TracingState,
  version: z.number(),
});

export type UpdateTracingStateDto = z.infer<typeof UpdateTracingStateDto>;

export const MessageHeadersDto = z.object({
  correlationId: z.string().uuid(),
});

export type MessageHeadersDto = z.infer<typeof MessageHeadersDto>;
