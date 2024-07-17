import z from "zod";

export const tracingState = {
  pending: "PENDING",
  missing: "MISSING",
  error: "ERROR",
  completed: "COMPLETED",
} as const;
export const TracingState = z.enum([
  Object.values(tracingState)[0],
  ...Object.values(tracingState).slice(1),
]);
export type TracingState = z.infer<typeof TracingState>;

export const RequesterPurposeIdHeader = z.object({
  "x-requester-purpose-id": z.string(),
});
export type RequesterPurposeIdHeader = z.infer<typeof RequesterPurposeIdHeader>;

export const CorrelationIdHeader = z.object({
  "x-correlation-id": z.string(),
});
export type CorrelationIdHeader = z.infer<typeof CorrelationIdHeader>;

export const correlationIdToHeader = (
  correlationId: string,
): CorrelationIdHeader => ({
  "x-correlation-id": correlationId,
});

export const purposeIdToHeader = (
  purposeId: string,
): RequesterPurposeIdHeader => ({
  "x-requester-purpose-id": purposeId,
});
