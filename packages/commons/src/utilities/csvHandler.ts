import csv from "csv-parser";
import { Readable } from "stream";

export async function parseCSV<T>(stream: Readable): Promise<T[]> {
  const results: T[] = [];
  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data: T) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

export function generateCSV<T>(
  records: T[],
  headers: (keyof T)[],
  extraFields: { [key: string]: string } = {},
): string {
  const headerRow = headers.join(",");

  const rows = records
    .map((record) => {
      return headers
        .map((header) => {
          const field = record[header];
          return field === null || field === undefined ? "" : field.toString();
        })
        .concat(Object.values(extraFields))
        .join(",");
    })
    .join("\n");

  return `${headerRow}\n${rows}`;
}
