import {
  EServiceAddedV1,
  EServiceDescriptorStateV1,
  EServiceDescriptorV1,
  EServiceEvent,
  EServiceEventV1,
  EServiceTechnologyV1,
} from "@pagopa/interop-outbound-models";
import { randomUUID } from "crypto";
import { match } from "ts-pattern";
import { z } from "zod";
import { tenantIdV1 } from "../tenants/tenantsV1.js";

export const eServiceIdV1 = randomUUID();

const eServiceAddedV1: EServiceAddedV1 = {
  eservice: {
    description: "",
    descriptors: [],
    id: eServiceIdV1,
    name: "Eservice-test",
    producerId: tenantIdV1,
    technology: 1,
  },
};

const eServiceAddedEvent: EServiceEvent = {
  event_version: 1,
  type: "EServiceAdded",
  data: eServiceAddedV1,
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

const eServiceDescriptorAdded: EServiceEvent = {
  event_version: 1,
  type: "EServiceDescriptorAdded",
  timestamp: new Date(),
  stream_id: "1",
  version: 2,
  data: {
    eserviceId: eServiceIdV1,
    eserviceDescriptor: descriptor,
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

export const EserviceEventType = z.union([
  z.literal("EServiceAdded"),
  z.literal("EServiceDescriptorAdded"),
  z.literal("EServiceUpdated"),
  z.literal("EServiceDeleted"),
]);
export type EserviceEventType = z.infer<typeof EserviceEventType>;

export function getEserviceEventV1ByType(
  type: EserviceEventType,
): EServiceEvent {
  return match(type)
    .with("EServiceAdded", () => eServiceAddedEvent)
    .with("EServiceDescriptorAdded", () => eServiceDescriptorAdded)
    .with("EServiceUpdated", () => EserviceUpdated)
    .with("EServiceDeleted", () => EserviceDeleted)
    .exhaustive();
}
