import { ApiGetTracingsQuery } from "pagopa-interop-tracing-operations-client";
import { tracingState } from "pagopa-interop-tracing-models";
import { ApiExternalGetTracingsQuery } from "../model/types.js";

export const externalTracingState = {
  error: "ERROR",
} as const;

export function mapExternalTracingStateToInternal(state: string): string {
  return state === externalTracingState.error ? tracingState.error : state;
}

export function mapInternalTracingStateToExternal(state: string): string {
  return state === tracingState.error ? externalTracingState.error : state;
}

export function mapExternalGetTracingsQueryToInternal(
  query: ApiExternalGetTracingsQuery,
): ApiGetTracingsQuery {
  return {
    ...query,
    states: query.states?.map(mapExternalTracingStateToInternal) as
      | ApiGetTracingsQuery["states"]
      | undefined,
  };
}

export function mapInternalTracingsToExternal<T extends { state: string }>(
  results: T[],
): T[] {
  return results.map((tracing) => ({
    ...tracing,
    state: mapInternalTracingStateToExternal(tracing.state),
  }));
}
