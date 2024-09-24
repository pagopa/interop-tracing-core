import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import {
  createEServiceV1,
  createTenantEventV1,
  mockApiClientError,
  mockClonedEServiceAddedV1,
  mockEserviceDeleteV1,
  mockEserviceUpdateV1,
  mockTenantDeleteV1,
  mockTenantUpdateV1,
} from "./utils.js";
import { v4 as uuidv4 } from "uuid";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import {
  generateId,
  InternalError,
  kafkaMessageMissingData,
  TenantId,
} from "pagopa-interop-tracing-models";
import { handleMessageV1 } from "../src/handlers/messageHandlerV1.js";
import { ErrorCodes, errorSaveTenant } from "../src/models/domain/errors.js";
import { TenantV1 } from "@pagopa/interop-outbound-models";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Message handler V1 test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: uuidv4(),
  };

  describe("TenantCreated Event", () => {
    it("save a new Tenant for TenantCreated event should return a successfully response", async () => {
      const tenantId = generateId<TenantId>();
      const tenantV1: TenantV1 = {
        id: tenantId,
        name: "pagoPa",
        externalId: {
          origin: "origin",
          value: generateId(),
        },
        features: [],
        attributes: [],
        createdAt: 1n,
      };

      const tenantV1Event = createTenantEventV1(tenantV1, generateId());

      vi.spyOn(apiClient, "saveTenant").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV1(
            tenantV1Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveTenant).toBeCalled();
    });

    it("save a new Tenant for TenantCreated event should return an exception kafkaMessageMissingData", async () => {
      const tenantV1Event = createTenantEventV1(undefined, generateId());

      await expect(
        handleMessageV1(tenantV1Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        kafkaMessageMissingData(config.kafkaTopic, tenantV1Event.type),
      );
    });

    it("save a new Tenant for TenantCreated event should return an exception errorSaveTenant with validation body error", async () => {
      const tenantId = generateId<TenantId>();
      const tenantV1: TenantV1 = {
        id: tenantId,
        name: "tenant name",
        externalId: {
          origin: "origin",
          value: "invalid uuid",
        },
        features: [],
        attributes: [],
        createdAt: 1n,
      };

      const tenantV1Event = createTenantEventV1(tenantV1, generateId());

      const zodiosValidationError =
        "Error: Zodios: Invalid Body parameter 'body'";

      await expect(
        handleMessageV1(tenantV1Event, operationsService, ctx, genericLogger),
      ).rejects.toThrow(
        errorSaveTenant(
          `Error saving tenant with tenantId: ${tenantId}. Details: ${zodiosValidationError}`,
        ),
      );
    });

    it("save a new Tenant for TenantCreated event should return generic exception errorSaveTenant", async () => {
      const tenantId = generateId<TenantId>();
      const tenantV1: TenantV1 = {
        id: tenantId,
        name: "tenant name",
        externalId: {
          origin: "origin",
          value: "invalid uuid",
        },
        features: [],
        attributes: [],
        createdAt: 1n,
      };

      const tenantV1Event = createTenantEventV1(tenantV1, generateId());

      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveTenant").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV1(
          tenantV1Event,
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

  describe("TenantUpdated Event", () => {
    it("update a Tenant for TenantUpdated event should return a successfully response", async () => {
      vi.spyOn(apiClient, "saveTenant").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV1(
            mockTenantUpdateV1(generateId<TenantId>()),
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveTenant).toBeCalled();
    });

    it("update an Tenant for TenantUpdated event should return an exception errorSaveTenant", async () => {
      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveTenant").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV1(
          mockTenantUpdateV1(generateId<TenantId>()),
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

  describe("TenantDeleted Event", () => {
    it("delete an Tenant for TenantDeleted event should return a successfully response", async () => {
      vi.spyOn(apiClient, "deleteTenant").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV1(
            mockTenantDeleteV1,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.deleteTenant).toBeCalled();
    });

    it("delete an Tenant for TenantDeleted event should return an exception errorDeleteTenant", async () => {
      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "deleteTenant").mockRejectedValueOnce(apiClientError);

      try {
        await handleMessageV1(
          mockTenantDeleteV1,
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
});
