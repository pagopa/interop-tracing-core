import { genericInternalError } from "pagopa-interop-tracing-models";
import { DB, genericLogger } from "pagopa-interop-tracing-commons";
import {
  EnrichedPurpose,
  EserviceSchema,
  TracingContent,
  TracingRecords,
} from "../../models/messages.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getEnrichedPurpose(
      records: TracingRecords,
      tracing: TracingContent,
    ): Promise<EnrichedPurpose[]> {
      try {
        const fullRecordPromises = records.map(async (record) => {
          try {
            genericLogger.info(
              `Get enriched purpose for tracingId: ${tracing.tracingId}`,
            );
            const fullPurpose = await db.oneOrNone<{
              purpose_title: string;
              eservice_id: string;
            }>(
              `SELECT purpose_title, eservice_id FROM tracing.purposes WHERE id = $1`,
              [record.purpose_id],
            );

            if (!fullPurpose) {
              return {
                ...record,
                status: record.status,
                purposeName: "Purpose not found",
                eservice: {} as EserviceSchema,
                message: `Purpose ${record.purpose_id} not found`,
                errorCode: `PURPOSE_NOT_FOUND`,
              };
            }

            const eService = await db.oneOrNone<EserviceSchema>(
              `SELECT * FROM tracing.eservices WHERE id = $1`,
              [fullPurpose.eservice_id],
            );

            if (!eService) {
              return {
                ...record,
                status: record.status,
                purposeName: "Eservice not found",
                eservice: {} as EserviceSchema,
                message: `Eservice ${fullPurpose.eservice_id} not found`,
                errorCode: `ESERVICE_NOT_FOUND`,
              };
            }

            const tenantEservice = await db.oneOrNone<EserviceSchema>(
              `SELECT * FROM tracing.eservices WHERE producer = $1 OR consumer = $1`,
              [tracing.tenantId],
            );

            if (!tenantEservice) {
              return {
                ...record,
                status: record.status,
                purposeName: "Eservice not associated",
                eservice: {} as EserviceSchema,
                message: `Eservice ${fullPurpose.eservice_id} is not associated with the producer or consumer`,
                errorCode: `ESERVICE_NOT_ASSOCIATED`,
              };
            }

            return {
              ...record,
              status: record.status,
              eservice: eService,
              purposeName: fullPurpose.purpose_title,
            };
          } catch (error) {
            console.error(
              `Error fetching record with purpose_id ${record.purpose_id}: ${error}`,
            );
            return {
              ...record,
              status: record.status,
              purposeName: "Purpose fetch error",
              eservice: {} as EserviceSchema,
              message: "purpose fetch error",
              code: `PURPOSE_FETCH_ERROR`,
            };
          }
        });

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

export type DBService = ReturnType<typeof dbServiceBuilder>;
