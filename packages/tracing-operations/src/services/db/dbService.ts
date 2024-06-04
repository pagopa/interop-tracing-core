import {
  TracingState,
  genericInternalError,
  tracingState,
} from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
export interface Tenant {
  id: string;
  name: string;
  origin: string;
  externalId: string;
  deleted: boolean;
}

export interface Tracing {
  tenantId: string;
  state: TracingState;
  date: string;
  version: number;
  errors: boolean;
}
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

    async submitTracing(
      tracing: Tracing & { purpose_id: string },
    ): Promise<{ tracingId: string; errors: boolean }> {
      try {
        const checkExistingQuery = `
          SELECT id,state FROM tracing.tracings
          WHERE tenant_id = $1 AND date >= $2 AND date < $2::date + interval '1 day'`;

        const insertTracingQuery = `
          INSERT INTO tracing.tracings (tenant_id, state, date, version)
          VALUES ($1, $2, $3, $4)
          RETURNING id`;

        const checkErrorsQuery = `
          SELECT 1
          FROM tracing.purposes_errors pe 
          JOIN tracing.tracings tracing ON tracing.id = pe.tracing_id 
          WHERE tracing.version = pe.version AND pe.purpose_id = $1`;

        const checkValues = [tracing.tenantId, tracing.date];
        const checkErrorsValues = [tracing.purpose_id];
        const insertValues = [
          tracing.tenantId,
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
          const updateQuery = `
          UPDATE tracing.tracings 
          SET state = 'PENDING' 
          WHERE id = $1 
          RETURNING ID`;
          const updateResult = await db.one(updateQuery, [existingResult.id]);
          return { tracingId: updateResult.id, errors: !!errorsResult };
        }

        if (existingResult) {
          throw genericInternalError(
            "A tracing for this tenant and date already exists.",
          );
        }

        const insertResult = await db.one(insertTracingQuery, insertValues);

        return { tracingId: insertResult.id, errors: !!errorsResult };
      } catch (error) {
        throw genericInternalError(`Error createTracing: ${error}`);
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
