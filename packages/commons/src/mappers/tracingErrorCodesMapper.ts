import { TracingState, tracingState } from "pagopa-interop-tracing-models";
import { match } from "ts-pattern";

export const tracingErrorCodesMapper = (state: TracingState, date: string) =>
  match(state)
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
    .otherwise(() => undefined);
