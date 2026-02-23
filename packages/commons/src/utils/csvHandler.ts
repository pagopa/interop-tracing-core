import csv from "csv-parser";
import { Readable } from "stream";

export async function parseCSV<T>(
  stream: Readable,
  onChunk: (rows: T[], stopProcessing: () => void) => Promise<void>,
): Promise<void> {
  const CHUNK_SIZE = 5000;
  let chunk: T[] = [];
  let isProcessStopped = false;

  const parser = stream.pipe(csv());

  const stopProcessing = () => {
    isProcessStopped = true;
    parser.destroy();
  };

  try {
    for await (const row of parser) {
      if (isProcessStopped) break;

      chunk.push(row);

      if (chunk.length >= CHUNK_SIZE) {
        await onChunk(chunk, stopProcessing);
        chunk = [];
      }
    }

    if (!isProcessStopped && chunk.length > 0) {
      await onChunk(chunk, stopProcessing);
    }
  } catch (err) {
    parser.destroy();
    throw err;
  }
}
