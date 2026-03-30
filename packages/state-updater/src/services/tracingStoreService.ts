import { FileManager } from "pagopa-interop-tracing-commons";
import {
  errorProcessingCopyPurposeErrors,
  errorProcessingUpdateTracingState,
} from "../model/domain/errors.js";
import { DBService } from "./db/dbService.js";
import {
  parseS3Key,
  UpdateTracingStateDto,
} from "pagopa-interop-tracing-models";

export function tracingStoreServiceBuilder(
  dbService: DBService,
  fileManager: FileManager,
) {
  return {
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
        const { tracingId, version } = parseS3Key(errorsCsvPath);
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
