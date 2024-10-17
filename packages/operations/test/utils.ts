import { DB, DateUnit, truncatedTo } from "pagopa-interop-tracing-commons";
import {
  Eservice,
  Purpose,
  PurposeError,
  Tenant,
  Tracing,
} from "../src/model/domain/db.js";
import { config } from "../src/utilities/config.js";

export async function addPurpose(purposeValues: Purpose, db: DB) {
  const insertPurposeQuery = `
      INSERT INTO ${config.dbSchemaName}.purposes (id, consumer_id, eservice_id, purpose_title)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

  return await db.one(insertPurposeQuery, Object.values(purposeValues));
}

export async function addTenant(tenantValues: Tenant, db: DB) {
  const insertTenantQuery = `
      INSERT INTO ${config.dbSchemaName}.tenants (id, name, origin, external_id, deleted)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

  return await db.one(insertTenantQuery, Object.values(tenantValues));
}

export async function findTenantById(
  id: string,
  db: DB,
): Promise<Tenant | null> {
  const selectTenantQuery = `
      SELECT * 
      FROM ${config.dbSchemaName}.tenants
      WHERE id = $1
    `;

  return await db.oneOrNone(selectTenantQuery, [id]);
}

export async function addPurposeError(
  purposeErrorValues: PurposeError,
  db: DB,
): Promise<{ id: string }> {
  const insertPurposeErrorQuery = `
      INSERT INTO ${config.dbSchemaName}.purposes_errors (id, tracing_id, version, purpose_id, error_code, message, row_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

  return await db.one(
    insertPurposeErrorQuery,
    Object.values(purposeErrorValues),
  );
}

export async function addTracing(
  tracingValues: Tracing,
  db: DB,
): Promise<Tracing> {
  const truncatedDate: Date = truncatedTo(
    new Date(tracingValues.date),
    DateUnit.DAYS,
  );
  const insertTracingQuery = `
      INSERT INTO ${config.dbSchemaName}.tracings (id, tenant_id, state, date, version, errors)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, date, version, tenant_id, state, errors
    `;

  return await db.one(insertTracingQuery, [
    tracingValues.id,
    tracingValues.tenant_id,
    tracingValues.state,
    truncatedDate,
    tracingValues.version,
    tracingValues.errors,
  ]);
}

export async function findTracingById(id: string, db: DB): Promise<Tracing> {
  const selectTracingQuery = `
      SELECT * 
      FROM ${config.dbSchemaName}.tracings
      WHERE id = $1
    `;

  return await db.one(selectTracingQuery, [id]);
}

export async function findPurposeErrors(db: DB): Promise<PurposeError[]> {
  const selectPurposeErrorQuery = `
      SELECT * 
      FROM ${config.dbSchemaName}.purposes_errors
    `;

  return await db.any<PurposeError>(selectPurposeErrorQuery);
}

export async function findPurposeById(
  id: string,
  db: DB,
): Promise<Purpose | null> {
  const selectPurposeQuery = `
      SELECT * 
      FROM ${config.dbSchemaName}.purposes 
      WHERE id = $1
    `;

  return await db.oneOrNone<Purpose | null>(selectPurposeQuery, [id]);
}

export async function addEservice(
  eServiceValues: { eservice_id: string; producer_id: string; name: string },
  db: DB,
) {
  const insertEserviceQuery = `
  INSERT INTO ${config.dbSchemaName}.eservices (eservice_id, producer_id, name)
  VALUES ($1, $2, $3)
  RETURNING eservice_id`;
  await db.one(insertEserviceQuery, Object.values(eServiceValues));
}

export async function findEserviceById(
  id: string,
  db: DB,
): Promise<Eservice | null> {
  const selectEserviceQuery = `
      SELECT * 
      FROM ${config.dbSchemaName}.eservices
      WHERE eservice_id = $1
    `;

  return await db.oneOrNone(selectEserviceQuery, [id]);
}

export async function clearTracings(db: DB) {
  const deleteTracingsQuery = `
    TRUNCATE TABLE ${config.dbSchemaName}.tracings CASCADE;
  `;
  await db.any(deleteTracingsQuery);
}

export async function clearPurposesErrors(db: DB) {
  const deletePurposesErrorsQuery = `
    TRUNCATE TABLE ${config.dbSchemaName}.purposes_errors CASCADE;
  `;
  await db.any(deletePurposesErrorsQuery);
}
