import {
  PurposeId,
  TenantId,
  TracingState,
  existingTenantError,
  genericInternalError,
  tracingState,
} from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import { Tracing } from "../../model/domain/db.js";
import { errorMapper } from "../../utilities/errorMappers.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    async getTenantByPurposeId(purposeId: PurposeId): Promise<TenantId> {
      try {
        const result: { consumer_id: TenantId } = await db.one(
          "SELECT consumer_id FROM tracing.purposes WHERE id = $1",
          [purposeId],
        );
        return result.consumer_id;
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

    async submitTracing(data: Tracing): Promise<{
      tracingId: string;
      tenantId: string;
      errors: boolean;
      state: TracingState;
      date: string;
      version: number;
    }> {
      try {
        const findOneTracingQuery = `
          SELECT state FROM tracing.tracings
          WHERE tenant_id = $1 AND date >= $2 AND date < $2::date + interval ‘1 day’`;

        const tracing: Tracing | null = await db.oneOrNone(
          findOneTracingQuery,
          [data.tenant_id, data.date],
        );

        if (tracing?.state === tracingState.completed) {
          throw existingTenantError([
            {
              name: "tracingAlreadyExistsError",
              message: `A tracing for the current tenant already exists on this date: ${tracing.date}`,
            },
          ]);
        }

        const findPastTracingErrorsQuery = `
          SELECT 1
          FROM tracing.tracings tracing
          WHERE (tracing.state = 'ERROR' OR tracing.state = 'MISSING')
            AND tracing.tenant_id = $1
            AND tracing.id <> $2
          LIMIT 1`;

        const pastTracingsHasErrors: boolean | null = await db.oneOrNone(
          findPastTracingErrorsQuery,
        );

        if (tracing?.state === tracingState.missing) {
          const updateTracingQuery = `
            UPDATE tracing.tracings 
            SET state = 'PENDING' 
            WHERE id = $1 
            RETURNING id, tenant_id, date, state, version`;

          const updatedTracing: Tracing = await db.one(updateTracingQuery, [
            tracing.id,
          ]);

          return {
            tracingId: updatedTracing.id,
            tenantId: updatedTracing.tenant_id,
            date: updatedTracing.date,
            state: updatedTracing.state,
            version: updatedTracing.version,
            errors: !!pastTracingsHasErrors,
          };
        }

        const insertTracingQuery = `
          INSERT INTO tracing.tracings (id, tenant_id, state, date, version)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, tenant_id, date, state, version`;

        const newTracing: Tracing = await db.one(insertTracingQuery, [
          data.id,
          data.tenant_id,
          data.state,
          data.date,
          data.version,
        ]);

        return {
          tracingId: newTracing.id,
          tenantId: newTracing.tenant_id,
          version: newTracing.version,
          date: newTracing.date,
          state: newTracing.state,
          errors: !!pastTracingsHasErrors,
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

    async updateTracingState() {
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
