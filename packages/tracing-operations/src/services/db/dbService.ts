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
  UpdateTracingStateAndVersionSchema,
} from "../../model/domain/db.js";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";
import { DateUnit, truncatedTo } from "../../utilities/date.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function dbServiceBuilder(db: DB) {
  return {
    async getTenantByPurposeId(purposeId: PurposeId): Promise<TenantId> {
      try {
        const { consumer_id } = await db.one<{ consumer_id: TenantId }>(
          "SELECT consumer_id FROM tracing.purposes WHERE id = $1",
          [purposeId],
        );
        return consumer_id;
      } catch (error) {
        throw dbServiceErrorMapper("getTenantByPurposeId", error);
      }
    },

    async getTracings(filters: {
      offset: number;
      limit: number;
      states?: TracingState[];
      tenantId: string;
    }): Promise<{ results: Tracing[]; totalCount: number }> {
      try {
        const { offset, limit, states = [], tenantId } = filters;

        const getTracingsTotalCountQuery = `
          SELECT COUNT(*)::integer as total_count
          FROM tracing.tracings
          WHERE tenant_id = $2 AND ((COALESCE(array_length($1::text[], 1), 0) = 0) OR state = ANY($1::text[]))
        `;

        const { total_count } = await db.one<{ total_count: number }>(
          getTracingsTotalCountQuery,
          [states, tenantId],
        );

        const getTracingsQuery = `
          SELECT *
          FROM tracing.tracings
          WHERE tenant_id = $2 AND ((COALESCE(array_length($1::text[], 1), 0) = 0) OR state = ANY($1::text[]))
          OFFSET $3 LIMIT $4
        `;

        const tracings = await db.any<Tracing>(getTracingsQuery, [
          states,
          tenantId,
          offset,
          limit,
        ]);

        return {
          results: tracings,
          totalCount: total_count,
        };
      } catch (error) {
        throw dbServiceErrorMapper("getTracings", error);
      }
    },

    async getTracingErrors(filters: {
      offset: number;
      limit: number;
      tracing_id: string;
    }): Promise<{ results: PurposeError[]; totalCount: number }> {
      try {
        const { offset, limit, tracing_id } = filters;

        const getTracingErrorsTotalCountQuery = `
          SELECT COUNT(*)::integer as total_count
          FROM tracing.purposes_errors pe 
            JOIN tracing.tracings tr ON tr.id = pe.tracing_id
          WHERE tr.version = pe.version AND pe.tracing_id = $1
        `;

        const { total_count } = await db.one<{ total_count: number }>(
          getTracingErrorsTotalCountQuery,
          [tracing_id],
        );

        const getTracingErrorsQuery = `
          SELECT pe.id, pe.version, pe.tracing_id, pe.purpose_id, pe.error_code, pe.message, pe.row_number
          FROM tracing.purposes_errors pe 
            JOIN tracing.tracings tr ON tr.id = pe.tracing_id
          WHERE tr.version = pe.version AND pe.tracing_id = $3
          OFFSET $1 LIMIT $2
        `;

        const tracingErrors = await db.any<PurposeError>(
          getTracingErrorsQuery,
          [offset, limit, tracing_id],
        );

        return {
          results: tracingErrors,
          totalCount: total_count,
        };
      } catch (error) {
        throw dbServiceErrorMapper("getTracingErrors", error);
      }
    },

    async submitTracing(data: Tracing): Promise<Tracing> {
      try {
        const truncatedDate: Date = truncatedTo(
          new Date(data.date).toISOString(),
          DateUnit.DAYS,
        );

        const findOneTracingQuery = `
          SELECT id, state FROM tracing.tracings
          WHERE tenant_id = $1 AND date >= $2 AND date < $2::date + interval '1 day'
          LIMIT 1;`;

        const tracing = await db.oneOrNone<Tracing | null>(
          findOneTracingQuery,
          [data.tenant_id, truncatedDate],
        );

        if (tracing && tracing.state !== tracingState.missing) {
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

        if (tracing && tracing.state === tracingState.missing) {
          const updateTracingQuery = `
            UPDATE tracing.tracings 
            SET state = 'PENDING', 
                errors = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 
            RETURNING id, tenant_id, date, state, version`;

          const updatedTracing = await db.one<Tracing>(updateTracingQuery, [
            tracing.id,
          ]);

          const pastTracingsHasErrors = await db.oneOrNone<boolean | null>(
            findPastTracingErrorsQuery,
            [data.tenant_id, data.id],
          );

          return {
            id: updatedTracing.id,
            tenant_id: updatedTracing.tenant_id,
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

        const newTracing = await db.one<Tracing>(insertTracingQuery, [
          data.id,
          data.tenant_id,
          data.state,
          truncatedDate,
          data.version,
        ]);

        const pastTracingsHasErrors = await db.oneOrNone<boolean | null>(
          findPastTracingErrorsQuery,
          [data.tenant_id, newTracing.id],
        );

        return {
          id: newTracing.id,
          tenant_id: newTracing.tenant_id,
          version: newTracing.version,
          date: newTracing.date,
          state: newTracing.state,
          errors: !!pastTracingsHasErrors,
        };
      } catch (error) {
        throw dbServiceErrorMapper("submitTracing", error);
      }
    },

    async findTracingById(tracingId: string): Promise<Tracing | null> {
      try {
        const findOneTracingQuery = `
          SELECT id, tenant_id, state, date, version, errors 
          FROM tracing.tracings
          WHERE id = $1
          LIMIT 1;`;

        const tracing = await db.oneOrNone<Tracing | null>(
          findOneTracingQuery,
          [tracingId],
        );

        return tracing;
      } catch (error) {
        throw dbServiceErrorMapper("findTracingById", error);
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
            SET state = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`;

        await db.none(updateTracingStateQuery, [data.state, data.tracing_id]);
      } catch (error) {
        throw dbServiceErrorMapper("updateTracingState", error);
      }
    },

    async updateTracingStateAndVersion(
      data: UpdateTracingStateAndVersionSchema,
    ): Promise<void> {
      try {
        const updateTracingStateQuery = `
          UPDATE tracing.tracings
            SET version = $2,
              state = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`;

        await db.none(updateTracingStateQuery, [
          data.tracing_id,
          data.version,
          data.state,
        ]);
      } catch (error) {
        throw dbServiceErrorMapper("updateTracingStateAndVersion", error);
      }
    },

    async savePurposeError(data: PurposeError): Promise<void> {
      try {
        const upsertTracingQuery = `
          INSERT INTO tracing.purposes_errors (id, tracing_id, version, purpose_id, error_code, message, row_number)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tracing_id, purpose_id, version, row_number) DO NOTHING
          RETURNING id;
        `;

        await db.one(upsertTracingQuery, [
          data.id,
          data.tracing_id,
          data.version,
          data.purpose_id,
          data.error_code,
          data.message,
          data.row_number,
        ]);
      } catch (error) {
        throw dbServiceErrorMapper("savePurposeError", error);
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
