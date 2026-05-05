import { OperationsService } from "./services/operationsService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { config } from "./utilities/config.js";
import { AppContext } from "pagopa-interop-tracing-commons";
import { logger } from "pagopa-interop-tracing-commons";
import {
  CorrelationId,
  correlationIdToHeader,
  generateId,
} from "pagopa-interop-tracing-models";

export async function processTask(service: OperationsService): Promise<void> {
  const ctx: AppContext = {
    serviceName: config.applicationName,
    correlationId: generateId<CorrelationId>(),
  };

  try {
    logger(ctx).info(`Start clean up purposes errors.`);

    await service.deletePurposesErrors(
      {
        ...correlationIdToHeader(ctx.correlationId),
      },
      logger(ctx),
    );

    logger(ctx).info(`End clean up purposes errors.`);
  } catch (error: unknown) {
    throw errorMapper(error, logger(ctx));
  }
}
