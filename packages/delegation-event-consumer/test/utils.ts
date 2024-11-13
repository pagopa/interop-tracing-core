import { AxiosError, AxiosRequestHeaders } from "axios";
import {
  DelegationV2,
  DelegationEventV2,
} from "@pagopa/interop-outbound-models";
import { generateId } from "pagopa-interop-tracing-models";

export const approvedDelegationEventV2 = (
  delegationV2: DelegationV2 | undefined,
  stream_id?: string,
  version?: number,
): DelegationEventV2 => ({
  type: "DelegationApproved",
  timestamp: new Date(),
  event_version: 2,
  version: version || 1,
  stream_id: stream_id || generateId(),
  data: {
    delegation: delegationV2,
  },
});

export const revokedDelegationEventV2 = (
  delegationV2: DelegationV2 | undefined,
  stream_id?: string,
  version?: number,
): DelegationEventV2 => ({
  type: "DelegationRevoked",
  timestamp: new Date(),
  event_version: 2,
  version: version || 1,
  stream_id: stream_id || generateId(),
  data: {
    delegation: delegationV2,
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
