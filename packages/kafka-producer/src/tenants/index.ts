import {
  TenantEvent,
  encodeOutboundTenantEvent,
} from "@pagopa/interop-outbound-models";

export function produceTenantEvent(tenantEvent: TenantEvent): string {
  return encodeOutboundTenantEvent(tenantEvent);
}
