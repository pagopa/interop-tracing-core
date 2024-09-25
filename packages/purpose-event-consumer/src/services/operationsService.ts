import { ZodiosInstance } from "@zodios/core";
import {
  Api,
  ApiSavePurposeHeaders,
  ApiSavePurposePayload,
  ApiSavePurposeResponse,
} from "pagopa-interop-tracing-operations-client";
import { Logger } from "pagopa-interop-tracing-commons";
import { errorSavePurpose } from "../models/domain/errors.js";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => {
  return {
    async savePurpose(
      headers: ApiSavePurposeHeaders,
      data: ApiSavePurposePayload,
      logger: Logger,
    ): Promise<ApiSavePurposeResponse> {
      try {
        await operationsApiClient.savePurpose(
          {
            id: data.id,
            consumer_id: data.consumer_id,
            eservice_id: data.eservice_id,
            purpose_title: data.purpose_title,
          },
          {
            headers,
          },
        );

        logger.info(`purpose saved with purposeId: ${data.id}.`);
      } catch (error: unknown) {
        throw errorSavePurpose(
          `Error saving purpose: ${data.id}, Details: ${error}`,
        );
      }
    },
  };
};

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
