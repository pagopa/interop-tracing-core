import { AxiosError, AxiosRequestHeaders } from "axios";
import {
  EServiceDescriptorV1,
  EServiceModeV1,
  EServiceTechnologyV1,
  EServiceV1,
  EServiceDescriptorStateV1,
  EServiceEventV1,
} from "@pagopa/interop-outbound-models";
import { generateId } from "pagopa-interop-tracing-models";

const descriptor: EServiceDescriptorV1 = {
  id: generateId(),
  audience: ["test.audience"],
  dailyCallsPerConsumer: 100,
  dailyCallsTotal: 100,
  state: EServiceDescriptorStateV1.PUBLISHED,
  version: "1",
  voucherLifespan: 100,
  serverUrls: ["http://test.com"],
  docs: [],
};

export const createEServiceV1 = (
  partialEservice?: Partial<EServiceV1>,
  descriptorItem?: EServiceDescriptorV1,
): EServiceV1 => ({
  id: generateId(),
  producerId: generateId(),
  description: "eService test description",
  name: "eServie test name",
  mode: EServiceModeV1.RECEIVE,
  technology: EServiceTechnologyV1.REST,
  ...partialEservice,
  descriptors: [descriptorItem || descriptor],
});

export const createEserviceAddedEventV1 = (
  eserviceV1: EServiceV1 | undefined,
  stream_id?: string,
  version?: number,
): EServiceEventV1 => ({
  type: "EServiceAdded",
  timestamp: new Date(),
  event_version: 1,
  version: version || 1,
  stream_id: stream_id || generateId(),
  data: {
    eservice: eserviceV1,
  },
});

export const mockEserviceDeleteV1: EServiceEventV1 = {
  event_version: 1,
  version: 1,
  type: "EServiceDeleted",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    eserviceId: generateId(),
  },
};

export const mockEserviceUpdateV1: EServiceEventV1 = {
  event_version: 1,
  version: 1,
  type: "ClonedEServiceAdded",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    eservice: {
      description: "",
      technology: EServiceTechnologyV1.REST,
      id: generateId(),
      name: "",
      producerId: generateId(),
      descriptors: [descriptor, descriptor],
    },
  },
};

export const mockClonedEServiceAddedV1: EServiceEventV1 = {
  ...mockEserviceUpdateV1,
  type: "ClonedEServiceAdded",
};

export function mockApiClientError(
  status: number,
  statusText: string,
): AxiosError {
  const mockAxiosError = new AxiosError(statusText);
  mockAxiosError.response = {
    status: status,
    statusText: statusText,
    headers: {},
    config: {
      headers: {} as AxiosRequestHeaders,
    },
    data: {},
  };
  return mockAxiosError;
}
