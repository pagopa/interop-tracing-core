import { PurposeEvent, PurposeEventV1 } from "@pagopa/interop-outbound-models";
import { randomUUID } from "crypto";
import { match } from "ts-pattern";
import { z } from "zod";
import { tenantIdV1 } from "../tenants/tenantsV1.js";
import { eServiceIdV1 } from "../eservices/eServiceV1.js";

const purposeIdV1 = randomUUID();

export const PurposeCreated: PurposeEventV1 = {
  type: "PurposeVersionActivated",
  timestamp: new Date(),
  event_version: 1,
  version: 1,
  stream_id: randomUUID(),
  data: {
    purpose: {
      id: purposeIdV1,
      eserviceId: eServiceIdV1,
      consumerId: tenantIdV1,
      versions: [],
      title: "This is a Purpose for testing event consuming V1",
      description: "This is a description for a test purpose",
      createdAt: 1n,
      isFreeOfCharge: false,
    },
  },
};

export const PurposeVersionActivated: PurposeEventV1 = {
  ...PurposeCreated,
};

export const PurposeUpdated: PurposeEventV1 = {
  ...PurposeCreated,
};

export const PurposeEventType = z.union([
  z.literal("PurposeCreated"),
  z.literal("PurposeUpdated"),
  z.literal("PurposeVersionActivated"),
]);
export type PurposeEventType = z.infer<typeof PurposeEventType>;

export function getPurposeEventV1ByType(type: PurposeEventType): PurposeEvent {
  return match(type)
    .with("PurposeCreated", () => PurposeCreated)
    .with("PurposeUpdated", () => PurposeUpdated)
    .with("PurposeVersionActivated", () => PurposeVersionActivated)
    .exhaustive();
}
