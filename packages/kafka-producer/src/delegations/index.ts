import {
  DelegationEvent,
  encodeOutboundDelegationEvent,
} from "@pagopa/interop-outbound-models";

export function produceDelegationEvent(
  delegationEvent: DelegationEvent,
): string {
  return encodeOutboundDelegationEvent(delegationEvent);
}
