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

    async getTracingErrors() {
      try {
        return Promise.resolve();
      } catch (error) {
        throw genericInternalError(`Error getTracingErrors: ${error}`);
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
            SET state = $1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`;

        await db.none(updateTracingStateQuery, [data.state, data.tracing_id]);
      } catch (error) {
        throw dbServiceErrorMapper(error);
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
    async findTracingById(tracingId: string) {
      try {
        const findOneTracingQuery = `
          SELECT id, tenant_id, state, date, version, errors 
          FROM tracing.tracings
          WHERE id = $1
          LIMIT 1;`;

        const tracing = await db.oneOrNone(findOneTracingQuery, [tracingId]);

        return tracing;
      } catch (error) {
        throw dbServiceErrorMapper(error);
      }
    },
  };
}

export type DBService = ReturnType<typeof dbServiceBuilder>;
