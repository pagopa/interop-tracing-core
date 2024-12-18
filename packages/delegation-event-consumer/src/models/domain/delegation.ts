import z from "zod";

export const delegationState = {
  waiting_for_approval: "WAITING_FOR_APPROVAL",
  active: "ACTIVE",
  rejected: "REJECTED",
  revoked: "REVOKED",
} as const;

export const DelegationState = z.enum([
  Object.values(delegationState)[0],
  ...Object.values(delegationState).slice(1),
]);

export enum DelegationStateV2 {
  WAITING_FOR_APPROVAL = 0,
  ACTIVE = 1,
  REJECTED = 2,
  REVOKED = 3,
}

export enum DelegationKindV2 {
  DELEGATED_PRODUCER = 0,
  DELEGATED_CONSUMER = 1,
}

export const DelegationV2 = z.object({
  id: z.string(),
  delegatorId: z.string(),
  delegateId: z.string(),
  eserviceId: z.string(),
  createdAt: z.bigint(),
  submittedAt: z.bigint(),
  approvedAt: z.bigint().optional(),
  rejectedAt: z.bigint().optional(),
  rejectionReason: z.string().optional(),
  revokedAt: z.bigint().optional(),
  state: z.nativeEnum(DelegationStateV2),
  kind: z.nativeEnum(DelegationKindV2),
});

export type DelegationV2 = z.infer<typeof DelegationV2>;

export type DelegationState = z.infer<typeof DelegationState>;
