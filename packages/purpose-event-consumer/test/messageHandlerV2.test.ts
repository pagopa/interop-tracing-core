import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import {
  createPurposeActivatedEventV2,
  generateID,
  getMockPurpose,
  getMockPurposeVersion,
} from "./utils.js";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import {
  CorrelationId,
  generateId,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { handleMessageV2 } from "../src/handlers/messageHandlerV2.js";
import {
  PurposeEventV2,
  PurposeV2,
  PurposeVersionV2,
} from "@pagopa/interop-outbound-models";
import { errorInvalidVersion } from "../src/models/domain/errors.js";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Operations service test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: generateId<CorrelationId>(),
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

  describe("Purpose Events to be ignored", () => {
    it("invoking handleMessageV2 should ignore specific event types and log an info message for each ignored event", async () => {
      const spy = vi.spyOn(genericLogger, "info");

      const events: Pick<PurposeEventV2, "type">[] = [
        { type: "PurposeVersionUnsuspendedByProducer" },
        { type: "PurposeVersionUnsuspendedByConsumer" },
        { type: "PurposeVersionSuspendedByProducer" },
        { type: "PurposeVersionSuspendedByConsumer" },
        { type: "PurposeVersionOverQuotaUnsuspended" },
        { type: "PurposeArchived" },
        { type: "PurposeAdded" },
        { type: "DraftPurposeUpdated" },
        { type: "PurposeWaitingForApproval" },
        { type: "DraftPurposeDeleted" },
        { type: "WaitingForApprovalPurposeDeleted" },
        { type: "NewPurposeVersionWaitingForApproval" },
        { type: "WaitingForApprovalPurposeVersionDeleted" },
        { type: "PurposeVersionRejected" },
        { type: "PurposeCloned" },
        { type: "PurposeVersionArchivedByRevokedDelegation" },
        { type: "PurposeDeletedByRevokedDelegation" },
        { type: "RiskAnalysisDocumentGenerated" },
        { type: "RiskAnalysisSignedDocumentGenerated" },
      ];

      for (const event of events) {
        await handleMessageV2(
          {
            event_version: 2,
            version: 1,
            type: event.type,
            timestamp: new Date(),
            stream_id: "1",
            data: {},
          } as PurposeEventV2,
          operationsService,
          ctx,
          genericLogger,
        );

        expect(spy).toHaveBeenCalledWith(
          `Skip event ${event.type} (not relevant)`,
        );
      }

      expect(spy).toHaveBeenCalledTimes(events.length);
    });
  });
});
