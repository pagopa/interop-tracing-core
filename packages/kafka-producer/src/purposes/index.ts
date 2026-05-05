import {
  PurposeEvent,
  encodeOutboundPurposeEvent,
} from "@pagopa/interop-outbound-models";

export function producePurposeEvent(purposeEvent: PurposeEvent): string {
  return encodeOutboundPurposeEvent(purposeEvent);
}
