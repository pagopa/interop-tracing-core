import { TracingState } from "pagopa-interop-tracing-models";
import { z } from "zod";

const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  origin: z.string(),
  externalId: z.string().uuid(),
  deleted: z.boolean(),
});

const PurposeSchema = z.object({
  id: z.string().uuid(),
  consumer_id: z.string().uuid(),
  eservice_id: z.string().uuid(),
  purpose_title: z.string(),
});

const PurposeErrorSchema = z.object({
  id: z.string().uuid(),
  tracing_id: z.string().uuid(),
  version: z.number(),
  purpose_id: z.string().uuid(),
  error_code: z.string(),
  message: z.string(),
});

const TracingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  state: TracingState,
  date: z.string(),
  version: z.number(),
  errors: z.boolean(),
});

export type Tenant = z.infer<typeof TenantSchema>;
export type Purpose = z.infer<typeof PurposeSchema>;
export type PurposeError = z.infer<typeof PurposeErrorSchema>;
export type Tracing = z.infer<typeof TracingSchema>;
