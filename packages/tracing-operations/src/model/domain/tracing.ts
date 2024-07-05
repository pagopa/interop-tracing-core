import { TracingState } from "pagopa-interop-tracing-models";
import { tracingErrorCodesMapper } from "pagopa-interop-tracing-commons";
import { z } from "zod";
import { TracingSchema } from "./db.js";
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
    tracings.map((tracing) => {
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
