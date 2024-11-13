import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "pagopa-interop-tracing-operations-client";
import {
  OperationsService,
  operationsServiceBuilder,
} from "../src/services/operationsService.js";
import { config } from "../src/utilities/config.js";
import {
  approvedDelegationEventV2,
  mockApiClientError,
  revokedDelegationEventV2,
} from "./utils.js";
import { AppContext, genericLogger } from "pagopa-interop-tracing-commons";
import {
  CorrelationId,
  DelegationId,
  EserviceId,
  generateId,
  InternalError,
  kafkaMessageMissingData,
  TenantId,
} from "pagopa-interop-tracing-models";
import {
  handleMessageV2,
  mapToDelegationState,
} from "../src/handlers/messageHandlerV2.js";
import {
  ErrorCodes,
  errorSaveDelegation,
} from "../src/models/domain/errors.js";
import {
  DelegationKindV2,
  DelegationStateV2,
  DelegationV2,
} from "@pagopa/interop-outbound-models";

const apiClient = createApiClient(config.operationsBaseUrl);

describe("Message handler V2 test", () => {
  const operationsService: OperationsService =
    operationsServiceBuilder(apiClient);

  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: generateId<CorrelationId>(),
  };

  describe("DelegationApproved Event", () => {
    it("save a new Delegation for DelegationApproved event should return a successfully response", async () => {
      const delegationId = generateId<DelegationId>();
      const delegationV2: DelegationV2 = DelegationV2.create({
        id: delegationId,
        delegatorId: generateId<TenantId>(),
        delegateId: generateId<TenantId>(),
        eserviceId: generateId<EserviceId>(),
        createdAt: BigInt(Date.now()),
        submittedAt: BigInt(Date.now()),
        state: DelegationStateV2.WAITING_FOR_APPROVAL,
        kind: DelegationKindV2.DELEGATED_PRODUCER,
        contract: {
          id: "contract_identifier",
          name: "Service Contract",
          prettyName: "Service Contract Name",
          contentType: "application/pdf",
          createdAt: BigInt(Date.now()),
        },
        stamps: {
          submission: {
            who: "submission_identifier",
            when: BigInt(Date.now()),
          },
          activation: {
            who: "activation_identifier",
            when: BigInt(Date.now()),
          },
        },
      });

      const delegationV2Event = approvedDelegationEventV2(
        delegationV2,
        generateId(),
      );

      vi.spyOn(apiClient, "saveDelegation").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV2(
            delegationV2Event,
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveDelegation).toBeCalled();
    });

    it("save a new Delegation for DelegationApproved event should return an exception kafkaMessageMissingData", async () => {
      const delegationV2Event = approvedDelegationEventV2(
        undefined,
        generateId(),
      );

      await expect(
        handleMessageV2(
          delegationV2Event,
          operationsService,
          ctx,
          genericLogger,
        ),
      ).rejects.toThrow(
        kafkaMessageMissingData(config.kafkaTopic, delegationV2Event.type),
      );
    });

    it("save a new Delegation for DelegationApproved event should return an exception errorSaveDelegation with validation body error", async () => {
      const delegationV2: DelegationV2 = DelegationV2.create({
        id: "invalid uuid",
        delegatorId: generateId<TenantId>(),
        delegateId: generateId<TenantId>(),
        eserviceId: generateId<EserviceId>(),
        createdAt: BigInt(Date.now()),
        submittedAt: BigInt(Date.now()),
        state: DelegationStateV2.WAITING_FOR_APPROVAL,
        kind: DelegationKindV2.DELEGATED_PRODUCER,
        contract: {
          id: "contract_identifier",
          name: "Service Contract",
          prettyName: "Service Contract Name",
          contentType: "application/pdf",
          createdAt: BigInt(Date.now()),
        },
        stamps: {
          submission: {
            who: "submission_identifier",
            when: BigInt(Date.now()),
          },
          activation: {
            who: "activation_identifier",
            when: BigInt(Date.now()),
          },
        },
      });

      const delegationV2Event = approvedDelegationEventV2(
        delegationV2,
        generateId(),
      );

      const zodiosValidationError =
        "Error: Zodios: Invalid Body parameter 'body'";

      const data = `{"id":"${delegationV2.id}","delegatorId":"${
        delegationV2.delegatorId
      }","delegateId":"${delegationV2.delegateId}","eserviceId":"${
        delegationV2.eserviceId
      }","state":"${mapToDelegationState(delegationV2.state)}"}`;

      await expect(
        handleMessageV2(
          delegationV2Event,
          operationsService,
          ctx,
          genericLogger,
        ),
      ).rejects.toThrow(
        errorSaveDelegation(
          `Error saving delegation with delegationId: ${delegationV2.id}. Details: ${zodiosValidationError}. Data: ${data}`,
        ),
      );
    });

    it("save a new Delegation for DelegationApproved event should return generic exception errorSaveDelegation", async () => {
      const delegationId = generateId<DelegationId>();
      const delegationV2: DelegationV2 = DelegationV2.create({
        id: delegationId,
        delegatorId: undefined,
        delegateId: undefined,
        eserviceId: undefined,
        createdAt: BigInt(Date.now()),
        submittedAt: BigInt(Date.now()),
        state: DelegationStateV2.WAITING_FOR_APPROVAL,
        kind: DelegationKindV2.DELEGATED_PRODUCER,
      });

      const delegationV2Event = approvedDelegationEventV2(
        delegationV2,
        generateId(),
      );

      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveDelegation").mockRejectedValueOnce(
        apiClientError,
      );

      try {
        await handleMessageV2(
          delegationV2Event,
          operationsService,
          ctx,
          genericLogger,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorSaveDelegation",
        );
      }
    });
  });

  describe("DelegationRevoked Event", () => {
    it("update a Delegation state for DelegationRevoked event should return a successfully response", async () => {
      const delegationId = generateId<DelegationId>();
      const delegationV2: DelegationV2 = DelegationV2.create({
        id: delegationId,
        delegatorId: generateId<TenantId>(),
        delegateId: generateId<TenantId>(),
        eserviceId: generateId<EserviceId>(),
        createdAt: BigInt(Date.now()),
        submittedAt: BigInt(Date.now()),
        state: DelegationStateV2.REVOKED,
        kind: DelegationKindV2.DELEGATED_PRODUCER,
        contract: {
          id: "contract_identifier",
          name: "Service Contract",
          prettyName: "Service Contract Name",
          contentType: "application/pdf",
          createdAt: BigInt(Date.now()),
        },
        stamps: {
          submission: {
            who: "submission_identifier",
            when: BigInt(Date.now()),
          },
          activation: {
            who: "activation_identifier",
            when: BigInt(Date.now()),
          },
        },
      });

      vi.spyOn(apiClient, "saveDelegation").mockResolvedValueOnce(undefined);

      expect(
        async () =>
          await handleMessageV2(
            revokedDelegationEventV2(delegationV2, generateId()),
            operationsService,
            ctx,
            genericLogger,
          ),
      ).not.toThrowError();

      expect(apiClient.saveDelegation).toBeCalled();
    });

    it("update a Delegation for DelegationRevoked event should return an exception errorSaveDelegation", async () => {
      const delegationId = generateId<DelegationId>();
      const delegationV2: DelegationV2 = DelegationV2.create({
        id: delegationId,
        delegatorId: generateId<TenantId>(),
        delegateId: generateId<TenantId>(),
        eserviceId: generateId<EserviceId>(),
        createdAt: BigInt(Date.now()),
        submittedAt: BigInt(Date.now()),
        state: DelegationStateV2.REVOKED,
        kind: DelegationKindV2.DELEGATED_PRODUCER,
        contract: {
          id: "contract_identifier",
          name: "Service Contract",
          prettyName: "Service Contract Name",
          contentType: "application/pdf",
          createdAt: BigInt(Date.now()),
        },
        stamps: {
          submission: {
            who: "submission_identifier",
            when: BigInt(Date.now()),
          },
          activation: {
            who: "activation_identifier",
            when: BigInt(Date.now()),
          },
        },
      });

      const apiClientError = mockApiClientError(500, "Internal server error");

      vi.spyOn(apiClient, "saveDelegation").mockRejectedValueOnce(
        apiClientError,
      );

      try {
        await handleMessageV2(
          revokedDelegationEventV2(delegationV2, generateId()),
          operationsService,
          ctx,
          genericLogger,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect((error as InternalError<ErrorCodes>).code).toBe(
          "errorSaveDelegation",
        );
      }
    });
  });

  describe("Events to be ignored", () => {
    it("invoking handleMessageV2 should ignore specific event types and log an info message for each ignored event", async () => {
      const spy = vi.spyOn(genericLogger, "info");

      const events = [
        { type: "DelegationSubmitted" },
        { type: "DelegationRejected" },
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
