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

export const mockEnrichedPurposes = [
  {
    submitterId: generateId(),
    date: "2024-09-07",
    purposeId: generateId(),
    purposeName: "Purpose 1",
    status: 200,
    token_id: generateId(),
    requestsCount: "50",
    eserviceId: generateId(),
    consumerId: generateId(),
    consumerOrigin: "PagoPa",
    consumerName: "PagoPa",
    consumerExternalId: generateId(),
    producerId: generateId(),
    producerName: "PagoPa",
    producerOrigin: "PagoPa",
    producerExternalId: generateId(),
  },
  {
    submitterId: generateId(),
    date: "2024-09-07",
    purposeId: generateId(),
    purposeName: "Purpose 1",
    status: 500,
    token_id: generateId(),
    requestsCount: "3",
    eserviceId: generateId(),
    consumerId: generateId(),
    consumerOrigin: "PagoPa",
    consumerName: "PagoPa",
    consumerExternalId: generateId(),
    producerId: generateId(),
    producerName: "PagoPa",
    producerOrigin: "PagoPa",
    producerExternalId: generateId(),
  },
];
