import { genericInternalError } from "pagopa-interop-tracing-models";
import {
  DB,
  genericLogger,
  purposeErrorCodes,
} from "pagopa-interop-tracing-commons";
import {
  EnrichedPurpose,
  Eservice,
  EserviceSchema,
  TracingFromCsv,
  TracingRecordSchema,
} from "../../models/messages.js";
import { getEnrichedPurposeError } from "../../models/errors.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    async getEnrichedPurpose(
      records: TracingRecordSchema[],
      tracing: TracingFromCsv,
    ): Promise<EnrichedPurpose[]> {
      try {
        const fullRecordPromises = records.map(
          async (record: TracingRecordSchema) => {
            try {
              genericLogger.info(
                `Get enriched purpose ${record.purpose_id}, for tracingId: ${tracing.tracingId}`,
              );
              const fullPurpose = await db.oneOrNone<{
                purpose_title: string;
                eservice_id: string;
              }>(
                `SELECT purpose_title, eservice_id FROM tracing.purposes WHERE id = $1`,
                [record.purpose_id],
              );

              if (!fullPurpose) {
                return enrichPurpose(
                  record,
                  tracing,
                  null,
                  null,
                  null,
                  null,
                  "PURPOSE_NOT_FOUND",
                );
              }

              const eService = await db.oneOrNone<EserviceSchema>(
                `SELECT * FROM tracing.eservices WHERE eservice_id = $1`,
                [fullPurpose.eservice_id],
              );

              const consumer = await db.oneOrNone<{
                name: string;
                origin: string;
                external_id: string;
              }>(
                `SELECT name, origin, external_id FROM tracing.tenants WHERE id = $1`,
                [tracing.tenantId],
              );

              if (!consumer) {
                return enrichPurpose(
                  record,
                  tracing,
                  eService,
                  fullPurpose,
                  null,
                  null,
                  "CONSUMER_NOT_FOUND",
                );
              }

              if (!eService) {
                return enrichPurpose(
                  record,
                  tracing,
                  null,
                  fullPurpose,
                  consumer,
                  null,
                  "ESERVICE_NOT_FOUND",
                );
              }

              const tenantEservice = await db.oneOrNone<EserviceSchema>(
                `SELECT * FROM tracing.eservices WHERE (producer_id = $1 OR consumer_id = $1)`,
                [tracing.tenantId],
              );

              if (!tenantEservice) {
                return enrichPurpose(
                  record,
                  tracing,
                  eService,
                  fullPurpose,
                  consumer,
                  null,
                  "ESERVICE_NOT_ASSOCIATED",
                );
              }

              const producer = await db.oneOrNone<{
                name: string;
                origin: string;
                external_id: string;
              }>(
                `SELECT name, origin, external_id FROM tracing.tenants WHERE id = $1`,
                [eService.producer_id],
              );

              if (!producer) {
                return enrichPurpose(
                  record,
                  tracing,
                  eService,
                  fullPurpose,
                  consumer,
                  null,
                  "PRODUCER_NOT_FOUND",
                );
              }

              return enrichPurpose(
                record,
                tracing,
                eService,
                fullPurpose,
                consumer,
                producer,
                undefined,
              );
            } catch (error) {
              throw getEnrichedPurposeError(
                `Error fetching record for tracingId: ${tracing.tracingId}, purpose_id: ${record.purpose_id}: Details: ${error}`,
              );
            }
          },
        );

        const enrichedPurposes = await Promise.all(fullRecordPromises);

        return enrichedPurposes;
      } catch (error) {
        throw genericInternalError(
          `Error in getEnrichedPurpose function: ${error}`,
        );
      }
    },
  };
}

function enrichPurpose(
  record: TracingRecordSchema,
  tracing: TracingFromCsv,
  eService: EserviceSchema | null,
  fullPurpose: { purpose_title: string; eservice_id: string } | null,
  tenant: { name: string; origin: string; external_id: string } | null,
  producer: { name: string; origin: string; external_id: string } | null,
  errorType?: keyof typeof purposeErrorCodes,
): EnrichedPurpose {
  const baseRecord = {
    ...record,
    purposeId: record.purpose_id,
    requestsCount: record.requests_count,
    tracingId: tracing.tracingId,
    status: record.status,
  };

  return {
    ...baseRecord,
    eservice: eService
      ? {
          producerId: eService.producer_id,
          consumerId: eService.consumer_id,
          eserviceId: eService.eservice_id,
        }
      : ({} as Eservice),
    purposeName: fullPurpose ? fullPurpose.purpose_title : "",
    consumerName: tenant ? tenant.name : "",
    consumerOrigin: tenant ? tenant.origin : "",
    consumerExternalId: tenant ? tenant.external_id : "",
    producerName: producer ? producer.name : "",
    producerOrigin: producer ? producer.origin : "",
    producerExternalId: producer ? producer.external_id : "",
    errorCode: errorType,
    errorMessage: errorType ? purposeErrorCodes[errorType].code : undefined,
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
