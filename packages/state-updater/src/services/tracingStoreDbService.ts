import {
  AppContext,
  DB,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-tracing-commons";
import {
  errorProcessingSavePurposeError,
  errorProcessingUpdateTracingState,
} from "../model/domain/errors.js";
import {
  SavePurposeErrorDto,
  UpdateTracingStateDto,
  generateId,
} from "pagopa-interop-tracing-models";
import { config } from "../utilities/config.js";

export const tracingStoreDbServiceBuilder = (db: DB) => {
  return {
    async updateTracingState(
      data: UpdateTracingStateDto,
      ctx: WithSQSMessageId<AppContext>,
    ): Promise<void> {
      try {
        const updateTracingStateQuery = `
          UPDATE ${config.dbSchemaName}.tracings
            SET state = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id`;

        await db.one(updateTracingStateQuery, [data.state, data.tracingId]);

        logger(ctx).info(
          `Updating tracing state to "${data.state}" for tracingId: ${data.tracingId}, version: ${data.version}`,
        );
      } catch (error: unknown) {
        throw errorProcessingUpdateTracingState(
          `Error updating tracingId: ${data.tracingId}, version: ${data.version}. Details: ${error}`,
        );
      }
    },
    async savePurposeError(
      data: SavePurposeErrorDto,
      ctx: WithSQSMessageId<AppContext>,
    ): Promise<void> {
      try {
        const insertPurposeErrorQuery = `
          INSERT INTO ${config.dbSchemaName}.purposes_errors
            (id, tracing_id, version, purpose_id, error_code, message, row_number)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id;
        `;

        await db.one(insertPurposeErrorQuery, [
          generateId(),
          data.tracingId,
          data.version,
          data.purposeId,
          data.errorCode,
          data.message,
          data.rowNumber,
        ]);

        logger(ctx).info(
          `Saving purpose error with purposeId "${data.purposeId}" rowNumber ${data.rowNumber} for tracingId: ${data.tracingId}, version: ${data.version}`,
        );
      } catch (error: unknown) {
        throw errorProcessingSavePurposeError(
          `Error saving purpose error for tracingId: ${
            data.tracingId
          }. Data: ${JSON.stringify(data)}. Details: ${error}`,
        );
      }
    },
  };
};

export type TracingStoreDbService = ReturnType<
  typeof tracingStoreDbServiceBuilder
>;
