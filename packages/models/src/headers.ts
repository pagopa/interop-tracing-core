import { z } from "zod";

export const OrganizationIdHeader = z.object({
  "x-organization-id": z.string(),
});
export type OrganizationIdHeader = z.infer<typeof OrganizationIdHeader>;

export const CorrelationIdHeader = z.object({
  "x-correlation-id": z.string(),
});
export type CorrelationIdHeader = z.infer<typeof CorrelationIdHeader>;

export const correlationIdToHeader = (
  correlationId: string,
): CorrelationIdHeader => ({
  "x-correlation-id": correlationId,
});

export const organizationIdToHeader = (
  organizationId: string,
): OrganizationIdHeader => ({
  "x-organization-id": organizationId,
});
