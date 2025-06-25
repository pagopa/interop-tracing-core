import { z } from "zod";
import { ColumnSet, IColumnDescriptor, IMain, ITask } from "pg-promise";

import { config } from "./config.js";

/**
 * Generates a MERGE SQL query
 *
 * @param tableSchema - A Zod object schema refering to the table model from which to extract the list of keys.
 * @param schemaName - The target db schema name.
 * @param tableName - The  target table name.
 * @param keysOn - The column keys from the schema used in the ON condition of the MERGE.
 * @param stagingPartialTableName - Optional staging table name for partial upserts; if provided,
 * only the columns present in this table will be merged (e.g., for updating specific fields).
 * @returns The generated MERGE SQL query as a string.
 */
export function generateMergeQuery<T extends z.ZodRawShape>(
  tableSchema: z.ZodObject<T>,
  schemaName: string,
  keysOn: Array<keyof T>,
): string {
  const keys = Object.keys(tableSchema.shape);

  const updateSet = keys
    .map((k) => `${toSnakeCase(String(k))} = source.${toSnakeCase(String(k))}`)
    .join(",\n    ");

  const columns = keys.map((k) => toSnakeCase(String(k))).join(", ");
  const values = keys.map((k) => `source.${toSnakeCase(String(k))}`).join(", ");

  const onCondition = keysOn
    .map(
      (key) =>
        `${schemaName}.${"traces"}.${toSnakeCase(
          String(key),
        )} = source.${toSnakeCase(String(key))}`,
    )
    .join(" AND ");

  return `
        MERGE INTO ${schemaName}.${"traces"}
        USING ${"traces"}_staging AS source
        ON ${onCondition}
        WHEN MATCHED THEN
          UPDATE SET
            ${updateSet}
        WHEN NOT MATCHED THEN
          INSERT (${columns})
          VALUES (${values});
      `;
}
export type ColumnValue = string | number | Date | undefined | null | boolean;

/**
 * Builds a pg-promise ColumnSet for performing bulk insert/update operations on a given table.
 *
 * This function maps the fields of a Zod schema to database columns using a snake_case naming strategy,
 * which allows pg-promise to efficiently generate SQL for bulk operations.
 *
 * @template T - The Zod object schema shape describing the table structure.
 * @param pgp - The pg-promise main instance used to create the ColumnSet.
 * @param tableName - The logical name of the database table (without suffixes).
 * @param schema - The Zod schema representing the shape of the data to persist.
 * @returns A pg-promise ColumnSet object with mapped columns for bulk operations.
 */
export const buildColumnSet = <T extends z.ZodRawShape>(
  pgp: IMain,
  schema: z.ZodObject<T>,
): ColumnSet<z.infer<typeof schema>> => {
  const keys = Object.keys(schema.shape) as Array<keyof z.infer<typeof schema>>;

  const columns = keys.map((prop) => ({
    name: toSnakeCase(String(prop)), // Conversione diretta qui!
    init: ({ source }: IColumnDescriptor<z.infer<typeof schema>>) =>
      source[prop],
  }));
  return new pgp.helpers.ColumnSet(columns, {
    table: { table: `${"traces"}_${"staging"}` },
  });
};
/**
 * Purge obsolete rows in target tables by deleting based on staging data.
 *
 * This operation deletes any row in each target table that has the same key as a staging row
 * but a lower metadata_version, ensuring outdated records are removed.
 *
 * @param t - The pg-promise transaction object.
 * @param id - The key to match rows on during the delete.
 * @param targetTableNames - A list of target table names to apply the delete.
 * @param stagingTableName - The name of the staging table containing columns used for deleting condition.
 */
export async function cleaningTargetTables(t: ITask<unknown>, id: string) {
  const quoteColumn = (c: string) => `"${c}"`;

  const tracingIdColumnName = quoteColumn(toSnakeCase("tracingId"));

  const deleteQuery = `
    DELETE FROM ${config.dbSchemaName}.${"traces"} AS target
    USING ${"traces"}_${"staging"} AS source
    WHERE target.${tracingIdColumnName} = source.id
      AND source.id = $1;
  `.trim();

  await t.none(deleteQuery, [id]);
}

const toSnakeCase = (key: string): string => {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
};
