import { AxiosError, AxiosRequestHeaders } from "axios";
import {
  EServiceDescriptorV1,
  EServiceModeV1,
  EServiceTechnologyV1,
  EServiceV1,
  EServiceDescriptorStateV1,
  EServiceEventV1,
  AgreementApprovalPolicyV2,
  EServiceDescriptorStateV2,
  EServiceDescriptorV2,
  EServiceEventV2,
  EServiceV2,
  EServiceModeV2,
  EServiceTechnologyV2,
  TenantV1,
  TenantEventV1,
  TenantV2,
  TenantEventV2,
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

export const createTenantEventV1 = (
  tenantV1: TenantV1 | undefined,
  stream_id?: string,
  version?: number,
): TenantEventV1 => ({
  type: "TenantCreated",
  timestamp: new Date(),
  event_version: 1,
  version: version || 1,
  stream_id: stream_id || generateId(),
  data: {
    tenant: tenantV1,
  },
});

export const createTenantEventV2 = (
  tenantV2: TenantV2 | undefined,
  stream_id?: string,
  version?: number,
): TenantEventV2 => ({
  type: "TenantOnboarded",
  timestamp: new Date(),
  event_version: 2,
  version: version || 1,
  stream_id: stream_id || generateId(),
  data: {
    tenant: tenantV2,
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

export const mockEserviceDeleteV2: EServiceEventV2 = {
  event_version: 2,
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

export const createEserviceAddedEventV2 = (
  eServiceV2: EServiceV2,
  stream_id?: string,
  version?: number,
): EServiceEventV2 => ({
  type: "EServiceAdded",
  event_version: 2,
  stream_id: stream_id || generateId(),
  timestamp: new Date(),
  version: version || 1,
  data: {
    eservice: eServiceV2,
  },
});

export const getDescriptorV2 = (
  partialDescriptorV2?: Partial<EServiceDescriptorV2>,
): EServiceDescriptorV2 => ({
  id: generateId(),
  agreementApprovalPolicy: AgreementApprovalPolicyV2.AUTOMATIC,
  audience: ["test.audience"],
  createdAt: 1n,
  dailyCallsPerConsumer: 100,
  dailyCallsTotal: 100,
  docs: [],
  serverUrls: ["http://test.com"],
  state: EServiceDescriptorStateV2.DRAFT,
  version: 1n,
  voucherLifespan: 100,
  ...partialDescriptorV2,
});

export const createV2Event = (
  eServiceId: string,
  descriptorId: string,
  producerId: string,
  eServiceDescriptorState: EServiceDescriptorStateV2,
  descriptors?: EServiceDescriptorV2[],
): EServiceV2 => ({
  id: eServiceId,
  producerId,
  createdAt: 1n,
  description: "eService test description",
  mode: EServiceModeV2.RECEIVE,
  name: "eService test name",
  technology: EServiceTechnologyV2.REST,

  descriptors: descriptors
    ? descriptors
    : [
        getDescriptorV2({
          id: descriptorId,
          state: eServiceDescriptorState,
        }),
      ],
});

export const mockClonedEServiceAddedV1: EServiceEventV1 = {
  ...mockEserviceUpdateV1,
  type: "ClonedEServiceAdded",
};

export const mockEserviceCloneV2: EServiceEventV2 = {
  event_version: 2,
  version: 1,
  timestamp: new Date(),
  stream_id: "1",
  type: "EServiceCloned",
  data: { eservice: {} } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
};

export const mockTenantDeleteV1: TenantEventV1 = {
  event_version: 1,
  version: 1,
  type: "TenantDeleted",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    tenantId: generateId(),
  },
};

export const mockTenantDeleteV2: TenantEventV2 = {
  event_version: 2,
  version: 1,
  type: "MaintenanceTenantDeleted",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    tenantId: generateId(),
  },
};

export const mockTenantUpdateV1 = (tenantId: string): TenantEventV1 => ({
  type: "TenantUpdated",
  timestamp: new Date(),
  event_version: 1,
  version: 1,
  stream_id: generateId(),
  data: {
    tenant: {
      id: tenantId,
      name: "tenant name",
      externalId: {
        origin: "origin",
        value: "value",
      },
      features: [],
      attributes: [],
      createdAt: 1n,
    },
  },
});

export const mockTenantUpdateV2 = (tenantId: string): TenantEventV2 => ({
  type: "TenantOnboardDetailsUpdated",
  timestamp: new Date(),
  event_version: 2,
  version: 1,
  stream_id: generateId(),
  data: {
    tenant: {
      id: tenantId,
      selfcareId: "selfcareId",
      name: "tenant name",
      externalId: {
        origin: "origin",
        value: "value",
      },
      features: [],
      attributes: [],
      createdAt: 1n,
      onboardedAt: 1n,
    },
  },
});

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
