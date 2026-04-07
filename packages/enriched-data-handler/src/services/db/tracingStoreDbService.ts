import {
  DB,
  checkVersionByFilter,
  TracingStoreTables,
} from "pagopa-interop-tracing-commons";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";
import { config } from "../../utilities/config.js";

export function tracingStoreDbServiceBuilder(db: DB) {
  return {
    async checkTracingVersion(
      tracingId: string,
      incomingVersion: number,
    ): Promise<boolean> {
      try {
        return await checkVersionByFilter(
          db,
          {
            schema: config.tracingStoreDbSchemaName,
            table: TracingStoreTables.tracings,
            versionColumn: "version",
            filterColumn: "id",
            filterValue: tracingId,
          },
          incomingVersion,
        );
      } catch (error: unknown) {
        throw dbServiceErrorMapper("checkTracingVersion", error);
      }
    },
  };
}

export type TracingStoreDBService = ReturnType<
  typeof tracingStoreDbServiceBuilder
>;
