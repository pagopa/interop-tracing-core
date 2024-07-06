import { TracingState } from "pagopa-interop-tracing-models";
import { tracingErrorCodesMapper } from "pagopa-interop-tracing-commons";
import { z } from "zod";
import { TracingSchema, PurposeErrorSchema } from "./db.js";
import { ISODateFormat } from "./dates.js";

export const TracingsContent = z.object({
  tracingId: z.string().uuid(),
  date: z.string(),
  state: TracingState,
  errorMessage: z.string().optional(),
});
export type TracingsContent = z.infer<typeof TracingsContent>;

export const TracingsContentResponse = z
  .array(TracingSchema)
  .transform((tracings) =>
    tracings.map((tracing): TracingsContent => {
      const tracingDate = ISODateFormat.parse(tracing.date);
      const errorMessage = tracingErrorCodesMapper(tracing.state, tracingDate);

      return {
        tracingId: tracing.id,
        date: tracingDate,
        state: tracing.state,
        ...(errorMessage && { errorMessage }),
      };
    }),
  )
  .refine(
    (results) => {
      const validation = z.array(TracingsContent).safeParse(results);
      return validation.success;
    },
    {
      message: "Parsing TracingSchema to TracingsContent failed",
    },
  );
export type TracingsContentResponse = z.infer<typeof TracingsContentResponse>;

export const TracingPurposeErrorContent = z.object({
  purposeId: z.string().uuid(),
  errorCode: z.string(),
  message: z.string(),
  rowNumber: z.number(),
});
export type TracingPurposeErrorContent = z.infer<
  typeof TracingPurposeErrorContent
>;

export const TracingErrorsContentResponse = z
  .array(PurposeErrorSchema)
  .transform((purposes_errors) =>
    purposes_errors.map(
      (purpose): TracingPurposeErrorContent => ({
        purposeId: purpose.purpose_id,
        message: purpose.message,
        errorCode: purpose.error_code,
        rowNumber: purpose.row_number,
      }),
    ),
  )
  .refine(
    (results) => {
      const validation = z.array(TracingPurposeErrorContent).safeParse(results);
      return validation.success;
    },
    {
      message:
        "Parsing PurposeErrorSchema to TracingErrorsContentResponse failed",
    },
  );
export type TracingErrorsContentResponse = z.infer<
  typeof TracingErrorsContentResponse
>;
