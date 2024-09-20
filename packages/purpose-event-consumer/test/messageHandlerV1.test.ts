import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import { createPurposeActivatedEventV1, generateID } from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import { kafkaMessageMissingData } from "pagopa-interop-tracing-models";
import { handleMessageV1 } from "../src/handlers/messageHandlerV1.js";
import { PurposeVersionV1 } from "@pagopa/interop-outbound-models";

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
      const purposeId = generateID();
      const purpose = {
        id: purposeId,
        eserviceId: "",
        consumerId: "",
        title: "",
        versions: [] as unknown as PurposeVersionV1[],
        description: "",
        createdAt: BigInt(12321321),
      };

      const purposeV1Event = createPurposeActivatedEventV1(
        purpose,
        generateID(),
      );

      vi.spyOn(apiClient, "savePurpose").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV1(
            purposeV1Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();
    });

    it("save a new purpose for PurposeActivated event should return an exception kafkaMessageMissingData", async () => {
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
  });
});
