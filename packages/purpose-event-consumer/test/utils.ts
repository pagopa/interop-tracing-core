import { AxiosError, AxiosRequestHeaders } from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  PurposeV1,
  PurposeEventV1,
  PurposeStateV1,
  PurposeStateV2,
  PurposeV2,
  PurposeVersionV1,
  PurposeVersionV2,
} from "@pagopa/interop-outbound-models";
import { z } from "zod";
import { match } from "ts-pattern";

export const PurposeEventV1Type = z.union([
  z.literal("PurposeCreated"),
  z.literal("PurposeUpdated"),
  z.literal("PurposeVersionWaitedForApproval"),
  z.literal("PurposeVersionActivated"),
  z.literal("PurposeVersionSuspended"),
  z.literal("PurposeVersionArchived"),
]);
type PurposeEventV1Type = z.infer<typeof PurposeEventV1Type>;

export const PurposeVersionEventV1Type = z.union([
  z.literal("PurposeVersionCreated"),
  z.literal("PurposeVersionActivated"),
  z.literal("PurposeVersionUpdated"),
  z.literal("PurposeVersionDeleted"),
  z.literal("PurposeVersionRejected"),
  z.literal("PurposeDeleted"),
]);
type PurposeVersionEventV1Type = z.infer<typeof PurposeVersionEventV1Type>;
export const generateID = (): string => uuidv4();
export function dateToBigInt(input: Date): bigint {
  return BigInt(input.getTime());
}
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

export const createAPurposeEventV1 = (
  type: PurposeEventV1Type,
  purpose: PurposeV1,
  stream_id?: string,
  version?: number,
): PurposeEventV1 => {
  const purposeEventV1: PurposeEventV1 = {
    type,
    data: {
      purpose,
    },
    event_version: 1,
    stream_id: stream_id || generateID(),
    version: version || 1,
    timestamp: new Date(),
  };
  return purposeEventV1;
};

export const getMockPurpose = (
  partialPurpose?: Partial<PurposeV1> | Partial<PurposeV2>,
): PurposeV1 | PurposeV2 => ({
  id: generateID(),
  eserviceId: generateID(),
  consumerId: generateID(),
  versions: [],
  title: "This is a Purpose for testing event consuming V1",
  description: "This is a description for a test purpose",
  createdAt: dateToBigInt(new Date()),
  isFreeOfCharge: false,
  ...partialPurpose,
});

export const getMockPurposeVersion = (
  state?: PurposeStateV1 | PurposeStateV2,
  partialPurposeVersion?: Partial<PurposeVersionV1> | Partial<PurposeVersionV2>,
): PurposeVersionV1 | PurposeVersionV2 => ({
  id: generateID(),
  state: state || PurposeStateV1.DRAFT,
  dailyCalls: 10,
  createdAt: dateToBigInt(new Date()),
  ...partialPurposeVersion,
  ...(state !== PurposeStateV1.DRAFT
    ? {
        updatedAt: dateToBigInt(new Date()),
        firstActivationAt: dateToBigInt(new Date()),
      }
    : {}),
  ...(state === PurposeStateV1.SUSPENDED
    ? { suspendedAt: dateToBigInt(new Date()) }
    : {}),
  ...(state === PurposeStateV1.REJECTED ? { rejectionReason: "test" } : {}),
});

export const createAPurposeVersionEventV1 = (
  type: PurposeVersionEventV1Type,
  purpose: PurposeV1,
  stream_id?: string,
  version?: number,
): PurposeEventV1 => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const purposeGeneric: any = {
    type,
    event_version: 1,
    stream_id: stream_id || generateID(),
    version: version || 1,
    timestamp: new Date(),
  };
  return (
    match({ type })
      .with({ type: "PurposeVersionRejected" }, () => ({
        ...purposeGeneric,
        data: {
          purpose,
          versionId: purpose.versions[0].id,
        },
      }))
      .with({ type: "PurposeDeleted" }, () => ({
        ...purposeGeneric,
        data: {
          purposeId: purpose.id,
        },
      }))
      .with({ type: "PurposeVersionDeleted" }, () => ({
        ...purposeGeneric,
        data: {
          purposeId: purpose.id,
          versionId: purpose.versions[0].id,
        },
      }))
      .with({ type: "PurposeVersionUpdated" }, () => ({
        ...purposeGeneric,
        data: {
          purposeId: purpose.id,
          version: purpose.versions[0],
        },
      }))
      // eslint-disable-next-line sonarjs/no-identical-functions
      .with({ type: "PurposeVersionCreated" }, () => ({
        ...purposeGeneric,
        data: {
          purposeId: purpose.id,
          version: purpose.versions[0],
        },
      }))
      .with({ type: "PurposeVersionActivated" }, () => ({
        ...purposeGeneric,
        data: {
          purposeId: purpose.id,
          version: purpose.versions[0],
        },
      }))
      .exhaustive()
  );
};
