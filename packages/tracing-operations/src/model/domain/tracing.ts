import { TracingState } from "pagopa-interop-tracing-models";
import { z } from "zod";
import { TracingSchema } from "./db.js";
import { ISODateFormat } from "./dates.js";

export const TracingsContent = z.object({
  tracingId: z.string().uuid(),
  date: z.string(),
  state: TracingState,
});
export type TracingsContent = z.infer<typeof TracingsContent>;

export const TracingsContentResponse = z
  .array(TracingSchema)
  .transform((tracings) =>
    tracings.map((tracing) => ({
      tracingId: tracing.id,
      date: ISODateFormat.parse(tracing.date),
      state: tracing.state,
    })),
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
