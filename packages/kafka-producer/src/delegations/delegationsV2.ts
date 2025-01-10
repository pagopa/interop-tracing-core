import {
  DelegationEventV2,
  DelegationStateV2,
  DelegationKindV2,
} from "@pagopa/interop-outbound-models";
import { randomUUID } from "crypto";
import { match } from "ts-pattern";
import { z } from "zod";
const streamIdV2 = randomUUID();
const producerIdV2 = randomUUID();
const delegateeIdV2 = randomUUID();
const eserviceIdV2 = randomUUID();

export const ProducerDelegationSubmitted: DelegationEventV2 = {
  event_version: 2,
  type: "ProducerDelegationSubmitted",
  stream_id: streamIdV2,
  version: 1,
  timestamp: new Date(),
  data: {
    delegation: {
      id: randomUUID(),
      delegatorId: producerIdV2,
      delegateId: delegateeIdV2,
      eserviceId: eserviceIdV2,
      createdAt: "1" as any,
      submittedAt: "1" as any,
      state: DelegationStateV2.ACTIVE,
      kind: DelegationKindV2.DELEGATED_CONSUMER,
    },
  },
};

export const ProducerDelegationApproved: DelegationEventV2 = {
  ...ProducerDelegationSubmitted,
  type: "ProducerDelegationApproved",
  data: {
    delegation: {
      ...ProducerDelegationSubmitted.data.delegation!,
      state: DelegationStateV2.ACTIVE,
    },
  },
};

export const ProducerDelegationRejected: DelegationEventV2 = {
  ...ProducerDelegationSubmitted,
  type: "ProducerDelegationRejected",
  data: {
    delegation: {
      ...ProducerDelegationSubmitted.data.delegation!,
      rejectionReason: "Insufficient permissions for approval",
      state: DelegationStateV2.REJECTED,
    },
  },
};

export const ProducerDelegationRevoked: DelegationEventV2 = {
  ...ProducerDelegationSubmitted,
  type: "ProducerDelegationRevoked",
  data: {
    delegation: {
      ...ProducerDelegationSubmitted.data.delegation!,
      state: DelegationStateV2.REVOKED,
    },
  },
};

export const DelegationEventTypeV2 = z.union([
  z.literal("ProducerDelegationSubmitted"),
  z.literal("ProducerDelegationApproved"),
  z.literal("ProducerDelegationRejected"),
  z.literal("ProducerDelegationRevoked"),
]);
export type DelegationEventTypeV2 = z.infer<typeof DelegationEventTypeV2>;

export function getDelegationEventV2ByType(
  type: DelegationEventTypeV2,
): DelegationEventV2 {
  return match(type)
    .with("ProducerDelegationSubmitted", () => ProducerDelegationSubmitted)
    .with("ProducerDelegationApproved", () => ProducerDelegationApproved)
    .with("ProducerDelegationRejected", () => ProducerDelegationRejected)
    .with("ProducerDelegationRevoked", () => ProducerDelegationRevoked)
    .exhaustive();
}
