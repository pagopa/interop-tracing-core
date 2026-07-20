import type { DBContext } from "pagopa-interop-tracing-commons";
import type { TracingEnriched } from "../../models/messages.js";
import { tracesRepository } from "../../repositories/traces.repository.js";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";

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

		async copyToStaging(s3Uri: string) {
			try {
				await repository.copyTracesToStaging(db.conn, s3Uri);
			} catch (error: unknown) {
				throw dbServiceErrorMapper("copyToStaging", error);
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
