import { DB } from "pagopa-interop-tracing-commons";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";
import { config } from "../../utilities/config.js";

export function tracingStoreDbServiceBuilder(db: DB) {
  return {
    async getTracingVersion(tracingId: string): Promise<number> {
      try {
        const { version } = await db.one<{ version: number }>(
          `SELECT version FROM ${config.tracingStoreDbSchemaName}.tracings WHERE id = $1`,
          [tracingId],
        );
        return version;
      } catch (error: unknown) {
        throw dbServiceErrorMapper("getTracingVersion", error);
      }
    },
  };
}

export type TracingStoreDBService = ReturnType<
  typeof tracingStoreDbServiceBuilder
>;
