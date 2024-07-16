import {
  RequesterPurposeIdHeader,
  CorrelationIdHeader,
} from "pagopa-interop-tracing-models";

export const correlationIdToHeader = (
  correlationId: string,
): CorrelationIdHeader => ({
  "x-correlation-id": correlationId,
});

export const purposeIdToHeader = (
  purposeId: string,
): RequesterPurposeIdHeader => ({
  "x-requester-purpose-id": purposeId,
});
