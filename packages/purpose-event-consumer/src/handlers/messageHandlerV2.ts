import {
  PurposeEventV2,
  PurposeStateV2,
  PurposeVersionV2,
} from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";
import { kafkaInvalidVersion } from "../models/domain/errors.js";

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
        if (!evt.data.purpose) {
          throw kafkaMessageMissingData(config.kafkaTopic, event.type);
        }
        const { purpose } = evt.data;

        if (hasPurposeVersionInAValidState(purpose.versions)) {
          throw kafkaInvalidVersion();
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
        type: P.union(
          "NewPurposeVersionActivated",
          "PurposeVersionActivated",
          "PurposeVersionUnsuspendedByProducer",
          "PurposeVersionUnsuspendedByConsumer",
          "PurposeVersionSuspendedByProducer",
          "PurposeVersionSuspendedByConsumer",
          "PurposeVersionOverQuotaUnsuspended",
          "PurposeArchived",
          "PurposeAdded",
          "DraftPurposeUpdated",
          "PurposeWaitingForApproval",
          "DraftPurposeDeleted",
          "WaitingForApprovalPurposeDeleted",
          "NewPurposeVersionWaitingForApproval",
          "WaitingForApprovalPurposeVersionDeleted",
          "PurposeVersionRejected",
          "PurposeCloned",
        ),
      },
      async () => {
        logger.info(`Skip event (not relevant)`);
      },
    )
    .exhaustive();
}

const validVersionInVersionsV2 = (
  purposeVersions: PurposeVersionV2[],
): { versionId: string; state: string } | undefined =>
  match(purposeVersions)
    .when(
      (versions) =>
        versions.some((version) => version.state === PurposeStateV2.ACTIVE),
      () => getVersionBy(PurposeStateV2.ACTIVE, purposeVersions),
    )
    .when(
      (versions) =>
        versions.some((version) => version.state === PurposeStateV2.SUSPENDED),
      () => getVersionBy(PurposeStateV2.SUSPENDED, purposeVersions),
    )
    .when(
      (versions) =>
        versions.some((version) => version.state === PurposeStateV2.ARCHIVED),
      () => getVersionBy(PurposeStateV2.ARCHIVED, purposeVersions),
    )
    .otherwise(() => undefined);

function getVersionBy(
  purposeState: PurposeStateV2,
  purposeVersions: PurposeVersionV2[],
): {
  versionId: string;
  state: string;
} {
  return purposeVersions
    .filter((version) => version.state === purposeState)
    .reduce(
      (obj, version) => {
        const { id, state } = version;
        return { ...obj, versionId: id, state: PurposeStateV2[state] };
      },
      {} as { versionId: string; state: string },
    );
}

const hasPurposeVersionInAValidState = (
  versions: PurposeVersionV2[],
): boolean => !validVersionInVersionsV2(versions);
