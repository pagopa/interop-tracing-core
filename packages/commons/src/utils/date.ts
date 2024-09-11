import { z } from "zod";
import { match } from "ts-pattern";

export const ISODateFormat = z
  .string()
  .transform((value) => value.split("T")[0]);
export type ISODateFormat = z.infer<typeof ISODateFormat>;

export enum TimeFormat {
  YY_MM_DD = "yyyy-MM-dd",
}

export enum DateUnit {
  MILLIS = "MILLIS",
  SECONDS = "SECONDS",
  MINUTES = "MINUTES",
  HOURS = "HOURS",
  DAYS = "DAYS",
  WEEKS = "WEEKS",
  MONTHS = "MONTHS",
  YEARS = "YEARS",
}

export function changeDateFormat(date: Date, format: TimeFormat): string {
  const { year, month, day } = getDateComponents(date);

  return match(format)
    .with(TimeFormat.YY_MM_DD, () => `${year}-${month}-${day}`)
    .exhaustive();
}

function getDateComponents(date: Date): {
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds: string;
  milliseconds: string;
} {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds())
    .padStart(3, "0")
    .padEnd(9, "0");

  return { year, month, day, hours, minutes, seconds, milliseconds };
}

export function truncatedTo(date: Date, unit: DateUnit.DAYS): Date {
  return match(unit)
    .with(DateUnit.DAYS, () => new Date(date.setUTCHours(0, 0, 0)))
    .exhaustive();
}
