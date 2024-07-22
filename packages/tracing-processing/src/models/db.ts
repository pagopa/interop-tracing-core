import { z } from "zod";
import http from "http";

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
  requests_count: z.coerce.number().positive(),
  rowNumber: z.number(),
});

export const EserviceSchema = z.object({
  eservice_id: z.string(),
  producer_id: z.string(),
});

export type TracingRecordSchema = z.infer<typeof TracingRecordSchema>;
export type EserviceSchema = z.infer<typeof EserviceSchema>;
