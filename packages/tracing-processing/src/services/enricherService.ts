import {
  AppContext,
  DB,
  PurposeErrorCodes,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import { getEnrichedPurposeError } from "../models/errors.js";
import { TracingRecordSchema, EserviceSchema } from "../models/db.js";
import { EnrichedPurpose, PurposeErrorMessage } from "../models/csv.js";
import { TracingFromS3KeyPathDto } from "pagopa-interop-tracing-models";

type EnrichedPurposeResult = (PurposeErrorMessage[] | EnrichedPurpose)[];

export function dbServiceBuilder(db: DB) {
  return {
    async getEnrichedPurpose(
      records: TracingRecordSchema[],
      tracing: TracingFromS3KeyPathDto,
      ctx: WithSQSMessageId<AppContext>,
    ): Promise<EnrichedPurposeResult> {
      try {
        const fullRecordPromises = records.map(
          async (record: TracingRecordSchema) => {
            logger(ctx).info(
              `Get enriched purpose ${record.purpose_id}, for tracingId: ${tracing.tracingId}`,
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
              throw getEnrichedPurposeError(
                `Consumer ${tracing.tenantId} not found for tracingId: ${tracing.tracingId}, purpose_id: ${record.purpose_id}`,
              );
            }

            const fullPurpose = await db.oneOrNone<{
              purpose_title: string;
              eservice_id: string;
              consumer_id: string;
            }>(
              `SELECT purpose_title, eservice_id, consumer_id FROM tracing.purposes WHERE id = $1`,
              [record.purpose_id],
            );

            if (!fullPurpose) {
              return [
                {
                  purposeId: record.purpose_id,
                  errorCode: PurposeErrorCodes.PURPOSE_NOT_FOUND,
                  message: `purpose_id: Invalid purpose id ${record.purpose_id}.`,
                  rowNumber: record.rowNumber,
                },
              ];
            } else {
              const eService = await db.oneOrNone<EserviceSchema>(
                `SELECT * FROM tracing.eservices WHERE eservice_id = $1`,
                [fullPurpose.eservice_id],
              );

              if (!eService) {
                throw getEnrichedPurposeError(
                  `Eservice ${fullPurpose.eservice_id} not found for tracingId: ${tracing.tracingId}, purpose_id: ${record.purpose_id}`,
                );
              }

              const tenantEservice = await db.oneOrNone<EserviceSchema>(
                `SELECT * FROM tracing.eservices WHERE producer_id = $1 AND eservice_id = $2`,
                [tracing.tenantId, eService.eservice_id],
              );

              if (
                !tenantEservice &&
                fullPurpose.consumer_id !== tracing.tenantId
              ) {
                return [
                  {
                    purposeId: record.purpose_id,
                    errorCode:
                      PurposeErrorCodes.TENANT_IS_NOT_PRODUCER_OR_CONSUMER,
                    message: `purpose_id: Invalid purpose id ${record.purpose_id}.`,
                    rowNumber: record.rowNumber,
                  },
                ];
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
                throw getEnrichedPurposeError(
                  `Producer ${eService.producer_id} not found for tracingId: ${tracing.tracingId}, purpose_id: ${record.purpose_id}`,
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
            }
          },
        );

        return await Promise.all(fullRecordPromises);
      } catch (error: unknown) {
        throw error;
      }
    },
  };
}

function enrichSuccessfulPurpose(
  record: TracingRecordSchema,
  tracing: TracingFromS3KeyPathDto,
  eService: EserviceSchema,
  fullPurpose: {
    purpose_title: string;
    eservice_id: string;
    consumer_id: string;
  },
  tenant: { name: string; origin: string; external_id: string },
  producer: { name: string; origin: string; external_id: string },
): EnrichedPurpose {
  return {
    ...record,
    purposeId: record.purpose_id,
    consumerId: fullPurpose.consumer_id,
    requestsCount: record.requests_count,
    tracingId: tracing.tracingId,
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
