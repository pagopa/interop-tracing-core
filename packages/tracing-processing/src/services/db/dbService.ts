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
        const fullRecordPromises = records.map(async (record) => {
          const fullPurpose: { purpose_title: string } | null =
            await db.oneOrNone<{ purpose_title: string }>(
              `SELECT purpose_title FROM tracing.purposes WHERE id = $1`,
              [record.purpose_id],
            );

          return {
            ...record,
            purposeName: fullPurpose?.purpose_title ?? "Purpose not found",
            error: !!!fullPurpose,
          };
        });
        return await Promise.all(fullRecordPromises);
      } catch (error) {
        throw genericInternalError(`Error getFullPurposeByPurposeId: ${error}`);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
