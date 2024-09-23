import { ZodiosInstance } from "@zodios/core";
import {
  Api,
  ApiSaveEserviceHeaders,
  ApiSaveEservicePayload,
  ApiSaveEserviceResponse,
  ApiDeleteEserviceHeaders,
  ApiDeleteEserviceParams,
  ApiDeleteEserviceResponse,
} from "pagopa-interop-tracing-operations-client";
import {
  errorSaveEservice,
  errorDeleteEservice,
} from "../models/domain/errors.js";
import { Logger } from "pagopa-interop-tracing-commons";

export const operationsServiceBuilder = (
  operationsApiClient: ZodiosInstance<Api>,
) => {
  return {
    async saveEservice(
      headers: ApiSaveEserviceHeaders,
      data: ApiSaveEservicePayload,
      logger: Logger,
    ): Promise<ApiSaveEserviceResponse> {
      try {
        await operationsApiClient.saveEservice(
          {
            eserviceId: data.eserviceId,
            producerId: data.producerId,
            name: data.name,
          },
          {
            headers,
          },
        );

        logger.info(
          `eService saved with eserviceId: ${data.eserviceId}, tenantId: ${data.producerId}.`,
        );
      } catch (error: unknown) {
        throw errorSaveEservice(
          `Error saving eService: ${data.eserviceId}, tenantId: ${data.producerId}. Details: ${error}`,
        );
      }
    },
    async deleteEservice(
      headers: ApiDeleteEserviceHeaders,
      params: ApiDeleteEserviceParams,
      logger: Logger,
    ): Promise<ApiDeleteEserviceResponse> {
      try {
        await operationsApiClient.deleteEservice(undefined, {
          headers,
          params,
        });

        logger.info(`eService deleted with eserviceId: ${params.eserviceId}.`);
      } catch (error: unknown) {
        throw errorDeleteEservice(
          `Error deleting eService: ${params.eserviceId}. Details: ${error}`,
        );
      }
    },
  };
};

export type OperationsService = ReturnType<typeof operationsServiceBuilder>;
