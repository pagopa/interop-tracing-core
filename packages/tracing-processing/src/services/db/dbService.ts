import { genericInternalError } from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import {
  EnrichedPurpose,
  EserviceSchema,
  TracingRecords,
} from "../../models/messages.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getEnrichedPurpose(
      records: TracingRecords,
    ): Promise<EnrichedPurpose[]> {
      try {
        const fullRecordPromises = records.map(async (record) => {
          try {
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
                purposeName: "Purpose not found",
                eservice: {} as EserviceSchema,
                error: `Purpose ${record.purpose_id} not found`,
              };
            }

            const eService = await db.oneOrNone<EserviceSchema>(
              `SELECT * FROM tracing.eservices WHERE eservice_id = $1`,
              [fullPurpose.eservice_id],
            );

            if (!eService) {
              return {
                ...record,
                purposeName: "Purpose not found",
                eservice: {} as EserviceSchema,
                error: `Eservice ${fullPurpose.eservice_id} not found`,
              };
            }

            return {
              ...record,
              eservice: eService,
              purposeName: fullPurpose.purpose_title,
            };
          } catch (error) {
            console.error(
              `Error fetching record with purpose_id ${record.purpose_id}: ${error}`,
            );
            return {
              ...record,
              purposeName: "Purpose fetch error",
              eservice: {} as EserviceSchema,
              error: "purpose fetch error",
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
