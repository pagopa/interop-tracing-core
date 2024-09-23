import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import {
  createEserviceAddedEventV2,
  createV2Event,
  mockApiClientError,
  mockEserviceCloneV2,
  mockEserviceDeleteV2,
} from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import {
  generateId,
  InternalError,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { handleMessageV2 } from "../src/handlers/messageHandlerV2.js";
import { ErrorCodes, errorSaveEservice } from "../src/models/domain/errors.js";
import { EServiceDescriptorStateV2 } from "@pagopa/interop-outbound-models";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Message handler V2 test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: uuidv4(),
  };

  describe("EserviceAdded Event", () => {
    it("save a new Eservice for EServiceAdded event should return a successfully response", async () => {
      const eServiceId = generateId();
      const descriptorId = generateId();
      const producerId = "producer-test-idV2";

      const eServiceV2 = createV2Event(
        eServiceId,
        descriptorId,
        producerId,
        EServiceDescriptorStateV2.DRAFT,
      );

      const eServiceV2Event = createEserviceAddedEventV2(eServiceV2);

      vi.spyOn(apiClient, "saveEservice").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV2(
            eServiceV2Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveEservice).toBeCalled();
    });

    it("save a new Eservice for EServiceAdded event should return an exception kafkaMessageMissingData", async () => {
      const eServiceId = generateId();
      const descriptorId = generateId();
      const producerId = "producer-test-idV2";

      const eServiceV2 = createV2Event(
        eServiceId,
        descriptorId,
        producerId,
        EServiceDescriptorStateV2.DRAFT,
      );

      const eServiceV2Event = createEserviceAddedEventV2(eServiceV2);

      await expect(
        handleMessageV2(
          { ...eServiceV2Event, data: {} as any }, // eslint-disable-line @typescript-eslint/no-explicit-any
          operationsService,
          ctx,
          genericLogger,
        ),
      ).rejects.toThrow(
        kafkaMessageMissingData(config.kafkaTopic, eServiceV2Event.type),
      );
    });

    it("save a new Eservice for EServiceAdded event should return an exception errorSaveEservice with validation body error", async () => {
      const eServiceId = generateId();
      const descriptorId = generateId();
      const producerId = "producer-test-idV2";

      const eServiceV2 = createV2Event(
        eServiceId,
        descriptorId,
        producerId,
        EServiceDescriptorStateV2.DRAFT,
      );

      const eServiceV2Event = createEserviceAddedEventV2(eServiceV2);

      const zodiosValidationError =
        "Error: Zodios: Invalid Body parameter 'body'";

      await expect(
        handleMessageV2(eServiceV2Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        errorSaveEservice(
          `Error saving eService: ${eServiceId}, tenantId: ${producerId}. Details: ${zodiosValidationError}`,
        ),
      );
    });

    it("save a new Eservice for EServiceAdded event should return generic exception errorSaveEservice", async () => {
      const eServiceId = generateId();
      const descriptorId = generateId();
      const producerId = "producer-test-idV2";

      const eServiceV2 = createV2Event(
        eServiceId,
        descriptorId,
        producerId,
        EServiceDescriptorStateV2.DRAFT,
      );

      const eServiceV2Event = createEserviceAddedEventV2(eServiceV2);

      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveEservice").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV2(
          eServiceV2Event,
          operationsService,
          ctx,
          genericLogger,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorSaveEservice",
        );
      }
    });
  });

  describe("EServiceDeleted Event", () => {
    it("delete an Eservice for EServiceDeleted event should return a successfully response", async () => {
      vi.spyOn(apiClient, "deleteEservice").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV2(
            mockEserviceDeleteV2,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.deleteEservice).toBeCalled();
    });

    it("delete an Eservice for EServiceDeleted event should return an exception errorDeleteEservice", async () => {
      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "deleteEservice").mockRejectedValueOnce(
        apiClientError,
      );

      try {
        await handleMessageV2(
          mockEserviceDeleteV2,
          operationsService,
          ctx,
          genericLogger,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorDeleteEservice",
        );
      }
    });
  });

  describe("EserviceClone Event", () => {
    it("clone an Eservice for EserviceClone event should return a successfully response", async () => {
      vi.spyOn(apiClient, "saveEservice").mockResolvedValueOnce(undefined);

      await handleMessageV2(
        mockEserviceCloneV2,
        operationsService,
        ctx,
        genericLogger,
      );

      expect(apiClient.saveEservice).toBeCalled();
    });
  });

  describe("Events to be ignored", () => {
    it("invoking handleMessageV1 should ignore specific event types and log an info message for each ignored event", async () => {
      const spy = vi.spyOn(genericLogger, "info");

      const events = [
        { type: "EServiceDescriptorDocumentAdded" },
        { type: "EServiceDescriptorDocumentDeleted" },
        { type: "EServiceDescriptorDocumentUpdated" },
        { type: "EServiceDescriptorInterfaceAdded" },
        { type: "EServiceDescriptorInterfaceDeleted" },
        { type: "EServiceDescriptorQuotasUpdated" },
        { type: "EServiceDescriptorInterfaceDeleted" },
        { type: "EServiceDescriptorInterfaceUpdated" },
        { type: "EServiceDescriptorQuotasUpdated" },
        { type: "DraftEServiceUpdated" },
        { type: "EServiceDraftDescriptorDeleted" },
        { type: "EServiceDescriptorAdded" },
        { type: "EServiceDescriptorActivated" },
        { type: "EServiceDescriptorArchived" },
        { type: "EServiceDescriptorPublished" },
        { type: "EServiceDescriptorSuspended" },
        { type: "EServiceDraftDescriptorUpdated" },
      ];

      for (const event of events) {
        await handleMessageV2(
          {
            event_version: 2,
            version: 1,
            type: event.type as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            timestamp: new Date(),
            stream_id: "1",
            data: {},
          },
          operationsService,
          ctx,
          genericLogger,
        );

        expect(spy).toHaveBeenCalledWith(`Skip event (not relevant)`);
      }

      expect(spy).toHaveBeenCalledTimes(events.length);
    });
  });
});
