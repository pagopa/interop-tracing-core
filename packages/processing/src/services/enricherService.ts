import { DB, PurposeErrorCodes } from "pagopa-interop-tracing-commons";
import { getEnrichedPurposeError } from "../models/errors.js";
import {
  TracingRecordSchema,
  EserviceSchema,
  DelegationSchema,
  TenantSchema,
  PurposeSchema,
} from "../models/db.js";
import { EnrichedPurpose, PurposeErrorMessage } from "../models/csv.js";
import {
  delegationState,
  TracingFromS3KeyPathDto,
} from "pagopa-interop-tracing-models";
import { config } from "../utilities/config.js";

type EnrichedPurposeResult = {
  enriched: EnrichedPurpose[];
  errors: PurposeErrorMessage[];
};

export function dbServiceBuilder(db: DB) {
  return {
    async getEnrichedPurpose(
      records: TracingRecordSchema[],
      tracing: TracingFromS3KeyPathDto,
    ): Promise<EnrichedPurposeResult> {
      try {
        const enriched: EnrichedPurpose[] = [];
        const errors: PurposeErrorMessage[] = [];

        const consumer = await db.oneOrNone<
          Pick<TenantSchema, "name" | "origin" | "external_id">
        >(
          `SELECT name, origin, external_id FROM ${config.dbSchemaName}.tenants 
            WHERE id = $1`,
          [tracing.tenantId],
        );

        if (!consumer) {
          throw new Error(
            `Consumer ${tracing.tenantId} not found for tracingId: ${tracing.tracingId}.`,
          );
        }

        const purposeIds = [...new Set(records.map((r) => r.purpose_id))];

        const purposes = await db.any<
          Pick<
            PurposeSchema,
            "id" | "purpose_title" | "eservice_id" | "consumer_id"
          >
        >(
          `SELECT id, purpose_title, eservice_id, consumer_id FROM ${config.dbSchemaName}.purposes 
            WHERE id = ANY($1::uuid[])`,
          [purposeIds],
        );

        const purposesMap = new Map(purposes.map((p) => [p.id, p]));

        const eserviceIds = [...new Set(purposes.map((p) => p.eservice_id))];

        const eservices = await db.any<EserviceSchema>(
          `SELECT * FROM ${config.dbSchemaName}.eservices 
            WHERE eservice_id = ANY($1::uuid[])`,
          [eserviceIds],
        );

        const eserviceMap = new Map(eservices.map((e) => [e.eservice_id, e]));

        const delegations = await db.any<DelegationSchema>(
          `SELECT eservice_id FROM ${config.dbSchemaName}.delegations 
            WHERE state = $1 AND delegate_id = $2`,
          [delegationState.active, tracing.tenantId],
        );

        const delegatedSet = new Set(delegations.map((d) => d.eservice_id));

        const producerIds = [...new Set(eservices.map((e) => e.producer_id))];

        const producers = await db.any<
          Pick<TenantSchema, "id" | "name" | "origin" | "external_id">
        >(
          `SELECT id, name, origin, external_id FROM ${config.dbSchemaName}.tenants 
            WHERE id = ANY($1::uuid[])`,
          [producerIds],
        );

        const producerMap = new Map(producers.map((p) => [p.id, p]));

        for (const record of records) {
          const fullPurpose = purposesMap.get(record.purpose_id);
          if (!fullPurpose) {
            errors.push({
              purposeId: record.purpose_id,
              errorCode: PurposeErrorCodes.PURPOSE_NOT_FOUND,
              message: `purpose_id: Invalid purpose id ${record.purpose_id}`,
              rowNumber: record.rowNumber,
            });
            continue;
          }

          const eService = eserviceMap.get(fullPurpose.eservice_id);
          if (!eService) {
            throw new Error(
              `Eservice ${fullPurpose.eservice_id} not found for tracingId: ${tracing.tracingId}, purpose_id: ${record.purpose_id}`,
            );
          }

          const isEserviceOwnedBySubmitter =
            eService.producer_id === tracing.tenantId;
          const isSubmitterDelegatedForEservice = delegatedSet.has(
            eService.eservice_id,
          );
          const isSubmitterConsumerForPurpose =
            fullPurpose.consumer_id === tracing.tenantId;

          if (
            !isEserviceOwnedBySubmitter &&
            !isSubmitterDelegatedForEservice &&
            !isSubmitterConsumerForPurpose
          ) {
            errors.push({
              purposeId: record.purpose_id,
              errorCode: PurposeErrorCodes.TENANT_IS_NOT_PRODUCER_OR_CONSUMER,
              message: `purpose_id: Invalid purpose id ${record.purpose_id}`,
              rowNumber: record.rowNumber,
            });
            continue;
          }

          const producer = producerMap.get(eService.producer_id);
          if (!producer) {
            throw new Error(
              `Producer ${eService.producer_id} not found for tracingId: ${tracing.tracingId}, purpose_id: ${record.purpose_id}`,
            );
          }

          enriched.push(
            enrichSuccessfulPurpose(
              record,
              tracing,
              eService,
              fullPurpose,
              consumer,
              producer,
            ),
          );
        }

        return { enriched, errors };
      } catch (error: unknown) {
        throw getEnrichedPurposeError(`${error}`);
      }
    },
  };
}

function enrichSuccessfulPurpose(
  record: TracingRecordSchema,
  tracing: TracingFromS3KeyPathDto,
  eService: EserviceSchema,
  fullPurpose: Pick<
    PurposeSchema,
    "id" | "purpose_title" | "eservice_id" | "consumer_id"
  >,
  tenant: Pick<TenantSchema, "name" | "origin" | "external_id">,
  producer: Pick<TenantSchema, "id" | "name" | "origin" | "external_id">,
): EnrichedPurpose {
  return {
    ...record,
    purposeId: record.purpose_id,
    consumerId: fullPurpose.consumer_id,
    requestsCount: record.requests_count,
    tracingId: tracing.tracingId,
    token_id: record.token_id,
    status: record.status,
    producerId: eService.producer_id,
    eserviceId: eService.eservice_id,
    purposeName: fullPurpose.purpose_title,
    consumerName: tenant.name,
    consumerOrigin: tenant.origin,
    consumerExternalId: tenant.external_id,
    producerName: producer.name,
    producerOrigin: producer.origin,
    producerExternalId: producer.external_id,
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
