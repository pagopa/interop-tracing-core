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

export const checkVersionByFilter = async (
  db: DB,
  params: VersionLookupParams,
  incomingVersion: number,
): Promise<boolean> => {
  const currentVersion = await getVersionByFilter(db, params);
  return shouldProcessVersion(currentVersion, incomingVersion);
};
