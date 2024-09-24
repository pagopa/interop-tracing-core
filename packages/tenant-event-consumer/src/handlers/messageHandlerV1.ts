import { TenantEventV1 } from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";

export async function handleMessageV1(
  event: TenantEventV1,
  operationsService: OperationsService,
  ctx: AppContext,
  logger: Logger,
): Promise<void> {
  await match(event)
    .with(
      {
        type: P.union("TenantCreated", "TenantUpdated"),
      },
      async (evt) => {
        if (!evt.data.tenant) {
          throw kafkaMessageMissingData(config.kafkaTopic, event.type);
        }

        const { tenant } = evt.data;

        await operationsService.saveTenant(
          { ...correlationIdToHeader(ctx.correlationId) },
          {
            tenantId: tenant.id,
            externalId: tenant.externalId?.value || "TODO",
            origin: tenant.externalId?.origin || "TODO",
            name: tenant.name || "TODO",
          },
          logger,
        );
      },
    )

    .with(
      {
        type: "TenantDeleted",
      },
      async (evt) => {
        await operationsService.deleteTenant(
          { ...correlationIdToHeader(ctx.correlationId) },
          {
            tenantId: evt.data.tenantId,
          },
          logger,
        );
      },
    )
    .exhaustive();
}
