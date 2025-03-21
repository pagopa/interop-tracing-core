import { sqsMessageNotValid } from "pagopa-interop-tracing-models";
import { Message } from "./sqs.js";
import { genericLogger } from "../index.js";

type WhitelistedEvent = "ObjectCreated";

const validEvents: WhitelistedEvent[] = ["ObjectCreated"];

type EventValidation = "ValidEvent" | "InvalidEvent";

export const validateSqsMessage = (message: Message): EventValidation => {
  if (!message.Body) {
    throw new Error("Message body is undefined");
  }

  try {
    const body = JSON.parse(message.Body);

    if (body.Event === "s3:TestEvent") {
      genericLogger.info(`s3:TestEvent detected`);
      return "InvalidEvent";
    }

    if (Array.isArray(body.Records)) {
      const record = body.Records[0];
      const eventName = record?.eventName;

      if (eventName && validEvents.includes(eventName)) {
        return "ValidEvent";
      } else {
        genericLogger.warn(`Skipping event - ${eventName}`);
      }
    }
    return "InvalidEvent";
  } catch (error) {
    throw sqsMessageNotValid(`${error}`);
  }
};
