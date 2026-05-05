import {
  DB,
  FileManager,
  checkVersionByFilter,
  TracingStoreTables,
} from "pagopa-interop-tracing-commons";
import {
  errorProcessingCopyPurposeErrors,
  errorProcessingUpdateTracingState,
} from "../model/domain/errors.js";
import { DBService } from "./db/dbService.js";
import {
  parseTracingS3Key,
  UpdateTracingStateDto,
} from "pagopa-interop-tracing-models";
import { config } from "../utilities/config.js";

export function tracingStoreServiceBuilder(
  db: DB,
  dbService: DBService,
  fileManager: FileManager,
) {
  return {
    async checkTracingVersion(
      tracingId: string,
      incomingVersion: number,
    ): Promise<boolean> {
      try {
        return await checkVersionByFilter(
          db,
          {
            schema: config.dbSchemaName,
            table: TracingStoreTables.tracings,
            versionColumn: "version",
            filterColumn: "id",
            filterValue: tracingId,
          },
          incomingVersion,
        );
      } catch (error: unknown) {
        throw errorProcessingUpdateTracingState(
          `Error checking tracing version for tracingId: ${tracingId}, version: ${incomingVersion}. Details: ${error}`,
        );
      }
    },

    async updateTracingState(data: UpdateTracingStateDto): Promise<void> {
      try {
        await dbService.updateTracingState(data);
      } catch (error: unknown) {
        throw errorProcessingUpdateTracingState(
          `Error updating tracingId: ${data.tracingId}, version: ${data.version}. Details: ${error}`,
        );
      }
    },

    async copyPurposeErrorsFromS3(errorsCsvPath: string): Promise<void> {
      try {
        const { tracingId, version } = parseTracingS3Key(errorsCsvPath);
        const s3Stream = await fileManager.readObject(errorsCsvPath);
        await dbService.copyPurposeErrorsFromStream(
          s3Stream,
          tracingId,
          version,
        );
      } catch (error: unknown) {
        throw errorProcessingCopyPurposeErrors(
          `Error copying purpose errors from S3 path: ${errorsCsvPath}. Details: ${error}`,
        );
      }
    },
  };
}

export type TracingStoreService = ReturnType<typeof tracingStoreServiceBuilder>;
