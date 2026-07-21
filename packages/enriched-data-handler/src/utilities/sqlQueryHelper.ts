import type { ColumnSet, IColumnDescriptor, IMain, ITask } from "pg-promise";
import type { z } from "zod";

import { config } from "./config.js";

/**
 * Generates an INSERT query that inserts new records from a staging table
 * into the target table.
 *
 * @param tableSchema - A Zod object schema refering to the table model from which to extract the list of keys.
 * @param schemaName - The target db schema name.
 * @param tableName - The staging and target table name.
 */
export function generateMergeQuery<T extends z.ZodRawShape>(
  tableSchema: z.ZodObject<T>,
  schemaName: string,
  tableName: string,
): string {
  const keys = Object.keys(tableSchema.shape);

  const stagingTableName = `${tableName}_${config.mergeTableSuffix}`;
  const targetTableName = `${schemaName}.${tableName}`;

  const columnList = keys.map((k) => toSnakeCase(String(k))).join(", ");

  return `
    INSERT INTO ${targetTableName} (${columnList})
    SELECT ${keys.map((k) => `s.${toSnakeCase(String(k))}`).join(", ")}
    FROM ${stagingTableName} s;
`;
}

/**
 * Builds a Redshift `COPY ... FROM 's3://' IAM_ROLE '...'` statement that loads the
 * enriched CSV directly from S3 into the staging table.
 *
 * `csvColumnOrder` is the physical column order of the CSV (single source of truth:
 * `enrichedCsvColumnOrder` in pagopa-interop-tracing-models). COPY maps fields
 * positionally, so the column-list order must equal the CSV field order — which it does
 * by construction, since both come from the same array. `created_at` is intentionally
 * omitted and relies on the table DEFAULT.
 *
 * TODO: validate names/types against the authoritative Redshift `traces` Flyway
 * migration (deployment repo).
 * TODO: `TIMEFORMAT 'auto'` assumes the CSV `date` value is parseable by Redshift
 * — confirm the emitted format in dev.
 * TODO: MAXERROR 0 = fail on first bad row. Decide reject tolerance and how to
 * surface rejected rows (query STL_LOAD_ERRORS on failure) with infra.
 *
 * @param csvColumnOrder - Ordered CSV column keys; snake_cased into the COPY column list.
 * @param tableName - The staging/target table base name.
 * @param s3Uri - Full s3://bucket/key of the enriched CSV.
 * @param iamRoleArn - IAM role ARN authorized to read the bucket from Redshift.
 */
export function generateCopyFromS3Query(
  csvColumnOrder: readonly string[],
  tableName: string,
  s3Uri: string,
  iamRoleArn: string,
): string {
  const stagingTableName = `${tableName}_${config.mergeTableSuffix}`;
  const columnList = csvColumnOrder.map((k) => toSnakeCase(k)).join(", ");

  return `
    COPY ${stagingTableName} (${columnList})
    FROM '${s3Uri}'
    IAM_ROLE '${iamRoleArn}'
    CSV
    IGNOREHEADER 1
    TIMEFORMAT 'auto'
    BLANKSASNULL
    EMPTYASNULL
    MAXERROR 0;
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
    DELETE FROM ${config.analyticsDbSchemaName}.${targetTable}
    WHERE ${columnName} = $1
  `.trim();
  await t.none(deleteQuery, [id]);
}

const toSnakeCase = (key: string): string => {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
};
