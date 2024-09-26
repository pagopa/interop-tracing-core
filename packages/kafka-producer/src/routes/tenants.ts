import express, { Router } from "express";
import {
  TenantEventTypeV1,
  getTenantEventV1ByType,
} from "../tenants/tenantsV1.js";
import { produceTenantEvent } from "../tenants/index.js";
import { producer } from "../index.js";
import { TenantEvent } from "@pagopa/interop-outbound-models";
import {
  TenantEventTypeV2,
  getTenantEventV2ByType,
} from "../tenants/tenantsV2.js";

const tenantRouter: Router = express.Router();

tenantRouter.get("/V1/:typeId", async (req, res, next) => {
  const { typeId } = req.params;
  const typeEvent = TenantEventTypeV1.safeParse(typeId);

  if (!typeEvent.success) {
    res.status(400).send("Invalid typeId");
    next();

    return;
  }

  const tenantEvent = getTenantEventV1ByType(typeEvent.data!);
  const message = produceTenantEvent(tenantEvent);
  await producer.send({
    messages: [{ value: message }],
  });

  res.send(tenantEvent);
});

tenantRouter.get("/V2/:typeId", async (req, res, next) => {
  const { typeId } = req.params;
  const typeEvent = TenantEventTypeV2.safeParse(typeId);

  if (!typeEvent.success) {
    res.status(400).send("Invalid typeId");
    next();

    return;
  }

  const tenantEvent = getTenantEventV2ByType(typeEvent.data!);
  const message = produceTenantEvent(tenantEvent);
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
