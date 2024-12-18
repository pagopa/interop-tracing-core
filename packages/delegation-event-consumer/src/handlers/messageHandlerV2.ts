import { DelegationEventV2 } from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";
import {
  DelegationKindV2,
  delegationState,
  DelegationState,
  DelegationStateV2,
} from "../models/domain/delegation.js";

export async function handleMessageV2(
  event: DelegationEventV2,
  operationsService: OperationsService,
  ctx: AppContext,
  logger: Logger,
): Promise<void> {
  await match(event)
    .with(
      {
        type: P.union(
          "ProducerDelegationSubmitted",
          "ProducerDelegationApproved",
          "ProducerDelegationSubmitted",
          "ProducerDelegationRevoked",
        ),
      },
      async (evt) => {
        const { delegation } = evt.data;
        if (!delegation) {
          throw kafkaMessageMissingData(config.kafkaTopic, event.type);
        }

        if (delegation.kind === DelegationKindV2.DELEGATED_CONSUMER) {
          await operationsService.saveDelegation(
            { ...correlationIdToHeader(ctx.correlationId) },
            {
              id: delegation.id,
              delegateId: delegation.delegateId,
              eserviceId: delegation.eserviceId,
              state: mapToDelegationState(delegation.state),
            },
            logger,
          );
        }
      },
    )

    .with(
      {
        type: P.union("ProducerDelegationRejected"),
      },
      async (evt) => {
        logger.info(`Skip event ${evt.type} (not relevant)`);
      },
    )
    .exhaustive();
}

export function mapToDelegationState(
  state: DelegationStateV2,
): DelegationState {
  return match(state)
    .with(0, () => delegationState.waiting_for_approval)
    .with(1, () => delegationState.active)
    .with(2, () => delegationState.rejected)
    .with(3, () => delegationState.revoked)
    .exhaustive();
}
