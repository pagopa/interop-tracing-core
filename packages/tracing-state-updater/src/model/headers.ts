import { CorrelationIdHeader } from "pagopa-interop-tracing-models";

export const correlationIdToHeader = (
  correlationId: string,
): CorrelationIdHeader => ({
  "X-Correlation-Id": correlationId,
});
