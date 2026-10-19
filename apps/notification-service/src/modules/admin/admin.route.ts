import express from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { adminAuthMiddleware } from "../../middlewares/admin-auth.middleware.js";
import {
  ListDeliveriesQuerySchema,
  DeliveryIdParamsSchema,
} from "./admin.schema.js";
import { listDeliveries, retryDelivery, getStats } from "./admin.controller.js";

const router = express.Router();

router.use(adminAuthMiddleware);

router
  .route("/deliveries")
  .get(validate(ListDeliveriesQuerySchema, "query"), listDeliveries);

router
  .route("/deliveries/:id/retry")
  .post(validate(DeliveryIdParamsSchema, "params"), retryDelivery);

router.route("/stats").get(getStats);

export default router;