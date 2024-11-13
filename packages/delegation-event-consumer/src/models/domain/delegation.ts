import z from "zod";

export const delegationState = {
  waiting_for_approval: "WAITING", // TODO: must become -> WAITING_FOR_APPROVAL
  active: "ACTIVE",
  rejected: "REJECTED",
  revoked: "REVOKED",
} as const;

export const DelegationState = z.enum([
  Object.values(delegationState)[0],
  ...Object.values(delegationState).slice(1),
]);

export type DelegationState = z.infer<typeof DelegationState>;
