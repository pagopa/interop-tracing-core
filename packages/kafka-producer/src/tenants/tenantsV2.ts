/* eslint-disable @typescript-eslint/no-explicit-any */
import { TenantEvent, TenantEventV2 } from "@pagopa/interop-outbound-models";
import { randomUUID } from "crypto";
import { match } from "ts-pattern";
import { z } from "zod";

export const tenantIdV2 = randomUUID();

export const TenantOnboarded: TenantEventV2 = {
  type: "TenantOnboardDetailsUpdated",
  timestamp: new Date(),
  event_version: 2,
  version: 1,
  stream_id: randomUUID(),
  data: {
    tenant: {
      id: tenantIdV2,
      name: "pagoPa",
      selfcareId: "selfcareId",
      externalId: {
        origin: "origin",
        value: randomUUID(),
      },
      features: [],
      attributes: [],
      createdAt: "1" as any,
      onboardedAt: "1" as any,
    },
  },
};

export const TenantOnboardDetailsUpdated: TenantEventV2 = {
  type: "TenantOnboardDetailsUpdated",
  timestamp: new Date(),
  event_version: 2,
  version: 1,
  stream_id: randomUUID(),
  data: {
    tenant: {
      id: tenantIdV2,
      name: "pagoPa name updated",
      selfcareId: "selfcareId",
      externalId: {
        origin: "origin",
        value: randomUUID(),
      },
      features: [],
      attributes: [],
      createdAt: "1" as any,
      onboardedAt: "1" as any,
    },
  },
};

export const MaintenanceTenantDeleted: TenantEventV2 = {
  event_version: 2,
  version: 1,
  type: "MaintenanceTenantDeleted",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    tenantId: tenantIdV2,
  },
};

export const TenantEventTypeV2 = z.union([
  z.literal("TenantOnboarded"),
  z.literal("TenantOnboardDetailsUpdated"),
  z.literal("MaintenanceTenantDeleted"),
]);
export type TenantEventTypeV2 = z.infer<typeof TenantEventTypeV2>;

export function getTenantEventV2ByType(type: TenantEventTypeV2): TenantEvent {
  return match(type)
    .with("TenantOnboarded", () => TenantOnboarded)
    .with("TenantOnboardDetailsUpdated", () => TenantOnboardDetailsUpdated)
    .with("MaintenanceTenantDeleted", () => MaintenanceTenantDeleted)
    .exhaustive();
}
