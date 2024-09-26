import express, { Router } from "express";
import {
  TenantEventType,
  getTenantEventV1ByType,
} from "../tenants/tenantsV1.js";
import { produceTenantEvent } from "../tenants/index.js";
import { producer } from "../index.js";
import { TenantEvent } from "@pagopa/interop-outbound-models";

const tenantRouter: Router = express.Router();

tenantRouter.get("/V1/:typeId", async (req, res, next) => {
  const { typeId } = req.params;
  const typeEvent = TenantEventType.safeParse(typeId);

  if (!typeEvent.success) {
    res.status(400).send("Invalid typeId");
    next();

    return;
  }

  const tenantEvent = getTenantEventV1ByType(typeEvent.data!);
  const message = produceTenantEvent(tenantEvent);
  console.log("message", message);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(tenantEvent);
});

tenantRouter.post("/", async (req, res) => {
  const tenantEvent: TenantEvent = req.body;

  const message = produceTenantEvent(tenantEvent);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(tenantEvent);
});
export default tenantRouter;
