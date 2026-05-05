import {
  PurposeErrorCodes,
  isWarningErrorCode,
} from "pagopa-interop-tracing-commons";
import {
  TracingFromS3KeyPathDto,
  PurposeErrorRow,
  purposeErrorSeverity,
  generateId,
} from "pagopa-interop-tracing-models";
import { match } from "ts-pattern";
import { ZodIssue } from "zod";
import { TracingRecordSchema } from "../models/db.js";

function buildDuplicateMap(
  records: TracingRecordSchema[],
): Record<string, number[]> {
  return records.reduce(
    (acc, record) => {
      const key = `${record.purpose_id}#${record.status}#${record.token_id}`;
      acc[key] = acc[key] || [];
      acc[key].push(record.rowNumber);
      return acc;
    },
    {} as Record<string, number[]>,
  );
}

const formatDuplicateRecords = (records: number[]): string => {
  const count = records.length;
  if (count > 10) {
    const displayed = records.slice(0, 10).join(",");
    const remaining = count - 10;
    return `${displayed} ... and ${remaining} more`;
  }
  return records.join(",");
};

export async function checkRecords(
  records: TracingRecordSchema[],
  tracing: TracingFromS3KeyPathDto,
): Promise<PurposeErrorRow[]> {
  const errorsRecord: PurposeErrorRow[] = [];
  const duplicateMap = buildDuplicateMap(records);
  for (const record of records) {
    const result = TracingRecordSchema.safeParse(record);
    if (result.error) {
      for (const issue of result.error.issues) {
        const parsedError = parseErrorMessage(issue);
        errorsRecord.push({
          id: generateId(),
          tracingId: tracing.tracingId,
          version: tracing.version,
          severity: isWarningErrorCode(parsedError.errorCode)
            ? purposeErrorSeverity.warning
            : purposeErrorSeverity.invalid,
          errorCode: parsedError.errorCode,
          purposeId: record.purpose_id,
          message: parsedError.message,
          rowNumber: record.rowNumber,
        });
      }
    }

    if (record.date !== tracing.date) {
      errorsRecord.push({
        id: generateId(),
        tracingId: tracing.tracingId,
        version: tracing.version,
        severity: isWarningErrorCode(PurposeErrorCodes.INVALID_DATE)
          ? purposeErrorSeverity.warning
          : purposeErrorSeverity.invalid,
        errorCode: PurposeErrorCodes.INVALID_DATE,
        purposeId: record.purpose_id,
        message: `date: Date field (${record.date}) in csv is different from tracing date (${tracing.date}).`,
        rowNumber: record.rowNumber,
      });
    }

    const key = `${record.purpose_id}#${record.status}#${record.token_id}`;
    const duplicateRecords = duplicateMap[key];
    if (duplicateRecords && duplicateRecords.length > 1) {
      errorsRecord.push({
        id: generateId(),
        tracingId: tracing.tracingId,
        version: tracing.version,
        purposeId: record.purpose_id,
        severity: isWarningErrorCode(
          PurposeErrorCodes.PURPOSE_AND_STATUS_AND_TOKEN_NOT_UNIQUE,
        )
          ? purposeErrorSeverity.warning
          : purposeErrorSeverity.invalid,
        errorCode: PurposeErrorCodes.PURPOSE_AND_STATUS_AND_TOKEN_NOT_UNIQUE,
        message: `Duplicate status found. The current row number ${
          record.rowNumber
        } with status ${record.status} and token_id ${
          record.token_id
        } has already been declared at rows: ${formatDuplicateRecords(
          duplicateRecords,
        )}.`,
        rowNumber: record.rowNumber,
      });
    }
  }
  return errorsRecord;
}

function parseErrorMessage(issue: ZodIssue) {
  const errorCode = match(issue.path[0])
    .with("status", () => PurposeErrorCodes.INVALID_STATUS_CODE)
    .with("purpose_id", () => PurposeErrorCodes.INVALID_PURPOSE)
    .with("token_id", () => PurposeErrorCodes.INVALID_TOKEN)
    .with("date", () => PurposeErrorCodes.INVALID_DATE)
    .with("requests_count", () => PurposeErrorCodes.INVALID_REQUEST_COUNT)
    .otherwise(() => PurposeErrorCodes.INVALID_ROW_SCHEMA);

  return { message: `${issue.path[0]}: ${issue.message}`, errorCode };
}
