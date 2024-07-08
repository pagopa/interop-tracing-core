import { genericInternalError } from "pagopa-interop-tracing-models";
import {
  DB,
  genericLogger,
  purposeErrorCodes,
} from "pagopa-interop-tracing-commons";

import { getEnrichedPurposeError } from "../../models/errors.js";
import { TracingRecordSchema, EserviceSchema } from "../../models/db.js";
import { EnrichedPurpose, Eservice } from "../../models/csv.js";
import { TracingFromS3Path } from "../../models/tracing.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    async getEnrichedPurpose(
      records: TracingRecordSchema[],
      tracing: TracingFromS3Path,
    ): Promise<EnrichedPurpose[]> {
      try {
        const fullRecordPromises = records.map(
          async (record: TracingRecordSchema) => {
            try {
              genericLogger.info(
                `Get enriched purpose ${record.purpose_id}, for tracingId: ${tracing.tracingId}`,
              );

              if (isPurposeAndStatusNotUnique(record, records)) {
                return enrichPurposeWithError(
                  record,
                  tracing,
                  "PURPOSE_AND_STATUS_NOT_UNIQUE",
                );
              }

              const fullPurpose = await db.oneOrNone<{
                purpose_title: string;
                eservice_id: string;
              }>(
                `SELECT purpose_title, eservice_id FROM tracing.purposes WHERE id = $1`,
                [record.purpose_id],
              );

              if (!fullPurpose) {
                return enrichPurposeWithError(
                  record,
                  tracing,
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
                return enrichPurposeWithError(
                  record,
                  tracing,
                  "CONSUMER_NOT_FOUND",
                );
              }

              if (!eService) {
                return enrichPurposeWithError(
                  record,
                  tracing,
                  "ESERVICE_NOT_FOUND",
                );
              }

              const tenantEservice = await db.oneOrNone<EserviceSchema>(
                `SELECT * FROM tracing.eservices WHERE (producer_id = $1 OR consumer_id = $1)`,
                [tracing.tenantId],
              );

              if (!tenantEservice) {
                return enrichPurposeWithError(
                  record,
                  tracing,
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
                return enrichPurposeWithError(
                  record,
                  tracing,
                  "PRODUCER_NOT_FOUND",
                );
              }

              return enrichSuccessfulPurpose(
                record,
                tracing,
                eService,
                fullPurpose,
                consumer,
                producer,
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

function enrichSuccessfulPurpose(
  record: TracingRecordSchema,
  tracing: TracingFromS3Path,
  eService: EserviceSchema,
  fullPurpose: { purpose_title: string; eservice_id: string },
  tenant: { name: string; origin: string; external_id: string },
  producer: { name: string; origin: string; external_id: string },
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
    eservice: {
      producerId: eService.producer_id,
      consumerId: eService.consumer_id,
      eserviceId: eService.eservice_id,
    },
    purposeName: fullPurpose.purpose_title,
    consumerName: tenant.name,
    consumerOrigin: tenant.origin,
    consumerExternalId: tenant.external_id,
    producerName: producer.name,
    producerOrigin: producer.origin,
    producerExternalId: producer.external_id,
    errorCode: undefined,
    errorMessage: undefined,
  };
}

function enrichPurposeWithError(
  record: TracingRecordSchema,
  tracing: TracingFromS3Path,
  errorType: keyof typeof purposeErrorCodes,
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
    eservice: {} as Eservice,
    purposeName: "",
    consumerName: "",
    consumerOrigin: "",
    consumerExternalId: "",
    producerName: "",
    producerOrigin: "",
    producerExternalId: "",
    errorCode: errorType,
    errorMessage: purposeErrorCodes[errorType].code,
  };
}

function isPurposeAndStatusNotUnique(
  record: TracingRecordSchema,
  records: TracingRecordSchema[],
): boolean {
  const duplicateRecords = records.filter(
    (r) => r.purpose_id === record.purpose_id && r.status === record.status,
  );

  return duplicateRecords.length > 1;
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
