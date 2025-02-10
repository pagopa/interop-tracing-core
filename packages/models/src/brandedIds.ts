import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const TenantId = z.string().uuid().brand("TenantId");
export type TenantId = z.infer<typeof TenantId>;

export const PurposeId = z.string().uuid().brand("PurposeId");
export type PurposeId = z.infer<typeof PurposeId>;

export const PurposeErrorId = z.string().uuid().brand("PurposeErrorId");
export type PurposeErrorId = z.infer<typeof PurposeErrorId>;

export const TracingId = z.string().uuid().brand("TracingId");
export type TracingId = z.infer<typeof TracingId>;

export const EserviceId = z.string().uuid().brand("EserviceId");
export type EserviceId = z.infer<typeof EserviceId>;

export const CorrelationId = z.string().uuid().brand("CorrelationId");
export type CorrelationId = z.infer<typeof CorrelationId>;

export const DelegationId = z.string().uuid().brand("DelegationId");
export type DelegationId = z.infer<typeof DelegationId>;

type IDS =
  | TenantId
  | PurposeId
  | TracingId
  | PurposeErrorId
  | EserviceId
  | CorrelationId
  | DelegationId;

// This function is used to generate a new ID for a new object
// it infers the type of the ID based on how is used the result
// the 'as' is used to cast the uuid string to the inferred type
export function generateId<T extends IDS>(): T {
  return uuidv4() as T;
}

// This function is used to get a branded ID from a string
// it's an unsafe function because it doesn't check if the string
// is a valid uuid and it doen't check if the string rappresent
// a valid ID for the type.
// The user of this function must be sure that the string is a valid
// uuid and that the string rappresent a valid ID for the type
export function unsafeBrandId<T extends IDS>(id: string): T {
  return id as T;
}
