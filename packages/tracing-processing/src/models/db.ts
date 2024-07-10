import { z } from "zod";
import http from "http";

const acceptedStatusCodes = Object.keys(http.STATUS_CODES).map(Number);
export const TracingRecordSchema = z.object({
  date: z.string(),
  purpose_id: z.string().uuid(),
  status: z.coerce
    .number()
    .refine((value) => acceptedStatusCodes.includes(value), {
      message: "Invalid HTTP status code",
    }),
  requests_count: z.string(),
  rowNumber: z.number(),
});

export const EserviceSchema = z.object({
  eservice_id: z.string(),
  producer_id: z.string(),
});

export type TracingRecordSchema = z.infer<typeof TracingRecordSchema>;
export type EserviceSchema = z.infer<typeof EserviceSchema>;
