import { AxiosError, AxiosRequestHeaders } from "axios";
import { v4 as uuidv4 } from "uuid";

import { PurposeV1, PurposeEventV1 } from "@pagopa/interop-outbound-models";

export const generateID = (): string => uuidv4();

export const createPurposeActivatedEventV1 = (
  purposeV1: PurposeV1 | undefined,
  stream_id?: string,
  version?: number,
): PurposeEventV1 => ({
  type: "PurposeVersionActivated",
  timestamp: new Date(),
  event_version: 1,
  version: version || 1,
  stream_id: stream_id || generateID(),
  data: {
    purpose: purposeV1,
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
