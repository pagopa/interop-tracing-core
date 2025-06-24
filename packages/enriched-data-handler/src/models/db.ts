import { z } from "zod";

const TraceSchema = z.object({
  id: z.string().uuid(),
  tracing_id: z.string().uuid(),
  submitter_id: z.string().uuid(),
  date: z.coerce.string(),
  purpose_id: z.string().uuid(),
  token_id: z.string(),
  status: z.number().int(),
  requests_count: z.number().int(),
  created_at: z.date(),
});

export type TraceSchema = z.infer<typeof TraceSchema>;
