import { EServiceEventV2 } from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";

export async function handleMessageV2(
  event: EServiceEventV2,
  operationsService: OperationsService,
  ctx: AppContext,
  logger: Logger,
): Promise<void> {
  await match(event)
    .with(
      {
        type: P.union(
          "EServiceAdded",
          "EServiceCloned",
          "EServiceDescriptionUpdated",
        ),
      },
      async (evt) => {
        const { eservice } = evt.data;
        if (!eservice) {
          throw kafkaMessageMissingData(config.kafkaTopic, event.type);
        }

        await operationsService.saveEservice(
          { ...correlationIdToHeader(ctx.correlationId) },
          { eserviceId: eservice.id, producerId: eservice.producerId },
          logger,
        );
      },
    )
    .with(
      {
        type: "EServiceDeleted",
      },
      async (evt) => {
        await operationsService.deleteEservice(
          { ...correlationIdToHeader(ctx.correlationId) },
          {
            eserviceId: evt.data.eserviceId,
          },
          logger,
        );
      },
    )

    .with(
      {
        type: P.union(
          "EServiceDescriptorDocumentAdded",
          "EServiceDescriptorDocumentDeleted",
          "EServiceDescriptorDocumentUpdated",
          "EServiceDescriptorInterfaceAdded",
          "EServiceDescriptorInterfaceDeleted",
          "EServiceDescriptorQuotasUpdated",
          "EServiceDescriptorInterfaceDeleted",
          "EServiceDescriptorInterfaceUpdated",
          "EServiceDescriptorQuotasUpdated",
          "DraftEServiceUpdated",
          "EServiceDraftDescriptorDeleted",
          "EServiceDescriptorAdded",
          "EServiceDescriptorActivated",
          "EServiceDescriptorArchived",
          "EServiceDescriptorPublished",
          "EServiceDescriptorSuspended",
          "EServiceDraftDescriptorUpdated",
        ),
      },
      async () => {
        logger.info(`Skip event (not relevant)`);
      },
    )
    .exhaustive();
}
