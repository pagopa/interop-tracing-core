import {
  CorrelationId,
  generateId,
  TenantId,
  TracingId,
} from "pagopa-interop-tracing-models";

export const mockTracingFromCsv = {
  tracingId: generateId<TracingId>(),
  version: 1,
  tenantId: generateId<TenantId>(),
  correlationId: generateId<CorrelationId>(),
  date: "2024-09-07",
};

export const mockEnrichedTracing = [
  {
    submitterId: generateId(),
    date: "2024-09-07",
    purposeId: generateId(),
    status: 200,
    token_id: generateId(),
    requestsCount: "50",
    consumerId: generateId(),
    producerId: generateId(),
    eserviceId: generateId(),
    purposeName: "Test Purpose 1",
    consumerOrigin: "IPA",
    consumerName: "Consumer Org 1",
    consumerExternalId: "consumer-ext-1",
    producerOrigin: "IPA",
    producerName: "Producer Org 1",
    producerExternalId: "producer-ext-1",
  },
  {
    submitterId: generateId(),
    date: "2024-09-07",
    purposeId: generateId(),
    status: 500,
    token_id: generateId(),
    requestsCount: "3",
    consumerId: generateId(),
    producerId: generateId(),
    eserviceId: generateId(),
    purposeName: "Test Purpose 2",
    consumerOrigin: "IPA",
    consumerName: "Consumer Org 2",
    consumerExternalId: "consumer-ext-2",
    producerOrigin: "IPA",
    producerName: "Producer Org 2",
    producerExternalId: "producer-ext-2",
  },
];
