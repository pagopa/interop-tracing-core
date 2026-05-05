import { DBContext } from "pagopa-interop-tracing-commons";
import { TracingEnriched } from "../../models/messages.js";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";
import { tracesRepository } from "../../repositories/traces.repository.js";

export function dbServiceBuilder(db: DBContext) {
  const repository = tracesRepository(db);

  return {
    async insertToStaging(tracingId: string, records: TracingEnriched[]) {
      try {
        await repository.insertTracesToStaging(db.conn, tracingId, records);
      } catch (error: unknown) {
        throw dbServiceErrorMapper("insertToStaging", error);
      }
    },

    async finalizeMergeToTarget(tracingId: string) {
      try {
        await db.conn.tx(async (t) => {
          await repository.deleteOldTracesFromTarget(t, tracingId);
          await repository.mergeTracesToTarget(t);
        });
      } catch (error: unknown) {
        throw dbServiceErrorMapper("finalizeMergeToTarget", error);
      }
    },

    async cleanStaging() {
      try {
        await repository.cleanStaging(db.conn);
      } catch (error: unknown) {
        throw dbServiceErrorMapper("cleanStaging", error);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
