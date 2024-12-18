import { AxiosError, AxiosRequestHeaders } from "axios";
import { DelegationEventV2 } from "@pagopa/interop-outbound-models";
import { generateId } from "pagopa-interop-tracing-models";
import { DelegationV2 } from "../src/models/domain/delegation.js";

export const approvedDelegationEventV2 = (
  delegationV2: DelegationV2 | undefined,
  stream_id?: string,
  version?: number,
): DelegationEventV2 => ({
  type: "ProducerDelegationApproved",
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
  type: "ProducerDelegationRevoked",
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
