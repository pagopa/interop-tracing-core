import express, { Router } from "express";
import {
  DelegationEventTypeV2,
  getDelegationEventV2ByType,
} from "../delegations/delegationsV2.js";
import { produceDelegationEvent } from "../delegations/index.js";
import { producer } from "../index.js";
import { genericLogger } from "pagopa-interop-tracing-commons";

const delegationRouter: Router = express.Router();

delegationRouter.get("/V2/:typeId", async (req, res, next) => {
  const { typeId } = req.params;
  const typeEvent = DelegationEventTypeV2.safeParse(typeId);

  if (!typeEvent.success) {
    res.status(400).send("Invalid typeId");
    next();

    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const delegationEvent = getDelegationEventV2ByType(typeEvent.data!);
  const message = produceDelegationEvent(delegationEvent);

  await producer.send({
    topic: "delegation",
    messages: [{ value: message }],
  });

  genericLogger.info(`DELEGATION EVENT V2 Message: ${message}`);

  res.send(delegationEvent);
});

delegationRouter.post("/", async (req, res) => {
  const delegationEvent = req.body;

  const message = produceDelegationEvent(delegationEvent);
  genericLogger.info(`DELEGATION EVENT V2 Message: ${message}`);
  await producer.send({
    topic: "delegation",
    messages: [{ value: message }],
  });

  res.send(delegationEvent);
});

export default delegationRouter;
