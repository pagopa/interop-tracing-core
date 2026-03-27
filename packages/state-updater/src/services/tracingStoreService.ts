import { FileManager } from "pagopa-interop-tracing-commons";
import { errorProcessingSavePurposeError } from "../model/domain/errors.js";
import { DBService } from "./db/dbService.js";
import { UpdateTracingStateDto } from "pagopa-interop-tracing-models";

export function tracingStoreServiceBuilder(
  dbService: DBService,
  fileManager: FileManager,
) {
  return {
    async updateTracingState(data: UpdateTracingStateDto): Promise<void> {
      await dbService.updateTracingState(data);
    },

    async copyPurposeErrorsFromS3(errorsCsvPath: string): Promise<void> {
      try {
        const s3Stream = await fileManager.readObject(errorsCsvPath);
        await dbService.copyPurposeErrorsFromStream(s3Stream);
      } catch (error: unknown) {
        throw errorProcessingSavePurposeError(
          `Error copying purpose errors from S3 path: ${errorsCsvPath}. Details: ${error}`,
        );
      }
    },
  };
}

export type TracingStoreService = ReturnType<typeof tracingStoreServiceBuilder>;
