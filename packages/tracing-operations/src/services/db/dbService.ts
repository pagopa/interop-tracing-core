import {
  TracingState,
  existingTenantError,
  genericInternalError,
  tracingState,
} from "pagopa-interop-tracing-models";
import { DB, logger } from "pagopa-interop-tracing-commons";
import { errorMapper } from "../../utilities/errorMappers.js";
import { Tracing } from "../../model/domain/db.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    async getTenantByPurposeId(purposeId: string): Promise<string> {
      try {
        const resultQuery: { consumer_id: string } = await db.one(
          "SELECT consumer_id FROM tracing.purposes WHERE id = $1",
          [purposeId],
        );
        return resultQuery.consumer_id;
      } catch (error) {
        throw genericInternalError(`Error getTenantByPurposeId: ${error}`);
      }
    },

    async getTracings() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error getTracings: ${error}`);
      }
    },

    async getTracingErrors() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error getTracingErrors: ${error}`);
      }
    },

    async submitTracing(tracing: Tracing & { purpose_id: string }): Promise<{
      tracing_id: string;
      errors: boolean;
      tenant_id?: string;
      state?: TracingState;
      date?: string;
      version?: number;
    }> {
      try {
        logger.info("Start submitTracing queries ");
        const checkExistingQuery = `
          SELECT state FROM tracing.tracings
          WHERE tenant_id = $1 AND date >= $2 AND date < $2::date + interval '1 day'`;

        const insertTracingQuery = `
          INSERT INTO tracing.tracings (id, tenant_id, state, date, version)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, tenant_id, date, state, version`;

        const checkErrorsQuery = `
          SELECT 1
          FROM tracing.purposes_errors pe 
          JOIN tracing.tracings tracing ON tracing.id = pe.tracing_id 
          WHERE tracing.version = pe.version AND pe.purpose_id = $1`;

        const checkValues = [tracing.tenant_id, tracing.date];
        const checkErrorsValues = [tracing.purpose_id];
        const insertValues = [
          tracing.id,
          tracing.tenant_id,
          tracing.state,
          tracing.date,
          tracing.version,
        ];

        const existingResult = await db.oneOrNone(
          checkExistingQuery,
          checkValues,
        );
        const errorsResult = await db.oneOrNone(
          checkErrorsQuery,
          checkErrorsValues,
        );

        if (existingResult && existingResult.state === tracingState.missing) {
          logger.info("Found tracing_id with state MISSING");
          const updateQuery = `
          UPDATE tracing.tracings 
          SET state = 'PENDING' 
          WHERE id = $1 
          RETURNING id, tenant_id, date, state, version`;
          const { id, tenant_id, date, state, version } = await db.one(
            updateQuery,
            [existingResult.id],
          );
          return {
            tracing_id: id,
            tenant_id,
            date,
            state,
            version,
            errors: !!errorsResult,
          };
        }

        if (existingResult) {
          throw existingTenantError([
            {
              name: "existingTenantError",
              message: "A tracing for this tenant already exist in this date",
            },
          ]);
        }
        const { id, tenant_id, version, date, state } = await db.one(
          insertTracingQuery,
          insertValues,
        );
        logger.info("Tracing inserted");
        return {
          tracing_id: id,
          tenant_id,
          version,
          date,
          state,
          errors: !!errorsResult,
        };
      } catch (error) {
        throw errorMapper(error);
      }
    },

    async recoverTracing() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error updateTracingOnError: ${error}`);
      }
    },
    async replaceTracing() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`error: ${error}`);
      }
    },

    async updateState() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error update state: ${error}`);
      }
    },
    async savePurposeError() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error save purpose error: ${error}`);
      }
    },
    async deletePurposeErrors() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error delete purpose error: ${error}`);
      }
    },
    async saveMissingTracing() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(
          `Error save missing tracing error: ${error}`,
        );
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
