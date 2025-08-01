import { ZodTypeAny, z } from "zod";
import http from "http";
import { DelegationState } from "pagopa-interop-tracing-models";

const requestsCountPipe = (requestsCountSchema: ZodTypeAny) =>
  z
    .string()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .refine((value) => value === null || !isNaN(Number(value)))
    .transform((value) => (value === null ? null : Number(value)))
    .pipe(requestsCountSchema);

export const TracingRecordSchema = z.object({
  date: z.coerce.string(),
  purpose_id: z.string().uuid(),
  status: z.coerce
    .number()
    .refine(
      (value) => Object.keys(http.STATUS_CODES).map(Number).includes(value),
      {
        message: `Invalid HTTP status code`,
      },
    ),
  token_id: z.string().uuid(),
  requests_count: requestsCountPipe(z.number().nonnegative()),
  rowNumber: z.coerce.number(),
});

export const EserviceSchema = z.object({
  eservice_id: z.string(),
  producer_id: z.string(),
});

export const DelegationSchema = z.object({
  id: z.string().uuid(),
  delegate_id: z.string().uuid(),
  eservice_id: z.string().uuid(),
  state: DelegationState,
});

export type TracingRecordSchema = z.infer<typeof TracingRecordSchema>;
export type EserviceSchema = z.infer<typeof EserviceSchema>;
export type DelegationSchema = z.infer<typeof DelegationSchema>;
