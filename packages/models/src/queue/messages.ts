import { z } from "zod";
import { tracingState, TracingState } from "../tracing/tracing.js";

export const UpdateTracingStateDto = z.object({
  tracingId: z.string().uuid(),
  state: TracingState,
  version: z.coerce.number(),
});
export type UpdateTracingStateDto = z.infer<typeof UpdateTracingStateDto>;

export const UpdateTracingStateCompletedDto = UpdateTracingStateDto.extend({
  state: z.literal(tracingState.completed),
});

export const UpdateTracingStateWithErrorsCsvDto = UpdateTracingStateDto.extend({
  state: z.literal(tracingState.error),
  errorsCsvPath: z.string(),
});

export const UpdateTracingStateWithWarningDto = UpdateTracingStateDto.extend({
  state: z.literal(tracingState.warning),
  errorsCsvPath: z.string(),
});

export const ProcessingResultDto = z.union([
  UpdateTracingStateCompletedDto,
  UpdateTracingStateWithErrorsCsvDto,
  UpdateTracingStateWithWarningDto,
]);
export type ProcessingResultDto = z.infer<typeof ProcessingResultDto>;

export const TracingFromS3KeyPathDto = z.object({
  tenantId: z.string(),
  date: z.string(),
  version: z.coerce.number(),
  correlationId: z.string(),
  tracingId: z.string(),
});
export type TracingFromS3KeyPathDto = z.infer<typeof TracingFromS3KeyPathDto>;

export const TracingCorrelationIdDto = z.object({
  correlationId: z.string().uuid(),
});
export type TracingCorrelationIdDto = z.infer<typeof TracingCorrelationIdDto>;
