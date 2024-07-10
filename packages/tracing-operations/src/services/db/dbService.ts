import {
  PurposeId,
  TenantId,
  TracingId,
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
  UpdateTracingVersion,
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

    async getTracings(filters: {
      offset: number;
      limit: number;
      states?: TracingState[];
    }): Promise<{ results: Tracing[]; totalCount: number }> {
      try {
        const { offset, limit, states = [] } = filters;

        const getTracingsTotalCountQuery = `
          SELECT COUNT(*)::integer as total_count
          FROM tracing.tracings
           WHERE (COALESCE(array_length($1::text[], 1), 0) = 0) OR state = ANY($1::text[])
        `;

        const { total_count }: { total_count: number } = await db.one(
          getTracingsTotalCountQuery,
          [states],
        );

        const getTracingsQuery = `
          SELECT *
          FROM tracing.tracings
          WHERE (COALESCE(array_length($1::text[], 1), 0) = 0) OR state = ANY($1::text[])
          OFFSET $2 LIMIT $3
        `;

        const tracings: Tracing[] = await db.any(getTracingsQuery, [
          states,
          offset,
          limit,
        ]);

        return {
          results: tracings,
          totalCount: total_count,
        };
      } catch (error) {
        throw dbServiceErrorMapper(error);
      }
    },

    async getTracingErrors(filters: {
      offset: number;
      limit: number;
      tracing_id: TracingId;
    }): Promise<{ results: PurposeError[]; totalCount: number }> {
      try {
        const { offset, limit, tracing_id } = filters;

        const getTracingErrorsTotalCountQuery = `
          SELECT COUNT(*)::integer as total_count
          FROM tracing.purposes_errors pe 
            JOIN tracing.tracings tr ON tr.id = pe.tracing_id
          WHERE tr.version = pe.version AND pe.tracing_id = $1
        `;

        const { total_count }: { total_count: number } = await db.one(
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

        const tracingErrors: PurposeError[] = await db.any(
          getTracingErrorsQuery,
          [offset, limit, tracing_id],
        );

        return {
          results: tracingErrors,
          totalCount: total_count,
        };
      } catch (error) {
        throw dbServiceErrorMapper(error);
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

    async findTracingById(tracingId: string): Promise<Tracing | null> {
      try {
        const findOneTracingQuery = `
          SELECT id, tenant_id, state, date, version, errors 
          FROM tracing.tracings
          WHERE id = $1
          LIMIT 1;`;

        const tracing: Tracing | null = await db.oneOrNone(
          findOneTracingQuery,
          [tracingId],
        );

        return tracing;
      } catch (error) {
        throw dbServiceErrorMapper(error);
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
          WHERE id = $2 
          RETURNING id`;

        await db.one(updateTracingStateQuery, [data.state, data.tracing_id]);
      } catch (error) {
        throw dbServiceErrorMapper(error);
      }
    },
    async updateTracingVersion(data: UpdateTracingVersion): Promise<void> {
      try {
        const updateTracingStateQuery = `
          UPDATE tracing.tracings
            SET version = $2
          WHERE id = $1 
          RETURNING id`;

        await db.one(updateTracingStateQuery, [data.tracing_id, data.version]);
      } catch (error) {
        throw dbServiceErrorMapper(error);
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
