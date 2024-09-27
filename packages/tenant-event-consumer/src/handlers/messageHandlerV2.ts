import { TenantEventV2 } from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";

export async function handleMessageV2(
  event: TenantEventV2,
  operationsService: OperationsService,
  ctx: AppContext,
  logger: Logger,
): Promise<void> {
  await match(event)
    .with(
      {
        type: P.union("TenantOnboarded", "TenantOnboardDetailsUpdated"),
      },
      async (evt) => {
        const { tenant } = evt.data;
        if (!tenant) {
          throw kafkaMessageMissingData(config.kafkaTopic, event.type);
        }

        await operationsService.saveTenant(
          { ...correlationIdToHeader(ctx.correlationId) },
          {
            tenantId: tenant.id,
            externalId: tenant.externalId?.value,
            origin: tenant.externalId?.origin,
            name: tenant.name,
          },
          logger,
        );
      },
    )
    .with(
      {
        type: "MaintenanceTenantDeleted",
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

    .with(
      {
        type: P.union(
          "TenantCertifiedAttributeAssigned",
          "TenantCertifiedAttributeRevoked",
          "TenantDeclaredAttributeAssigned",
          "TenantDeclaredAttributeRevoked",
          "TenantVerifiedAttributeAssigned",
          "TenantVerifiedAttributeRevoked",
          "TenantVerifiedAttributeExpirationUpdated",
          "TenantVerifiedAttributeExtensionUpdated",
          "TenantKindUpdated",
          "MaintenanceTenantPromotedToCertifier",
        ),
      },
      async (evt) => {
        logger.info(`Skip event ${evt.type} (not relevant)`);
      },
    )
    .exhaustive();
}
