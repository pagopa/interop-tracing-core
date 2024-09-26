/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EServiceDescriptorStateV1,
  EServiceDescriptorV1,
  EServiceEvent,
  EServiceEventV1,
  EServiceTechnologyV1,
} from "@pagopa/interop-outbound-models";
import { match } from "ts-pattern";
import { z } from "zod";
import { tenantIdV1 } from "../tenants/tenantsV1.js";
import { randomUUID } from "crypto";

export const eServiceIdV1 = randomUUID();

const EServiceAdded: EServiceEvent = {
  event_version: 1,
  type: "EServiceAdded",
  data: {
    eservice: {
      description: "",
      descriptors: [],
      id: eServiceIdV1,
      name: "Eservice-test",
      producerId: tenantIdV1,
      technology: 1,
    },
  },
  stream_id: "1",
  version: 1,
  timestamp: new Date(),
};

const descriptor: EServiceDescriptorV1 = {
  id: eServiceIdV1,
  audience: [],
  serverUrls: [],
  version: "1",
  state: EServiceDescriptorStateV1.PUBLISHED,
  dailyCallsTotal: 10,
  dailyCallsPerConsumer: 10,
  docs: [],
  voucherLifespan: 10,
};

const ClonedEServiceAdded: EServiceEventV1 = {
  event_version: 1,
  version: 1,
  type: "ClonedEServiceAdded",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    eservice: {
      description: "",
      technology: EServiceTechnologyV1.REST,
      id: eServiceIdV1,
      name: "",
      producerId: tenantIdV1,
      descriptors: [descriptor, descriptor],
    },
  },
};

const EserviceUpdated: EServiceEventV1 = {
  event_version: 1,
  version: 1,
  type: "EServiceUpdated",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    eservice: {
      description: "",
      technology: EServiceTechnologyV1.REST,
      id: eServiceIdV1,
      name: "",
      producerId: tenantIdV1,
      descriptors: [descriptor, descriptor],
    },
  },
};

const EserviceDeleted: EServiceEventV1 = {
  event_version: 1,
  version: 1,
  type: "EServiceDeleted",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    eserviceId: eServiceIdV1,
  },
};

export const EserviceEventTypeV1 = z.union([
  z.literal("EServiceAdded"),
  z.literal("ClonedEServiceAdded"),
  z.literal("EServiceUpdated"),
  z.literal("EServiceDeleted"),
]);
export type EserviceEventTypeV1 = z.infer<typeof EserviceEventTypeV1>;

export function getEserviceEventV1ByType(
  type: EserviceEventTypeV1,
): EServiceEvent {
  return match(type)
    .with("EServiceAdded", () => EServiceAdded)
    .with("ClonedEServiceAdded", () => ClonedEServiceAdded)
    .with("EServiceUpdated", () => EserviceUpdated)
    .with("EServiceDeleted", () => EserviceDeleted)
    .exhaustive();
}
