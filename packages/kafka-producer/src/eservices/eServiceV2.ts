/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EServiceEvent,
  EServiceEventV2,
  EServiceModeV2,
  EServiceTechnologyV2,
} from "@pagopa/interop-outbound-models";
import { match } from "ts-pattern";
import { z } from "zod";
import { tenantIdV2 } from "../tenants/tenantsV2.js";

export const eServiceIdV2 = "6d2ceb4c-7a83-4b6d-9e7c-316edb289a8d";

const eServiceAddedEventV2: EServiceEvent = {
  event_version: 2,
  type: "EServiceAdded",
  data: {
    eservice: {
      id: eServiceIdV2,
      producerId: tenantIdV2,
      createdAt: "1" as any,
      description: "eService test description",
      mode: EServiceModeV2.RECEIVE,
      name: "eService test name",
      technology: EServiceTechnologyV2.REST,
      descriptors: [],
    },
  },
  stream_id: "1",
  version: 1,
  timestamp: new Date(),
};

const eServiceCloned: EServiceEvent = {
  event_version: 2,
  type: "EServiceCloned",
  timestamp: new Date(),
  stream_id: "1",
  version: 2,
  data: {
    sourceDescriptorId: "",
    eservice: {
      id: eServiceIdV2,
      producerId: tenantIdV2,
      createdAt: "1" as any,
      description: "eService test description",
      mode: EServiceModeV2.RECEIVE,
      name: "eService test name",
      technology: EServiceTechnologyV2.REST,
      descriptors: [],
    },
  },
};

const EServiceDescriptionUpdated: EServiceEventV2 = {
  event_version: 2,
  version: 1,
  type: "EServiceDescriptionUpdated",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    eservice: {
      description: "Description updated",
      technology: EServiceTechnologyV2.REST,
      id: eServiceIdV2,
      name: "",
      producerId: tenantIdV2,
      descriptors: [],
      createdAt: "1" as any,
      mode: EServiceModeV2.RECEIVE,
    },
  },
};

const EserviceDeleted: EServiceEventV2 = {
  event_version: 2,
  version: 1,
  type: "EServiceDeleted",
  timestamp: new Date(),
  stream_id: "1",
  data: {
    eserviceId: eServiceIdV2,
  },
};

export const EserviceEventTypeV2 = z.union([
  z.literal("EServiceAdded"),
  z.literal("EServiceCloned"),
  z.literal("EServiceDescriptionUpdated"),
  z.literal("EServiceDeleted"),
]);
export type EserviceEventTypeV2 = z.infer<typeof EserviceEventTypeV2>;

export function getEserviceEventV2ByType(
  type: EserviceEventTypeV2,
): EServiceEvent {
  return match(type)
    .with("EServiceAdded", () => eServiceAddedEventV2)
    .with("EServiceCloned", () => eServiceCloned)
    .with("EServiceDescriptionUpdated", () => EServiceDescriptionUpdated)
    .with("EServiceDeleted", () => EserviceDeleted)
    .exhaustive();
}
