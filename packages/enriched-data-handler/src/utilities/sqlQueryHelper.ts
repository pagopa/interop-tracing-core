import { z } from "zod";
import { ColumnSet, IColumnDescriptor, IMain, ITask } from "pg-promise";

import { config } from "./config.js";

/**
 * Generates a MERGE SQL query for efficient upsert operations.
 * This query handles both inserting new records and updating existing ones
 * based on a specified ON condition.
 *
 * @template T - The Zod object schema shape defining the table structure.
 * @param tableSchema - A Zod object schema representing the structure of the data.
 * @param schemaName - The database schema name where the target table resides.
 * @param tableName - The name of the target table for the MERGE operation.
 * @param keysOn - An array of column keys used in the ON condition to identify matching rows.
 * @returns The generated MERGE SQL query string.
 */
export function generateMergeQuery<T extends z.ZodRawShape>(
  tableSchema: z.ZodObject<T>,
  schemaName: string,
  keysOn: Array<keyof T>,
  tableName: string,
): string {
  const keys = Object.keys(tableSchema.shape);
  const stagingTableName = `${tableName}_${config.mergeTableSuffix}`;

  const updateSet = keys
    .map((k) => `${toSnakeCase(String(k))} = source.${toSnakeCase(String(k))}`)
    .join(",\n    ");

  const columns = keys.map((k) => toSnakeCase(String(k))).join(", ");
  const values = keys.map((k) => `source.${toSnakeCase(String(k))}`).join(", ");

  const onCondition = keysOn
    .map(
      (key) =>
        `${schemaName}.${tableName}.${toSnakeCase(
          String(key),
        )} = source.${toSnakeCase(String(key))}`,
    )
    .join(" AND ");

  return `
        MERGE INTO ${schemaName}.${tableName}
        USING ${stagingTableName} AS source
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
 * Builds a pg-promise ColumnSet for bulk insert/update operations.
 * This function maps Zod schema fields to database columns using snake_case,
 * facilitating efficient SQL generation by pg-promise for batch operations.
 *
 * @template T - The Zod object schema shape describing the table structure.
 * @param pgp - The pg-promise main instance.
 * @param tableName - The logical name of the database table (e.g., 'users', 'products').
 * @param schema - The Zod schema representing the shape of the data to be persisted.
 * @returns A pg-promise ColumnSet object configured for the specified table and schema.
 */
export const buildColumnSet = <T extends z.ZodRawShape>(
  pgp: IMain,
  tableName: string,
  schema: z.ZodObject<T>,
): ColumnSet<z.infer<typeof schema>> => {
  const keys = Object.keys(schema.shape) as Array<keyof z.infer<typeof schema>>;
  const stagingTableName = `${tableName}_${config.mergeTableSuffix}`;

  const columns = keys.map((prop) => ({
    name: toSnakeCase(String(prop)),
    init: ({ source }: IColumnDescriptor<z.infer<typeof schema>>) =>
      source[prop],
  }));
  return new pgp.helpers.ColumnSet(columns, {
    table: { table: stagingTableName },
  });
};

export async function deleteTargetTable<
  T extends z.ZodRawShape,
  K extends keyof T,
>(
  t: ITask<unknown>,
  targetTable: string,
  id: string,
  columnToMatch: K,
  _schema: z.ZodObject<T>,
) {
  const columnName = toSnakeCase(String(columnToMatch));

  const deleteQuery = `
    DELETE FROM ${config.dbSchemaName}.${targetTable}
    WHERE ${columnName} = $1
  `.trim();
  await t.none(deleteQuery, [id]);
}

const toSnakeCase = (key: string): string => {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
};
