import { PurposeEventV2 } from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";

export async function handleMessageV2(
  event: PurposeEventV2,
  operationsService: OperationsService,
  ctx: AppContext,
  logger: Logger,
): Promise<void> {
  await match(event)
    .with(
      {
        type: P.union("PurposeActivated"),
      },
      async (evt) => {
        const { purpose } = evt.data;
        if (!purpose) {
          throw kafkaMessageMissingData(config.kafkaTopic, event.type);
        }

        await operationsService.savePurpose(
          { ...correlationIdToHeader(ctx.correlationId) },
          {
            id: purpose.id,
            eserviceId: purpose.eserviceId,
            consumerId: purpose.consumerId,
            purpose_title: purpose.title,
          },
          logger,
        );
      },
    )

    .with(
      {
        type: P.union("PurposeArchived", "PurposeCloned"),
      },
      async () => {
        logger.info(`Skip event (not relevant)`);
      },
    );
}
