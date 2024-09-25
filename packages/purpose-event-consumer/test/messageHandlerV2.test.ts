import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import {
  createAPurposeEventV2,
  createAPurposeVersionEventV2,
  createPurposeActivatedEventV2,
  generateID,
  getMockPurpose,
  getMockPurposeVersion,
} from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import { kafkaMessageMissingData } from "pagopa-interop-tracing-models";
import { handleMessageV2 } from "../src/handlers/messageHandlerV2.js";
import { PurposeV2, PurposeVersionV2 } from "@pagopa/interop-outbound-models";
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
      const mockPurposeV2 = {
        ...getMockPurpose(),
        isFreeOfCharge: false,
      } as PurposeV2;
      const mockPurposeVersionV2 = getMockPurposeVersion() as PurposeVersionV2;
      const purpose: PurposeV2 = {
        ...mockPurposeV2,
        versions: [mockPurposeVersionV2],
      };

      const savePurposeSpy = vi
        .spyOn(apiClient, "savePurpose")
        .mockResolvedValueOnce(undefined);

      const purposeV2Event = createPurposeActivatedEventV2(
        purpose,
        generateID(),
      );

      expect(
        async () =>
          await handleMessageV2(
            purposeV2Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(savePurposeSpy).toBeCalled();
    });

    it("save a new purpose without data for PurposeActivated event should return an exception kafkaMessageMissingData", async () => {
      const purposeV2Event = createPurposeActivatedEventV2(
        undefined,
        generateID(),
      );

      await expect(
        handleMessageV2(purposeV2Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        kafkaMessageMissingData(config.kafkaTopic, purposeV2Event.type),
      );
    });

    it("Should ignore these events: PurposeAdded, DraftPurposeUpdated, PurposeWaitingForApproval, DraftPurposeDeleted, WaitingForApprovalPurposeDeleted, NewPurposeVersionActivated, PurposeVersionActivated, PurposeVersionUnsuspendedByProducer, PurposeVersionUnsuspendedByConsumer, PurposeVersionSuspendedByProducer, PurposeVersionSuspendedByConsumer, NewPurposeVersionWaitingForApproval, PurposeVersionOverQuotaUnsuspended, PurposeArchived", async () => {
      const mockPurposeV2 = getMockPurpose() as PurposeV2;
      const mockPurposeVersionV2 = getMockPurposeVersion() as PurposeVersionV2;
      const savePurposeSpy = vi
        .spyOn(apiClient, "savePurpose")
        .mockResolvedValueOnce(undefined);

      const eventTypes = [
        "PurposeAdded",
        "DraftPurposeUpdated",
        "PurposeWaitingForApproval",
        "DraftPurposeDeleted",
        "WaitingForApprovalPurposeDeleted",
      ] as const;

      const eventVersionTypes = [
        "NewPurposeVersionActivated",
        "PurposeVersionActivated",
        "PurposeVersionUnsuspendedByProducer",
        "PurposeVersionUnsuspendedByConsumer",
        "PurposeVersionSuspendedByProducer",
        "PurposeVersionSuspendedByConsumer",
        "NewPurposeVersionWaitingForApproval",
        "PurposeVersionOverQuotaUnsuspended",
        "PurposeArchived",
        "WaitingForApprovalPurposeVersionDeleted",
        "PurposeVersionRejected",
        "PurposeCloned",
      ] as const;

      const purpose: PurposeV2 = {
        ...mockPurposeV2,
        versions: [mockPurposeVersionV2],
      };

      for (const eventType of eventTypes) {
        const purposeEventV2 = createAPurposeEventV2(eventType, purpose);
        await handleMessageV2(
          purposeEventV2,
          operationsService,
          ctx,
          genericLogger,
        );
        expect(savePurposeSpy).not.toBeCalled();
      }

      for (const eventVersionType of eventVersionTypes) {
        const purposeEventV2 = createAPurposeVersionEventV2(
          eventVersionType,
          purpose,
        );
        await handleMessageV2(
          purposeEventV2,
          operationsService,
          ctx,
          genericLogger,
        );
        expect(savePurposeSpy).not.toBeCalled();
      }
    });

    it("Should throw errorInvalidVersion if versions has no valid state", async () => {
      const mockPurposeV2 = getMockPurpose() as PurposeV2;
      const purpose: PurposeV2 = {
        ...mockPurposeV2,
        versions: [],
      };

      const purposeV2Event = createPurposeActivatedEventV2(
        purpose,
        generateID(),
      );

      expect(
        async () =>
          await handleMessageV2(
            purposeV2Event,
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
