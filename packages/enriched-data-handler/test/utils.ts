import { DBConnection } from "pagopa-interop-tracing-commons";
import { TracingEnrichedSchema } from "../src/models/messages.js";
import { config } from "../src/utilities/config.js";
import camelcaseKeys from "camelcase-keys";

export async function getTraces(
  db: DBConnection,
  where: Partial<TracingEnrichedSchema>,
): Promise<TracingEnrichedSchema[]> {
  const entries = Object.entries(where) as Array<[string, unknown]>;

  const clause = entries
    .map(([key], index) => `"${snakeCaseMapper(key)}" = $${index + 1}`)
    .join(" AND ");

  const values = entries.map(([, value]) => value);

  const whereClause = clause ? `WHERE ${clause}` : "";

  const query = `
    SELECT *
    FROM ${config.dbSchemaName}.traces
    ${whereClause};
  `;

  const rows = await db.manyOrNone<TracingEnrichedSchema>(query, values);
  return rows.map((row) =>
    camelcaseKeys(row, {
      exclude: ["token_id"] as const,
    }),
  );
}

export function snakeCaseMapper(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
