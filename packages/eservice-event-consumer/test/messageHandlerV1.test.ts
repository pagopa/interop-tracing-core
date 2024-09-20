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
  generateID,
  mockApiClientError,
} from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import {
  InternalError,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { handleMessageV1 } from "../src/handlers/messageHandlerV1.js";
import { ErrorCodes, errorSaveEservice } from "../src/models/domain/errors.js";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Operations service test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: uuidv4(),
  };

  describe("EserviceAdded Event", () => {
    it("save a new Eservice for EServiceAdded event should return a successfully response", async () => {
      const eServiceId = generateID();
      const producerId = "producer-test-id";
      const eserviceV1 = createEServiceV1({
        id: eServiceId,
        producerId,
        descriptors: [],
      });

      const eServiceV1Event = createEserviceAddedEventV1(
        eserviceV1,
        generateID(),
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
    });

    it("save a new Eservice for EServiceAdded event should return an exception kafkaMessageMissingData", async () => {
      const eServiceV1Event = createEserviceAddedEventV1(
        undefined,
        generateID(),
      );

      await expect(
        handleMessageV1(eServiceV1Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        kafkaMessageMissingData(config.kafkaTopic, eServiceV1Event.type),
      );
    });

    it("save a new Eservice for EServiceAdded event should return an exception errorSaveEservice", async () => {
      const eServiceId = generateID();
      const producerId = "producer-test-id";
      const eserviceV1 = createEServiceV1({
        id: eServiceId,
        producerId,
        descriptors: [],
        name: 111,
      });

      const eServiceV1Event = createEserviceAddedEventV1(
        eserviceV1,
        generateID(),
      );

      /*const apiClientError = mockApiClientError(400, "Bad request");
      errorSaveEservice(
        `Error saving eService: ${undefined}, tenantId: ${undefined}. Details: ${apiClientError}`,
      );

      vi.spyOn(apiClient, "savePurposeError").mockRejectedValueOnce(
        apiClientError,
      );*/

      try {
        await handleMessageV1(
          eServiceV1Event,
          operationsService,
          ctx,
          genericLogger,
        );
      } catch (error) {
        console.log("error", error);
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorSaveEservice",
        );
      }
    });
  });
});
