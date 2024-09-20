import { TracingState } from "pagopa-interop-tracing-models";
import { z } from "zod";

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  origin: z.string(),
  externalId: z.string().uuid(),
  deleted: z.boolean(),
});

export const PurposeSchema = z.object({
  id: z.string().uuid(),
  consumer_id: z.string().uuid(),
  eservice_id: z.string().uuid(),
  purpose_title: z.string(),
});

export const PurposeErrorSchema = z.object({
  id: z.string().uuid().brand("PurposeErrorId"),
  tracing_id: z.string().uuid(),
  purpose_id: z.string(),
  version: z.number(),
  error_code: z.string(),
  message: z.string(),
  row_number: z.number(),
});

export const TracingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  state: TracingState,
  date: z.date().transform((date) => date.toISOString()),
  version: z.number(),
  errors: z.boolean(),
});

const UpdateTracingStateSchema = z.object({
  tracing_id: z.string().uuid(),
  state: TracingState,
});

const UpdateTracingStateAndVersionSchema = z.object({
  tracing_id: z.string().uuid(),
  version: z.number(),
  state: TracingState,
});

export const EserviceSchema = z.object({
  eservice_id: z.string(),
  producer_id: z.string(),
  name: z.string(),
});

export type Eservice = z.infer<typeof EserviceSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type Purpose = z.infer<typeof PurposeSchema>;
export type PurposeError = z.infer<typeof PurposeErrorSchema>;
export type Tracing = z.infer<typeof TracingSchema>;
export type UpdateTracingState = z.infer<typeof UpdateTracingStateSchema>;
export type UpdateTracingStateAndVersionSchema = z.infer<
  typeof UpdateTracingStateAndVersionSchema
>;
