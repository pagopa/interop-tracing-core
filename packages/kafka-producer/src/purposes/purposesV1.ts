/* eslint-disable @typescript-eslint/no-explicit-any */
import { PurposeEvent, PurposeEventV1 } from "@pagopa/interop-outbound-models";
import { randomUUID } from "crypto";
import { match } from "ts-pattern";
import { z } from "zod";
import { tenantIdV1 } from "../tenants/tenantsV1.js";
import { eServiceIdV1 } from "../eservices/eServiceV1.js";

const purposeIdV1 = "cb488fcc-64c0-41ce-93d3-4f1c7d11cf2b";

export const PurposeCreated: PurposeEventV1 = {
  type: "PurposeCreated",
  timestamp: new Date(),
  event_version: 1,
  version: 1,
  stream_id: randomUUID(),
  data: {
    purpose: {
      id: purposeIdV1,
      eserviceId: eServiceIdV1,
      consumerId: tenantIdV1,
      versions: [
        {
          id: "9945585d-5b8a-4ec7-841e-c882c0886c15",
          state: 2,
          dailyCalls: 10,
          createdAt: "1" as any,
          updatedAt: "1" as any,
          firstActivationAt: "1" as any,
        },
      ],
      title: "This is a Purpose for testing event consuming V1",
      description: "This is a description for a test purpose",
      createdAt: "1" as any,
      isFreeOfCharge: false,
    },
  },
};

export const PurposeVersionActivated: PurposeEventV1 = {
  ...PurposeCreated,
  type: "PurposeVersionActivated",
};

export const PurposeUpdated: PurposeEventV1 = {
  ...PurposeCreated,
  type: "PurposeUpdated",
  data: {
    purpose: {
      id: purposeIdV1,
      eserviceId: eServiceIdV1,
      consumerId: tenantIdV1,
      versions: [
        {
          id: "9945585d-5b8a-4ec7-841e-c882c0886c15",
          state: 2,
          dailyCalls: 10,
          createdAt: "1" as any,
          updatedAt: "1" as any,
          firstActivationAt: "1" as any,
        },
      ],
      title: "Title updated",
      description: "Description updated",
      createdAt: "1" as any,
      isFreeOfCharge: false,
    },
  },
};

export const PurposeEventTypeV1 = z.union([
  z.literal("PurposeCreated"),
  z.literal("PurposeUpdated"),
  z.literal("PurposeVersionActivated"),
]);
export type PurposeEventTypeV1 = z.infer<typeof PurposeEventTypeV1>;

export function getPurposeEventV1ByType(
  type: PurposeEventTypeV1,
): PurposeEvent {
  return match(type)
    .with("PurposeCreated", () => PurposeCreated)
    .with("PurposeUpdated", () => PurposeUpdated)
    .with("PurposeVersionActivated", () => PurposeVersionActivated)
    .exhaustive();
}
