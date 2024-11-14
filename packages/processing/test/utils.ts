import { DB } from "pagopa-interop-tracing-commons";
import csvParser from "csv-parser";
import { config } from "../src/utilities/config.js";
import { DelegationSchema } from "../src/models/db.js";
import { generateId } from "pagopa-interop-tracing-models";
import { tenant_id2 } from "./costants.js";

export async function addPurpose(
  purposeValues: {
    id: string;
    consumerId: string;
    eserviceId: string;
    purposeTitle: string;
  },
  db: DB,
) {
  const insertPurposeQuery = `
      INSERT INTO ${config.dbSchemaName}.purposes (id, consumer_id, eservice_id, purpose_title)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

  return await db.one(insertPurposeQuery, Object.values(purposeValues));
}

export async function insertDelegation(delegation: DelegationSchema, db: DB) {
  const insertDelegationQuery = `
      INSERT INTO ${config.dbSchemaName}.delegations (id, delegate_id, eservice_id, state)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) 
      DO UPDATE SET 
      eservice_id = EXCLUDED.eservice_id,
      state = EXCLUDED.state
      RETURNING id
    `;

  return await db.one(insertDelegationQuery, Object.values(delegation));
}

export async function removePurpose(id: string, db: DB) {
  const insertPurposeQuery = `
      DELETE FROM ${config.dbSchemaName}.purposes WHERE id = $1
      RETURNING id
    `;
  return await db.one(insertPurposeQuery, id);
}

export async function addTenant(
  tenantValues: {
    id: string;
    name: string;
    origin: string;
    externalId: string;
    deleted: boolean;
  },
  db: DB,
) {
  const insertTenantQuery = `
      INSERT INTO ${config.dbSchemaName}.tenants (id, name, origin, external_id, deleted)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

  return await db.one(insertTenantQuery, Object.values(tenantValues));
}

export async function addEservice(
  eServiceValues: {
    eserviceId: string;
    producerId: string;
    name: string;
  },
  db: DB,
) {
  const insertEserviceQuery = `
  INSERT INTO ${config.dbSchemaName}.eservices (eservice_id, producer_id, name)
  VALUES ($1, $2, $3)
  RETURNING eservice_id`;
  await db.one(insertEserviceQuery, Object.values(eServiceValues));
}
export async function addNotAssociatedPurposeAndTenant(
  purpose: { eserviceId: string; purpose_id: string },
  db: DB,
) {
  await addPurpose(
    {
      id: purpose.purpose_id,
      consumerId: generateId(),
      eserviceId: purpose.eserviceId,
      purposeTitle: "purpose new",
    },
    db,
  );
  await addTenant(
    {
      id: tenant_id2,
      name: "tenant",
      origin: "pagoPa",
      externalId: generateId(),
      deleted: false,
    },
    db,
  );
}

export async function parseCSVFromString(
  csvString: string,
): Promise<unknown[]> {
  const parsedRecords: unknown[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = csvParser({ headers: false });
    stream
      .on("data", (row) => {
        const record = {
          tracingId: row[0],
          submitterId: row[1],
          date: row[2],
          purposeId: row[3],
          purposeName: row[4],
          status: row[5],
          requestsCount: row[6],
          eserviceId: row[7],
          consumerId: row[8],
          consumerOrigin: row[9],
          consumerName: row[10],
          consumerExternalId: row[11],
          producerId: row[12],
          producerName: row[13],
          producerOrigin: row[14],
          producerExternalId: row[15],
        };
        parsedRecords.push(record);
      })
      .on("end", () => resolve())
      .on("error", (error) => reject(error));

    stream.write(csvString);
    stream.end();
  });

  return parsedRecords;
}
