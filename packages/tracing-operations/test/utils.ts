import { DB } from "pagopa-interop-tracing-commons";
import {
  Purpose,
  PurposeError,
  Tenant,
  Tracing,
} from "../src/model/domain/db.js";
import { DateUnit, truncatedTo } from "../src/utilities/date.js";

export async function addPurpose(purposeValues: Purpose, db: DB) {
  const insertPurposeQuery = `
      INSERT INTO tracing.purposes (id, consumer_id, eservice_id, purpose_title)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

  return await db.one(insertPurposeQuery, Object.values(purposeValues));
}

export async function addTenant(tenantValues: Tenant, db: DB) {
  const insertTenantQuery = `
      INSERT INTO tracing.tenants (id, name, origin, external_id, deleted)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

  return await db.one(insertTenantQuery, Object.values(tenantValues));
}

export async function addPurposeError(
  purposeErrorValues: PurposeError,
  db: DB,
) {
  const insertPurposeErrorQuery = `
      INSERT INTO tracing.purpose_errors (id, tracing_id, version, purpose_id, error_code, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

  await db.one(insertPurposeErrorQuery, Object.values(purposeErrorValues));
}

export async function addTracing(
  tracingValues: Tracing,
  db: DB,
): Promise<{ id: string }> {
  const truncatedDate: Date = truncatedTo(
    new Date(tracingValues.date).toISOString(),
    DateUnit.DAYS,
  );
  const insertTracingQuery = `
      INSERT INTO tracing.tracings (id, tenant_id, state, date, version, errors)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
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
      FROM tracing.tracings
      WHERE id = $1
    `;

  return await db.one(selectTracingQuery, [id]);
}

export async function findPurposeErrorById(
  id: string,
  db: DB,
): Promise<PurposeError> {
  const selectPurposeErrorQuery = `
      SELECT * 
      FROM tracing.purposes_errors
      WHERE id = $1
    `;

  return await db.one(selectPurposeErrorQuery, [id]);
}

export async function addEservice(
  eServiceValues: { eservice_id: string; producer_id: string },
  db: DB,
) {
  const insertEserviceQuery = `
  INSERT INTO tracing.eservices (eservice_id, producer_id)
  VALUES ($1, $2)
  RETURNING eservice_id`;
  await db.one(insertEserviceQuery, Object.values(eServiceValues));
}

export async function clearTracings(db: DB) {
  const deleteTracingsQuery = `
    TRUNCATE TABLE tracing.tracings CASCADE;
  `;
  await db.any(deleteTracingsQuery);
}

export async function clearPurposesErrors(db: DB) {
  const deletePurposesErrorsQuery = `
    TRUNCATE TABLE tracing.purposes_errors CASCADE;
  `;
  await db.any(deletePurposesErrorsQuery);
}
