import csv from "csv-parser";
import { Readable } from "stream";
import { TracingEnriched } from "../models/messages.js";

export async function parseCSV(stream: Readable): Promise<TracingEnriched[]> {
  const results: TracingEnriched[] = [];
  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}
