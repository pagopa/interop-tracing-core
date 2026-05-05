import { AppContext, logger } from "pagopa-interop-tracing-commons";
import {
  CorrelationId,
  generateId,
  kafkaMissingMessageValue,
} from "pagopa-interop-tracing-models";
import { OperationsService } from "./services/operationsService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { config } from "./utilities/config.js";
import { EachMessagePayload } from "kafkajs";
import { match } from "ts-pattern";
import { decodeOutboundDelegationEvent } from "@pagopa/interop-outbound-models";
import { handleMessageV2 } from "./handlers/index.js";

export function processMessage(
  service: OperationsService,
): ({ message, partition }: EachMessagePayload) => Promise<void> {
  return async ({ message, partition }: EachMessagePayload): Promise<void> => {
    const ctx: AppContext = {
      serviceName: config.applicationName,
      correlationId: generateId<CorrelationId>(),
    };

    try {
      if (!message.value) {
        throw kafkaMissingMessageValue(config.kafkaTopic);
      }
      const delegationEvent = decodeOutboundDelegationEvent(
        message.value.toString(),
      );

      const loggerInstance = logger({
        ...ctx,
        eventType: delegationEvent.type,
        eventVersion: delegationEvent.event_version,
        streamId: delegationEvent.stream_id,
        version: delegationEvent.version,
      });

      await match(delegationEvent)
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
