/* eslint-disable @typescript-eslint/no-explicit-any */

import { PurposeEvent, PurposeEventV2 } from "@pagopa/interop-outbound-models";
import { randomUUID } from "crypto";
import { match } from "ts-pattern";
import { z } from "zod";
import { tenantIdV2 } from "../tenants/tenantsV2.js";
import { eServiceIdV2 } from "../eservices/eServiceV2.js";

const purposeIdV2 = randomUUID();

export const PurposeAdded: PurposeEventV2 = {
  type: "PurposeAdded",
  timestamp: new Date(),
  event_version: 2,
  version: 1,
  stream_id: randomUUID(),
  data: {
    purpose: {
      id: purposeIdV2,
      eserviceId: eServiceIdV2,
      consumerId: tenantIdV2,
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
      title: "This is a Purpose for testing event consuming V2",
      description: "This is a description for a test purpose",
      createdAt: "1" as any,
      isFreeOfCharge: false,
    },
  },
};

export const PurposeActivated: PurposeEventV2 = {
  ...PurposeAdded,
  type: "PurposeActivated",
};

export const PurposeEventTypeV2 = z.union([
  z.literal("PurposeAdded"),
  z.literal("PurposeActivated"),
]);
export type PurposeEventTypeV2 = z.infer<typeof PurposeEventTypeV2>;

export function getPurposeEventV2ByType(
  type: PurposeEventTypeV2,
): PurposeEvent {
  return match(type)
    .with("PurposeAdded", () => PurposeAdded)
    .with("PurposeActivated", () => PurposeActivated)
    .exhaustive();
}
