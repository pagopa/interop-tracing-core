import { z } from "zod";

const TraceSchema = z.object({
  id: z.string().uuid(),
  tracing_id: z.string().uuid(),
  submitter_id: z.string().uuid(),
  date: z.coerce.string(),
  purpose_id: z.string().uuid(),
  purpose_name: z.string().max(255),
  status: z.number().int(),
  requests_count: z.number().int(),
  eservice_id: z.string().uuid(),
  consumer_id: z.string().uuid(),
  consumer_origin: z.string().max(255),
  consumer_name: z.string().max(255),
  consumer_external_id: z.string(),
  producer_id: z.string().uuid(),
  producer_name: z.string().max(255),
  producer_origin: z.string().max(255),
  producer_external_id: z.string(),
  created_at: z.date(),
});

export type TraceSchema = z.infer<typeof TraceSchema>;
