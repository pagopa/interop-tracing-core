import { z } from "zod";

export const TracingContent = z.object({
  tenantId: z.string(),
  date: z.string(),
  version: z.string(),
  correlationId: z.string(),
  tracingId: z.string(),
});

const acceptedStatusCodes = [
  "100",
  "101",
  "102",
  "103",
  "200",
  "201",
  "202",
  "203",
  "204",
  "205",
  "206",
  "207",
  "208",
  "226",
  "300",
  "301",
  "302",
  "303",
  "304",
  "305",
  "306",
  "307",
  "308",
  "400",
  "401",
  "402",
  "403",
  "404",
  "405",
  "406",
  "407",
  "408",
  "409",
  "410",
  "411",
  "412",
  "413",
  "414",
  "415",
  "416",
  "417",
  "418",
  "421",
  "422",
  "423",
  "424",
  "425",
  "426",
  "428",
  "429",
  "431",
  "451",
  "500",
  "501",
  "502",
  "503",
  "504",
  "505",
  "506",
  "507",
  "508",
  "510",
  "511",
];

export const TracingRecordSchema = z.object({
  date: z.string(),
  purpose_id: z.string().uuid(),
  status: z.coerce
    .number()
    .refine((value) => acceptedStatusCodes.includes(value.toString()), {
      message: "Invalid HTTP status code",
    }),
  requests_count: z.string(),
  rowNumber: z.number(),
});

export const EserviceSchema = z.object({
  eservice_id: z.string(),
  purpose_id: z.string().uuid(),
  consumer_id: z.string(),
  producer_id: z.string(),
  date: z.string(),
  origin: z.string(),
  external_id: z.string(),
  purpose_title: z.string(),
  producer_name: z.string(),
  consumer_name: z.string(),
});

export const PurposeSchema = z.object({
  purposeName: z.string(),
  date: z.string(),
  purpose_id: z.string().uuid(),
  status: z.number(),
  requests_count: z.string(),
  rowNumber: z.number(),
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),
});

export const TracingRecords = z.array(TracingRecordSchema);

export type EnrichedPurpose = z.infer<typeof PurposeSchema> & {
  eservice: z.infer<typeof EserviceSchema>;
};
export type TracingRecordSchema = z.infer<typeof TracingRecordSchema>;
export type TracingRecords = z.infer<typeof TracingRecords>;
export type TracingContent = z.infer<typeof TracingContent>;
export type EserviceSchema = z.infer<typeof EserviceSchema>;
export type PurposeSchema = z.infer<typeof PurposeSchema>;
