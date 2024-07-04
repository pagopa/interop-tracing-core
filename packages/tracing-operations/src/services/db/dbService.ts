import {
  PurposeId,
  TenantId,
  TracingState,
  genericInternalError,
  tracingAlreadyExists,
  tracingState,
} from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import { Tracing } from "../../model/domain/db.js";
import { dbServiceErrorMapper } from "../../utilities/dbServiceErrorMapper.js";
import { DateUnit, truncatedTo } from "../../utilities/date.js";
import {
  ApiGetTracingsQuery,
  ApiGetTracingsResponse,
} from "pagopa-interop-tracing-operations-client";
import { TracingsContentResponse } from "../../model/domain/tracing.js";

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

    async getTracings(
      filters: ApiGetTracingsQuery,
    ): Promise<ApiGetTracingsResponse> {
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

      const parsedTracings = TracingsContentResponse.safeParse(tracings);
      if (!parsedTracings.success) {
        throw new Error(
          `Unable to parse tracings items: result ${JSON.stringify(
            parsedTracings,
          )} - data ${JSON.stringify(tracings)}`,
        );
      }

      return {
        results: parsedTracings.data,
        totalCount: total_count,
      };
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
