import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import {
  createAPurposeEventV1,
  createAPurposeVersionEventV1,
  createPurposeActivatedEventV1,
  generateID,
  getMockPurpose,
  getMockPurposeVersion,
} from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import { kafkaMessageMissingData } from "pagopa-interop-tracing-models";
import { handleMessageV1 } from "../src/handlers/messageHandlerV1.js";
import {
  PurposeStateV1,
  PurposeV1,
  PurposeVersionV1,
} from "@pagopa/interop-outbound-models";
import { errorInvalidVersion } from "../src/models/domain/errors.js";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Operations service test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: uuidv4(),
  };

  describe("PurposeActivated Event", () => {
    it("save a new purpose for PurposeActivated event should return a successfully response", async () => {
      const mockPurposeV1 = getMockPurpose() as PurposeV1;
      const mockPurposeVersionV1 = getMockPurposeVersion(
        PurposeStateV1.ACTIVE,
      ) as PurposeVersionV1;
      const purpose: PurposeV1 = {
        ...mockPurposeV1,
        versions: [mockPurposeVersionV1],
      };

      const savePurposeSpy = vi
        .spyOn(apiClient, "savePurpose")
        .mockResolvedValueOnce(undefined);

      const purposeV1Event = createPurposeActivatedEventV1(
        purpose,
        generateID(),
      );

      expect(
        async () =>
          await handleMessageV1(
            purposeV1Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(savePurposeSpy).toBeCalled();
    });

    it("save a new purpose without data for PurposeActivated event should return an exception kafkaMessageMissingData", async () => {
      const purposeV1Event = createPurposeActivatedEventV1(
        undefined,
        generateID(),
      );

      await expect(
        handleMessageV1(purposeV1Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        kafkaMessageMissingData(config.kafkaTopic, purposeV1Event.type),
      );
    });

    it("Should ignore these events: PurposeCreated, PurposeUpdated, PurposeVersionWaitedForApproval, PurposeVersionCreated, PurposeVersionUpdated, PurposeVersionDeleted, PurposeVersionRejected, PurposeDeleted, PurposeVersionSuspended, PurposeVersionArchived", async () => {
      const mockPurposeV1 = getMockPurpose() as PurposeV1;
      const mockPurposeVersionV1 = getMockPurposeVersion() as PurposeVersionV1;
      const savePurposeSpy = vi
        .spyOn(apiClient, "savePurpose")
        .mockResolvedValueOnce(undefined);

      const eventTypes = [
        "PurposeCreated",
        "PurposeUpdated",
        "PurposeVersionWaitedForApproval",
      ] as const;

      const eventVersionTypes = [
        "PurposeVersionCreated",
        "PurposeVersionUpdated",
        "PurposeVersionDeleted",
        "PurposeVersionRejected",
        "PurposeDeleted",
      ] as const;

      const purpose: PurposeV1 = {
        ...mockPurposeV1,
        versions: [mockPurposeVersionV1],
      };

      for (const eventType of eventTypes) {
        const purposeEventV1 = createAPurposeEventV1(eventType, purpose);
        await handleMessageV1(
          purposeEventV1,
          operationsService,
          ctx,
          genericLogger,
        );
        expect(savePurposeSpy).not.toBeCalled();
      }

      for (const eventVersionType of eventVersionTypes) {
        const purposeEventV1 = createAPurposeVersionEventV1(
          eventVersionType,
          purpose,
        );
        await handleMessageV1(
          purposeEventV1,
          operationsService,
          ctx,
          genericLogger,
        );
        expect(savePurposeSpy).not.toBeCalled();
      }
    });

    it("Should throw errorInvalidVersion if versions has no valid state", async () => {
      const mockPurposeV1 = getMockPurpose() as PurposeV1;
      const purpose: PurposeV1 = {
        ...mockPurposeV1,
        versions: [],
      };

      const purposeV1Event = createPurposeActivatedEventV1(
        purpose,
        generateID(),
      );

      expect(
        async () =>
          await handleMessageV1(
            purposeV1Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).rejects.toThrow(
        errorInvalidVersion(
          `Missing valid version within versions Array for purposeId ${purpose.id}`,
        ),
      );
    });
  });
});
