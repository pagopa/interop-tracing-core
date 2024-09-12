import { generateId } from "pagopa-interop-tracing-models";

export const mockTracingFromCsv = {
  tracingId: generateId(),
  version: 1,
  tenantId: generateId(),
  correlationId: generateId(),
  date: "2024-09-07",
};

export const mockEnrichedPuposes = [
  {
    submitterId: generateId(),
    date: "2024-09-07",
    purposeId: generateId(),
    purposeName: "Purpose 1",
    status: 200,
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
