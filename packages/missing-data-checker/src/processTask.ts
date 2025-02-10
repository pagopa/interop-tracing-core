import { OperationsService } from "./services/operationsService.js";
import { errorMapper } from "./utilities/errorMapper.js";
import { config } from "./utilities/config.js";
import {
  AppContext,
  TimeFormat,
  changeDateFormat,
} from "pagopa-interop-tracing-commons";
import { logger } from "pagopa-interop-tracing-commons";
import {
  CorrelationId,
  correlationIdToHeader,
  generateId,
} from "pagopa-interop-tracing-models";

export async function processTask(service: OperationsService): Promise<void> {
  const rootCorrelationId: CorrelationId = generateId<CorrelationId>();
  let batchCorrelationId: CorrelationId = generateId<CorrelationId>();

  const date = changeDateFormat(
    new Date(
      new Date().getTime() - config.daysOffsetFromNow * 24 * 3600 * 1000,
    ),
    TimeFormat.YY_MM_DD,
  );

  try {
    logger({
      serviceName: config.applicationName,
      correlationId: rootCorrelationId,
    }).info(`Start processing tenants missing tracings for date: ${date}.`);

    const limit: number = 1000;
    let offset: number = 0;
    let totalCount: number = 0;

    do {
      const batchCtx: AppContext = {
        serviceName: config.applicationName,
        correlationId: batchCorrelationId,
      };

      const tenants = await service.getTenantsWithMissingTracings(
        {
          ...correlationIdToHeader(batchCtx.correlationId),
        },
        {
          date,
          offset,
          limit,
        },
        logger(batchCtx),
      );

      for await (const id of tenants.results) {
        const ctx: AppContext = {
          serviceName: config.applicationName,
          correlationId: generateId<CorrelationId>(),
        };

        try {
          await service.saveMissingTracing(
            {
              ...correlationIdToHeader(ctx.correlationId),
            },
            {
              tenantId: id,
            },
            { date },
            logger(ctx),
          );
        } catch (error: unknown) {
          logger(ctx).error(error);
        }
      }

      totalCount = tenants.totalCount;
      offset += limit;
      batchCorrelationId = generateId<CorrelationId>();
    } while (offset < totalCount);

    logger({
      serviceName: config.applicationName,
      correlationId: rootCorrelationId,
    }).info(`End processing tenants missing tracings for date: ${date}.`);
  } catch (error: unknown) {
    throw errorMapper(
      error,
      logger({
        serviceName: config.applicationName,
        correlationId: batchCorrelationId,
      }),
    );
  }
}
