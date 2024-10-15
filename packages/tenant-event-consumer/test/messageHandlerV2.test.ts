import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import {
  createTenantEventV2,
  mockApiClientError,
  mockTenantDeleteV2,
  mockTenantUpdateV2,
} from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import {
  generateId,
  InternalError,
  kafkaMessageMissingData,
  TenantId,
} from "pagopa-interop-tracing-models";
import { handleMessageV2 } from "../src/handlers/messageHandlerV2.js";
import { ErrorCodes, errorSaveTenant } from "../src/models/domain/errors.js";
import { TenantV2 } from "@pagopa/interop-outbound-models";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Message handler V2 test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: uuidv4(),
  };

  describe("TenantOnboarded Event", () => {
    it("save a new Tenant for TenantOnboarded event should return a successfully response", async () => {
      const tenantId = generateId<TenantId>();
      const tenantV2: TenantV2 = {
        id: tenantId,
        name: "pagoPa",
        selfcareId: "selfcareId",
        externalId: {
          origin: "origin",
          value: generateId(),
        },
        features: [],
        attributes: [],
        createdAt: 1n,
        onboardedAt: 1n,
      };

      const tenantV2Event = createTenantEventV2(tenantV2, generateId());

      vi.spyOn(apiClient, "saveTenant").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV2(
            tenantV2Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveTenant).toBeCalled();
    });

    it("save a new Tenant for TenantOnboarded event should return an exception kafkaMessageMissingData", async () => {
      const tenantV2Event = createTenantEventV2(undefined, generateId());

      await expect(
        handleMessageV2(tenantV2Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        kafkaMessageMissingData(config.kafkaTopic, tenantV2Event.type),
      );
    });

    it("save a new Tenant for TenantOnboarded event should return an exception errorSaveTenant with validation body error", async () => {
      const tenantV2: TenantV2 = {
        id: "invalid uuid",
        name: "tenant name",
        selfcareId: "selfcareId",
        externalId: {
          origin: "origin",
          value: "invalid uuid",
        },
        features: [],
        attributes: [],
        createdAt: 1n,
        onboardedAt: 1n,
      };

      const tenantV2Event = createTenantEventV2(tenantV2, generateId());

      const zodiosValidationError =
        "Error: Zodios: Invalid Body parameter 'body'";

      await expect(
        handleMessageV2(tenantV2Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        errorSaveTenant(
          `Error saving tenant with tenantId: ${tenantV2.id}. Details: ${zodiosValidationError}`,
        ),
      );
    });

    it("save a new Tenant for TenantOnboarded event should return generic exception errorSaveTenant", async () => {
      const tenantId = generateId<TenantId>();
      const tenantV2: TenantV2 = {
        id: tenantId,
        name: "tenant name",
        selfcareId: "selfcareId",
        externalId: {
          origin: "origin",
          value: "invalid uuid",
        },
        features: [],
        attributes: [],
        createdAt: 1n,
        onboardedAt: 1n,
      };

      const tenantV2Event = createTenantEventV2(tenantV2, generateId());

      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveTenant").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV2(
          tenantV2Event,
          operationsService,
          ctx,
          genericLogger,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorSaveTenant",
        );
      }
    });
  });

  describe("TenantOnboardDetailsUpdated Event", () => {
    it("update a Tenant for TenantOnboardDetailsUpdated event should return a successfully response", async () => {
      vi.spyOn(apiClient, "saveTenant").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV2(
            mockTenantUpdateV2(generateId<TenantId>()),
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveTenant).toBeCalled();
    });

    it("update a Tenant for TenantOnboardDetailsUpdated event should return an exception errorSaveTenant", async () => {
      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveTenant").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV2(
          mockTenantUpdateV2(generateId<TenantId>()),
          operationsService,
          ctx,
          genericLogger,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorSaveTenant",
        );
      }
    });
  });

  describe("MaintenanceTenantDeleted Event", () => {
    it("delete a Tenant for MaintenanceTenantDeleted event should return a successfully response", async () => {
      vi.spyOn(apiClient, "deleteTenant").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV2(
            mockTenantDeleteV2,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.deleteTenant).toBeCalled();
    });

    it("delete a Tenant for TenantDeleted event should return an exception errorDeleteTenant", async () => {
      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "deleteTenant").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV2(
          mockTenantDeleteV2,
          operationsService,
          ctx,
          genericLogger,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorDeleteTenant",
        );
      }
    });
  });

  describe("Events to be ignored", () => {
    it("invoking handleMessageV2 should ignore specific event types and log an info message for each ignored event", async () => {
      const spy = vi.spyOn(genericLogger, "info");

      const events = [
        { type: "TenantCertifiedAttributeAssigned" },
        { type: "TenantCertifiedAttributeRevoked" },
        { type: "TenantDeclaredAttributeAssigned" },
        { type: "TenantDeclaredAttributeRevoked" },
        { type: "TenantVerifiedAttributeAssigned" },
        { type: "TenantVerifiedAttributeRevoked" },
        { type: "TenantVerifiedAttributeExpirationUpdated" },
        { type: "TenantVerifiedAttributeExtensionUpdated" },
        { type: "TenantKindUpdated" },
        { type: "MaintenanceTenantPromotedToCertifier" },
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

        expect(spy).toHaveBeenCalledWith(
          `Skip event ${event.type} (not relevant)`,
        );
      }

      expect(spy).toHaveBeenCalledTimes(events.length);
    });
  });
});
