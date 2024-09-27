import {
  PurposeEventV1,
  PurposeStateV1,
  PurposeVersionV1,
} from "@pagopa/interop-outbound-models";
import { Logger, AppContext } from "pagopa-interop-tracing-commons";
import { P, match } from "ts-pattern";
import { config } from "../utilities/config.js";
import { OperationsService } from "../services/operationsService.js";
import {
  correlationIdToHeader,
  kafkaMessageMissingData,
} from "pagopa-interop-tracing-models";
import { errorInvalidVersion } from "../models/domain/errors.js";

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

        if (purposeHasNoVersionInAValidState(purpose.versions)) {
          throw errorInvalidVersion(
            `Missing valid version within versions Array for purposeId ${purpose.id}`,
          );
        }

        await operationsService.savePurpose(
          { ...correlationIdToHeader(ctx.correlationId) },
          {
            id: purpose.id,
            eserviceId: purpose.eserviceId,
            consumerId: purpose.consumerId,
            purposeTitle: purpose.title,
          },
          logger,
        );
      },
    )
    .with(
      {
        type: P.union(
          "PurposeCreated",
          "PurposeUpdated",
          "PurposeVersionWaitedForApproval",
          "PurposeVersionCreated",
          "PurposeVersionUpdated",
          "PurposeVersionDeleted",
          "PurposeVersionRejected",
          "PurposeDeleted",
          "PurposeVersionSuspended",
          "PurposeVersionArchived",
        ),
      },
      async () => {
        logger.info(`Skip event ${event.type} (not relevant)`);
      },
    )
    .exhaustive();
}

const validVersionInVersionsV1 = (
  purposeVersions: PurposeVersionV1[],
): { versionId: string; state: string } | undefined =>
  match(purposeVersions)
    .when(
      (versions) =>
        versions.some((version) => version.state === PurposeStateV1.ACTIVE),
      () => getVersionBy(PurposeStateV1.ACTIVE, purposeVersions),
    )
    .when(
      (versions) =>
        versions.some((version) => version.state === PurposeStateV1.SUSPENDED),
      () => getVersionBy(PurposeStateV1.SUSPENDED, purposeVersions),
    )
    .when(
      (versions) =>
        versions.some((version) => version.state === PurposeStateV1.ARCHIVED),
      () => getVersionBy(PurposeStateV1.ARCHIVED, purposeVersions),
    )
    .otherwise(() => undefined);

const getVersionBy = (
  purposeState: PurposeStateV1,
  purposeVersions: PurposeVersionV1[],
): {
  versionId: string;
  state: string;
} =>
  purposeVersions
    .filter((version) => version.state === purposeState)
    .reduce(
      (obj, version) => {
        const { id, state } = version;
        return { ...obj, versionId: id, state: PurposeStateV1[state] };
      },
      {} as { versionId: string; state: string },
    );

const purposeHasNoVersionInAValidState = (
  versions: PurposeVersionV1[],
): boolean => {
  return !validVersionInVersionsV1(versions);
};
