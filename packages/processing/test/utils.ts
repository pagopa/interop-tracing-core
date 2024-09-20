import { DB } from "pagopa-interop-tracing-commons";
import csvParser from "csv-parser";

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
  INSERT INTO tracing.eservices (eservice_id, producer_id, name)
  VALUES ($1, $2, $3)
  RETURNING eservice_id`;
  await db.one(insertEserviceQuery, Object.values(eServiceValues));
}
export async function removeAndInsertWrongEserviceAndPurpose(
  eservice_id: string,
  purpose: { eserviceId: string; purpose_id: string },
  tenantId: string,
  purposeId: string,
  db: DB,
) {
  await removePurpose(purposeId, db);
  await addPurpose(
    {
      id: purpose.purpose_id,
      consumerId: tenantId,
      eserviceId: purpose.eserviceId,
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
