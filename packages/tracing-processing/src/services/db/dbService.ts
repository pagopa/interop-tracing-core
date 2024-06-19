import { genericInternalError } from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getPurposesByTracingId(tracingId: string) {
      try {
        return Promise.resolve([{}]);
      } catch (error) {
        throw genericInternalError(`Error getPurposesByTracingId: ${error}`);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
