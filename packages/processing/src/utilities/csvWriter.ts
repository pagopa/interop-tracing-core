import { PassThrough, Readable } from "stream";

type ColumnValue = string | number | boolean | Date | null | undefined;
export type CsvMapping<T> = Record<string, (record: T) => ColumnValue>;

export class CsvWriter<T> {
  private readonly csvStream = new PassThrough();
  private recordsCount = 0;
  private readonly columns: string[];

  constructor(private readonly mapping: CsvMapping<T>) {
    this.columns = Object.keys(mapping);
    this.csvStream.write(this.columns.join(",") + "\n");
  }

  writeBatch(records: T[]): void {
    for (const record of records) {
      const row = this.columns
        .map((col) => formatValue(this.mapping[col](record)))
        .join(",");

      this.csvStream.write(row + "\n");
      this.recordsCount++;
    }
  }

  hasRecords(): boolean {
    return this.recordsCount > 0;
  }

  getStream(): Readable {
    return this.csvStream;
  }

  close(): void {
    this.csvStream.end();
  }
}

function formatValue(value: ColumnValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();

  const text = String(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}
