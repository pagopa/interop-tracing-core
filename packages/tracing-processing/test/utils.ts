import { generateId } from "pagopa-interop-tracing-models";
import { DB } from "pagopa-interop-tracing-commons";
import csvParser from "csv-parser";
import { Eservice } from "../src/models/csv.js";

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
      INSERT INTO tracing.purposes (id, consumer_id, eservice_id, purpose_title)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

  return await db.one(insertPurposeQuery, Object.values(purposeValues));
}
export async function removePurpose(id: string, db: DB) {
  const insertPurposeQuery = `
      DELETE FROM tracing.purposes WHERE id = $1
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
      INSERT INTO tracing.tenants (id, name, origin, external_id, deleted)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

  return await db.one(insertTenantQuery, Object.values(tenantValues));
}

export async function addEservice(
  eServiceValues: {
    eserviceId: string;
    producerId: string;
  },
  db: DB,
) {
  const insertEserviceQuery = `
  INSERT INTO tracing.eservices (eservice_id, producer_id)
  VALUES ($1, $2)
  RETURNING eservice_id`;
  await db.one(insertEserviceQuery, Object.values(eServiceValues));
}
export async function removeAndInsertWrongEserviceAndPurpose(
  eservice_id: string,
  purpose: { eservice: Eservice; purpose_id: string },
  purposeId: string,
  db: DB,
) {
  await addEservice(
    {
      eserviceId: purpose.eservice.eserviceId,
      producerId: generateId(),
    },
    db,
  );
  await removePurpose(purposeId, db);
  await addPurpose(
    {
      id: purpose.purpose_id,
      consumerId: generateId(),
      eserviceId: purpose.eservice.eserviceId,
      purposeTitle: "NOT ASSOCIATED",
    },
    db,
  );
  const deleteEserviceQuery = `
  DELETE FROM tracing.eservices WHERE eservice_id = $1 RETURNING eservice_id`;
  await db.one(deleteEserviceQuery, eservice_id);
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
          submitterId: row[0],
          date: row[1],
          purposeId: row[2],
          purposeName: row[3],
          status: row[4],
          requestsCount: row[5],
          eserviceId: row[6],
          consumerId: row[7],
          consumerOrigin: row[8],
          consumerName: row[9],
          consumerExternalId: row[10],
          producerId: row[11],
          producerName: row[12],
          producerOrigin: row[13],
          producerExternalId: row[14],
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
