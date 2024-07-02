import {
  RequesterPurposeIdHeader,
  CorrelationIdHeader,
} from "pagopa-interop-tracing-models";

export const correlationIdToHeader = (
  correlationId: string,
): CorrelationIdHeader => ({
  "X-Correlation-Id": correlationId,
});

export const purposeIdToHeader = (
  purposeId: string,
): RequesterPurposeIdHeader => ({
  "X-Requester-Purpose-Id": purposeId,
});
