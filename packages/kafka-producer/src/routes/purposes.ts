import express, { Router } from "express";
import {
  PurposeEventTypeV1,
  getPurposeEventV1ByType,
} from "../purposes/purposesV1.js";
import {
  PurposeEventTypeV2,
  getPurposeEventV2ByType,
} from "../purposes/purposesV2.js";
import { producePurposeEvent } from "../purposes/index.js";
import { producer } from "../index.js";
import { PurposeEvent } from "@pagopa/interop-outbound-models";

const purposeRouter: Router = express.Router();

purposeRouter.get("/V1/:typeId", async (req, res, next) => {
  const { typeId } = req.params;
  const typeEvent = PurposeEventTypeV1.safeParse(typeId);

  if (!typeEvent.success) {
    res.status(400).send("Invalid typeId");
    next();

    return;
  }

  const purposeEvent = getPurposeEventV1ByType(typeEvent.data!);
  const message = producePurposeEvent(purposeEvent);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(purposeEvent);
});

purposeRouter.get("/V2/:typeId", async (req, res, next) => {
  const { typeId } = req.params;
  const typeEvent = PurposeEventTypeV2.safeParse(typeId);

  if (!typeEvent.success) {
    res.status(400).send("Invalid typeId");
    next();

    return;
  }

  const purposeEvent = getPurposeEventV2ByType(typeEvent.data!);
  const message = producePurposeEvent(purposeEvent);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(purposeEvent);
});

purposeRouter.post("/", async (req, res) => {
  const purposeEvent: PurposeEvent = req.body;

  const message = producePurposeEvent(purposeEvent);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(purposeEvent);
});
export default purposeRouter;
