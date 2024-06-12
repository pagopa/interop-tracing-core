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

export const OperationsHeaders = z.object({
  "X-Correlation-Id": z.string(),
  "X-Requester-Purpose-Id": z.string(),
});
export type OperationsHeaders = z.infer<typeof OperationsHeaders>;
