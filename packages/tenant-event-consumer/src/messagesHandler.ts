import { AppContext, logger } from "pagopa-interop-tracing-commons";
import { kafkaMissingMessageValue } from "pagopa-interop-tracing-models";
import { OperationsService } from "./services/operationsService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { config } from "./utilities/config.js";
import { v4 as uuidv4 } from "uuid";
import { EachMessagePayload } from "kafkajs";
import { match } from "ts-pattern";
import { decodeOutboundTenantEvent } from "@pagopa/interop-outbound-models";
import { handleMessageV1, handleMessageV2 } from "./handlers/index.js";

export function processMessage(
  service: OperationsService,
): ({ message, partition }: EachMessagePayload) => Promise<void> {
  return async ({ message, partition }: EachMessagePayload): Promise<void> => {
    const ctx: AppContext = {
      serviceName: config.applicationName,
      correlationId: uuidv4(),
    };

    try {
      if (!message.value) {
        throw kafkaMissingMessageValue(config.kafkaTopic);
      }
      const tenantEvent = decodeOutboundTenantEvent(message.value.toString());

      const loggerInstance = logger({
        ...ctx,
        eventType: tenantEvent.type,
        eventVersion: tenantEvent.event_version,
        streamId: tenantEvent.stream_id,
        version: tenantEvent.version,
      });

      await match(tenantEvent)
        .with({ event_version: 1 }, (event) =>
          handleMessageV1(event, service, ctx, loggerInstance),
        )
        .with({ event_version: 2 }, (event) =>
          handleMessageV2(event, service, ctx, loggerInstance),
        )
        .exhaustive();

      loggerInstance.info(
        `Message was processed. Partition number: ${partition}. Offset: ${message.offset}`,
      );
    } catch (error: unknown) {
      throw errorMapper(error, logger(ctx));
    }
  };
}
