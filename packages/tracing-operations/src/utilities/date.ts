import { match } from "ts-pattern";

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

export function truncatedTo(dateString: string, unit: DateUnit.DAYS): Date {
  const dateToTruncate = new Date(dateString);

  return match(unit)
    .with(DateUnit.DAYS, () => new Date(dateToTruncate.setUTCHours(0, 0, 0)))
    .exhaustive();
}
