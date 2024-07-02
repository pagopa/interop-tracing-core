import {
  PurposeId,
  TenantId,
  TracingState,
  genericInternalError,
  tracingAlreadyExists,
  tracingState,
} from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import {
  PurposeError,
  Tracing,
  UpdateTracingState,
} from "../../model/domain/db.js";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";
import { DateUnit, truncatedTo } from "../../utilities/date.js";

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
        const truncatedDate: Date = truncatedTo(
          new Date(data.date).toISOString(),
          DateUnit.DAYS,
        );

        const findOneTracingQuery = `
          SELECT id, state FROM tracing.tracings
          WHERE tenant_id = $1 AND date >= $2 AND date < $2::date + interval '1 day'
          LIMIT 1;`;

        const tracing: Tracing | null = await db.oneOrNone(
          findOneTracingQuery,
          [data.tenant_id, truncatedDate],
        );

        if (
          tracing?.state === tracingState.completed ||
          tracing?.state === tracingState.pending
        ) {
          throw tracingAlreadyExists(
            `A tracing for the current tenant already exists on this date: ${data.date}`,
          );
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
          [data.tenant_id, data.id],
        );

        if (tracing?.state === tracingState.missing) {
          const updateTracingQuery = `
            UPDATE tracing.tracings 
            SET state = 'PENDING', 
            errors = false
            WHERE id = $1 
            RETURNING id, tenant_id, date, state, version`;

          const updatedTracing: Tracing = await db.one(updateTracingQuery, [
            tracing.id,
          ]);

          const recheckErrors: boolean | null = await db.oneOrNone(
            findPastTracingErrorsQuery,
            [data.tenant_id, data.id],
          );

          return {
            tracingId: updatedTracing.id,
            tenantId: updatedTracing.tenant_id,
            date: updatedTracing.date,
            state: updatedTracing.state,
            version: updatedTracing.version,
            errors: !!recheckErrors,
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
          truncatedDate,
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
        throw dbServiceErrorMapper(error);
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

    async updateTracingState(data: UpdateTracingState): Promise<void> {
      try {
        const updateTracingStateQuery = `
          UPDATE tracing.tracings
            SET state = $1
          WHERE id = $2`;

        await db.none(updateTracingStateQuery, [data.state, data.tracing_id]);
      } catch (error) {
        throw dbServiceErrorMapper(error);
      }
    },
    async savePurposeError(data: PurposeError): Promise<void> {
      try {
        const upsertTracingQuery = `
          WITH upsert AS (
            UPDATE tracing.purposes_errors
            SET error_code = $5, message = $6
            WHERE tracing_id = $2
              AND purpose_id = $4
              AND version = $3
              AND row_number = $7
            RETURNING *
          )
          INSERT INTO tracing.purposes_errors (id, tracing_id, version, purpose_id, error_code, message, row_number)
          SELECT $1, $2, $3, $4, $5, $6, $7
          WHERE NOT EXISTS (SELECT * FROM upsert);
        `;

        await db.none(upsertTracingQuery, [
          data.id,
          data.tracing_id,
          data.version,
          data.purpose_id,
          data.error_code,
          data.message,
          data.row_number,
        ]);
      } catch (error) {
        throw dbServiceErrorMapper(error);
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
