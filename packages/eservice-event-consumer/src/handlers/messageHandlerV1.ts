import { EServiceEventV1 } from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";

export async function handleMessageV1(
  event: EServiceEventV1,
  operationsService: OperationsService,
  ctx: AppContext,
  logger: Logger,
): Promise<void> {
  await match(event)
    .with(
      {
        type: "EServiceAdded",
      },
      async (evt) => {
        if (!evt.data.eservice) {
          throw kafkaMessageMissingData(config.kafkaTopic, event.type);
        }

        const { eservice } = evt.data;

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
        type: "ClonedEServiceAdded",
      },
      async (evt) => {
        if (!evt.data.eservice) {
          throw new Error("Missing eservice data");
        }

        await operationsService.saveEservice(
          { ...correlationIdToHeader(ctx.correlationId) },
          {
            eserviceId: evt.data.eservice?.id,
            producerId: evt.data.eservice.producerId,
          },
          logger,
        );
      },
    )
    .with(
      {
        type: P.union(
          "EServiceUpdated",
          "EServiceDocumentAdded",
          "EServiceDocumentDeleted",
          "EServiceDocumentUpdated",
          "MovedAttributesFromEserviceToDescriptors",
          "EServiceDescriptorAdded",
          "EServiceDescriptorUpdated",
          "EServiceWithDescriptorsDeleted",
        ),
      },

      async () => {
        logger.info(`Skip event (not relevant)`);
      },
    )
    .exhaustive();
}
