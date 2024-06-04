import { logger } from "pagopa-interop-tracing-commons";
import { DBService } from "./db/dbService.js";

export function deleteServiceBuilder(dbService: DBService) {
  return {
    async deleteErrors(): Promise<void> {
      logger.info(`Delete purpose error`);
      await dbService.deleteErrors();
      return Promise.resolve();
    },
  };
}
export type DeleteService = ReturnType<typeof deleteServiceBuilder>;
