import { CorrelationIdHeader } from "pagopa-interop-tracing-models";

export const correlationIdToHeader = (
  _correlationId: string,
): CorrelationIdHeader => ({
  "X-Correlation-Id": "a10473fb-f11e-4a2d-9010-f771c50eb671",
});
