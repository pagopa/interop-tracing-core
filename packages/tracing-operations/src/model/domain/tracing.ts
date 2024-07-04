import { TracingState, tracingState } from "pagopa-interop-tracing-models";
import { z } from "zod";
import { TracingSchema } from "./db.js";
import { match } from "ts-pattern";
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
    tracings.map((tracing) => ({
      tracingId: tracing.id,
      date: ISODateFormat.parse(tracing.date),
      state: tracing.state,
      ...tracingErrorCodesMapper(
        tracing.state,
        ISODateFormat.parse(tracing.date),
      ),
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

export const tracingErrorCodesMapper = (state: TracingState, date: string) => {
  const errorMessage = match(state)
    .with(
      tracingState.error,
      () =>
        "Tracing validation failed: Invalid purposes provided. Please check it and align with the guidelines.",
    )
    .with(
      tracingState.missing,
      () =>
        `No Tracing data found for date ${date}. Please provide the required data.`,
    )
    .otherwise(() => null);
  return errorMessage ? { errorMessage } : null;
};
