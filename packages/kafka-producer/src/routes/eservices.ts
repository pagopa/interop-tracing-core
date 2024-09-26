import express, { Router } from "express";
import {
  EserviceEventTypeV1,
  getEserviceEventV1ByType,
} from "../eservices/eServiceV1.js";
import { produceEserviceEvent } from "../eservices/index.js";
import { producer } from "../index.js";
import { EServiceEvent } from "@pagopa/interop-outbound-models";
import {
  getEserviceEventV2ByType,
  EserviceEventTypeV2,
} from "../eservices/eServiceV2.js";

const eServiceRouter: Router = express.Router();

eServiceRouter.get("/V1/:typeId", async (req, res, next) => {
  const { typeId } = req.params;
  const typeEvent = EserviceEventTypeV1.safeParse(typeId);

  if (!typeEvent.success) {
    res.status(400).send("Invalid typeId");
    next();

    return;
  }

  const eServiceEvent = getEserviceEventV1ByType(typeEvent.data!);
  const message = produceEserviceEvent(eServiceEvent);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(eServiceEvent);
});

eServiceRouter.get("/V2/:typeId", async (req, res, next) => {
  const { typeId } = req.params;
  const typeEvent = EserviceEventTypeV2.safeParse(typeId);

  if (!typeEvent.success) {
    res.status(400).send("Invalid typeId");
    next();

    return;
  }

  const eServiceEvent = getEserviceEventV2ByType(typeEvent.data!);
  const message = produceEserviceEvent(eServiceEvent);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(eServiceEvent);
});

eServiceRouter.post("/", async (req, res) => {
  const eServiceEvent: EServiceEvent = req.body;

  const message = produceEserviceEvent(eServiceEvent);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(eServiceEvent);
});
export default eServiceRouter;
