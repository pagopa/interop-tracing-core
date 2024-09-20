import { PurposeEventV1 } from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";

export async function handleMessageV1(
  event: PurposeEventV1,
  operationsService: OperationsService,
  ctx: AppContext,
  logger: Logger,
): Promise<void> {
  await match(event)
    .with(
      {
        type: P.union("PurposeVersionActivated"),
      },
      async (evt) => {
        if (!evt.data.purpose) {
          throw kafkaMessageMissingData(config.kafkaTopic, event.type);
        }

        const { purpose } = evt.data;

        await operationsService.savePurpose(
          { ...correlationIdToHeader(ctx.correlationId) },
          {
            id: purpose.id,
            consumer_id: purpose.consumerId,
            eservice_id: purpose.eserviceId,
            purpose_title: purpose.title,
          },
          logger,
        );
      },
    )
    .with(
      {
        type: P.union("PurposeCreated", "PurposeVersionArchived"),
      },
      async () => {
        logger.info(`Skip event (not relevant)`);
      },
    );
}
