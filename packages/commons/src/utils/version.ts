import { DB } from "../repositories/db.js";

export const shouldProcessVersion = (
  currentVersion: number | null | undefined,
  incomingVersion: number,
): boolean => currentVersion == null || currentVersion <= incomingVersion;

export type VersionLookupParams = {
  schema: string;
  table: string;
  versionColumn: string;
  filterColumn: string;
  filterValue: string | number;
};

/**
 * @async
 * @function getVersionByFilter
 * Read the current version from the DB using a generic schema/table/filter.
 * @param {DB} db - pg-promise database instance
 * @param {VersionLookupParams} params - lookup parameters (schema/table/columns/filter)
 * @returns {Promise<number | null>} - The current version or null if not found
 * @example
 * const currentVersion = await getVersionByFilter(db, {
 *   schema: "tracing_store",
 *   table: "tracings",
 *   versionColumn: "version",
 *   filterColumn: "id",
 *   filterValue: tracingId,
 * });
 */
export const getVersionByFilter = async (
  db: DB,
  {
    schema,
    table,
    versionColumn,
    filterColumn,
    filterValue,
  }: VersionLookupParams,
): Promise<number | null> => {
  const row = await db.oneOrNone<{ version: number }>(
    "SELECT $1:name AS version FROM $2:name.$3:name WHERE $4:name = $5",
    [versionColumn, schema, table, filterColumn, filterValue],
  );

  return row?.version ?? null;
};

/**
 * @async
 * @function checkVersionByFilter
 * Check if the incoming version should be processed by comparing it with the
 * current version in the DB.
 * @param {DB} db - pg-promise database instance
 * @param {VersionLookupParams} params - lookup parameters (schema/table/columns/filter)
 * @param {number} incomingVersion - incoming message/version number
 * @returns {Promise<boolean>} - true if the incoming version is not older
 * @example
 * const shouldProcess = await checkVersionByFilter(
 *   db,
 *   {
 *     schema: "tracing_store",
 *     table: "tracings",
 *     versionColumn: "version",
 *     filterColumn: "id",
 *     filterValue: tracingId,
 *   },
 *   incomingVersion,
 * );
 */
export const checkVersionByFilter = async (
  db: DB,
  params: VersionLookupParams,
  incomingVersion: number,
): Promise<boolean> => {
  const currentVersion = await getVersionByFilter(db, params);
  return shouldProcessVersion(currentVersion, incomingVersion);
};
