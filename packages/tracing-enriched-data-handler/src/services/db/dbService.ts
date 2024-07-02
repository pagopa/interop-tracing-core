import { genericInternalError } from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(_db: DB) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async insertTracing(_tracingId: string, _records: unknown[]) {
      try {
        return Promise.resolve([{}]);
      } catch (error) {
        throw genericInternalError(`Error insertTracing: ${error}`);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteTracing(_tracingId: string) {
      try {
        return Promise.resolve([{}]);
      } catch (error) {
        throw genericInternalError(`Error insertTracing: ${error}`);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
