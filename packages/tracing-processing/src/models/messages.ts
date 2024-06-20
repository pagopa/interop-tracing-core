import { z } from "zod";

export const TracingContent = z.object({
  tenantId: z.string(),
  date: z.string(),
  version: z.string(),
  correlationId: z.string(),
  tracingId: z.string(),
});

export type TracingContent = z.infer<typeof TracingContent>;
