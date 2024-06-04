import { logger } from "pagopa-interop-tracing-commons";
import { DBService } from "./db/dbService.js";
import { ApiMissingResponse } from "pagopa-interop-tracing-operations-client";

export function tenantServiceBuilder(dbService: DBService) {
  return {
    async saveMissingTracing(): Promise<ApiMissingResponse> {
      logger.info(`Saving missing tracing`);
      await dbService.saveMissingTracing();
      return Promise.resolve();
    },
  };
}
export type TenantService = ReturnType<typeof tenantServiceBuilder>;
