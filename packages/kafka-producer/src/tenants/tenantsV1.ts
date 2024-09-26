/* eslint-disable @typescript-eslint/no-explicit-any */
import { TenantEvent, TenantEventV1 } from "@pagopa/interop-outbound-models";
import { randomUUID } from "crypto";
import { match } from "ts-pattern";
import { z } from "zod";

export const tenantIdV1 = randomUUID();

export const TenantCreated: TenantEventV1 = {
  type: "TenantCreated",
  timestamp: new Date(),
  event_version: 1,
  version: 1,
  stream_id: randomUUID(),
  data: {
    tenant: {
      id: tenantIdV1,
      name: "tenant name",
      externalId: {
        origin: "origin",
        value: randomUUID(),
      },
      features: [],
      attributes: [],
      createdAt: "1" as any,
    },
  },
};

export const TenantUpdated: TenantEventV1 = {
  type: "TenantUpdated",
  timestamp: new Date(),
  event_version: 1,
  version: 1,
  stream_id: randomUUID(),
  data: {
    tenant: {
      id: tenantIdV1,
      name: "tenant name",
      externalId: {
        origin: "origin",
        value: randomUUID(),
      },
      features: [],
      attributes: [],
      createdAt: "1" as any,
    },
  },
};

export const TenantDeleted: TenantEventV1 = {
  event_version: 1,
  version: 1,
  type: "TenantDeleted",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    tenantId: tenantIdV1,
  },
};

export const TenantEventTypeV1 = z.union([
  z.literal("TenantCreated"),
  z.literal("TenantUpdated"),
  z.literal("TenantDeleted"),
]);
export type TenantEventTypeV1 = z.infer<typeof TenantEventTypeV1>;

export function getTenantEventV1ByType(type: TenantEventTypeV1): TenantEvent {
  return match(type)
    .with("TenantCreated", () => TenantCreated)
    .with("TenantUpdated", () => TenantUpdated)
    .with("TenantDeleted", () => TenantDeleted)
    .exhaustive();
}
