import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import {
  createEserviceAddedEventV1,
  createEServiceV1,
  mockApiClientError,
  mockClonedEServiceAddedV1,
  mockEserviceDeleteV1,
  mockEserviceUpdateV1,
} from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import {
  generateId,
  InternalError,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { handleMessageV1 } from "../src/handlers/messageHandlerV1.js";
import { ErrorCodes, errorSaveEservice } from "../src/models/domain/errors.js";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Message handler V1 test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: uuidv4(),
  };

  describe("EserviceAdded Event", () => {
    it("save a new Eservice for EServiceAdded event should return a successfully response", async () => {
      const eServiceId = generateId();
      const producerId = "producer-test-id";
      const eserviceV1 = createEServiceV1({
        id: eServiceId,
        producerId,
        descriptors: [],
      });

      const eServiceV1Event = createEserviceAddedEventV1(
        eserviceV1,
        generateId(),
      );

      vi.spyOn(apiClient, "saveEservice").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV1(
            eServiceV1Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveEservice).toBeCalled();
    });

    it("save a new Eservice for EServiceAdded event should return an exception kafkaMessageMissingData", async () => {
      const eServiceV1Event = createEserviceAddedEventV1(
        undefined,
        generateId(),
      );

      await expect(
        handleMessageV1(eServiceV1Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        kafkaMessageMissingData(config.kafkaTopic, eServiceV1Event.type),
      );
    });

    it("save a new Eservice for EServiceAdded event should return an exception errorSaveEservice with validation body error", async () => {
      const eServiceId = generateId();
      const producerId = "producer-id";
      const eserviceV1 = createEServiceV1({
        id: eServiceId,
        producerId,
        descriptors: [],
        name: "eservice name",
      });

      const eServiceV1Event = createEserviceAddedEventV1(
        eserviceV1,
        generateId(),
      );

      const zodiosValidationError =
        "Error: Zodios: Invalid Body parameter 'body'";

      await expect(
        handleMessageV1(eServiceV1Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        errorSaveEservice(
          `Error saving eService: ${eServiceId}, tenantId: ${producerId}. Details: ${zodiosValidationError}`,
        ),
      );
    });

    it("save a new Eservice for EServiceAdded event should return generic exception errorSaveEservice", async () => {
      const eServiceId = generateId();
      const producerId = generateId();
      const eserviceV1 = createEServiceV1({
        id: eServiceId,
        producerId,
        descriptors: [],
        name: "eservice name",
      });

      const eServiceV1Event = createEserviceAddedEventV1(
        eserviceV1,
        generateId(),
      );

      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveEservice").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV1(
          eServiceV1Event,
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

  describe("EserviceUpdated Event", () => {
    it("update an Eservice for EserviceUpdated event should return a successfully response", async () => {
      vi.spyOn(apiClient, "saveEservice").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV1(
            mockEserviceUpdateV1,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveEservice).toBeCalled();
    });

    it("update an Eservice for EserviceUpdated event should return an exception errorSaveEservice", async () => {
      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveEservice").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV1(
          mockEserviceUpdateV1,
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
          await handleMessageV1(
            mockEserviceDeleteV1,
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
        await handleMessageV1(
          mockEserviceDeleteV1,
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

  describe("ClonedEServiceAdded Event", () => {
    it("clone an Eservice for ClonedEServiceAdded event should return a successfully response", async () => {
      vi.spyOn(apiClient, "saveEservice").mockResolvedValueOnce(undefined);

      await handleMessageV1(
        mockClonedEServiceAddedV1,
        operationsService,
        ctx,
        genericLogger,
      );

      expect(apiClient.saveEservice).toBeCalled();
    });

    it("clone an Eservice for ClonedEServiceAdded event should return an exception errorSaveEservice", async () => {
      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveEservice").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV1(
          mockClonedEServiceAddedV1,
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

  describe("Events to be ignored", () => {
    it("invoking handleMessageV1 should ignore specific event types and log an info message for each ignored event", async () => {
      const spy = vi.spyOn(genericLogger, "info");

      const events = [
        { type: "EServiceDocumentAdded" },
        { type: "EServiceDocumentDeleted" },
        { type: "EServiceDocumentUpdated" },
        { type: "MovedAttributesFromEserviceToDescriptors" },
        { type: "EServiceDescriptorAdded" },
        { type: "EServiceDescriptorUpdated" },
        { type: "EServiceWithDescriptorsDeleted" },
      ];

      for (const event of events) {
        await handleMessageV1(
          {
            event_version: 1,
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

        expect(spy).toHaveBeenCalledWith(
          `Skip event ${event.type} (not relevant)`,
        );
      }

      expect(spy).toHaveBeenCalledTimes(events.length);
    });
  });
});
