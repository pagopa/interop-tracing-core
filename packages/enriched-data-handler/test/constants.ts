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
  },
  {
    submitterId: generateId(),
    date: "2024-09-07",
    purposeId: generateId(),
    status: 500,
    token_id: generateId(),
    requestsCount: "3",
  },
];
