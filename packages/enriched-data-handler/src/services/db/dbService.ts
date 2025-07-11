import { DBContext } from "pagopa-interop-tracing-commons";
import { TracingEnriched } from "../../models/messages.js";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";
import { tracesRepository } from "../../repositories/traces.repository.js";

export function dbServiceBuilder(db: DBContext) {
  const repository = tracesRepository(db);

  return {
    async ingestTraces(tracingId: string, records: TracingEnriched[]) {
      try {
        await db.conn.tx(async (t) => {
          await repository.insertToStaging(t, tracingId, records);
          await repository.mergeTraces(t);
          await repository.cleanTraces(t);
        });
      } catch (error: unknown) {
        throw dbServiceErrorMapper("ingestTraces", error);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
