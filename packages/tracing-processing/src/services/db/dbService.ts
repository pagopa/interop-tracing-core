import { genericInternalError } from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import { EnrichedPurpose, TracingRecords } from "../../models/messages.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getEnrichedPurpose(
      records: TracingRecords,
    ): Promise<EnrichedPurpose[]> {
      try {
        const fullRecord = records.map(async (record) => {
          const fullPurpose = await db.oneOrNone(
            `SELECT * FROM tracing.purposes WHERE id = '${record.purpose_id}'`,
          );
          return { ...record, purposeName: fullPurpose?.purpose_title };
        });
        return Promise.all(fullRecord);
      } catch (error) {
        throw genericInternalError(`Error getFullPurposeByPurposeId: ${error}`);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
