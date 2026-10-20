import express from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { createNotificationLimiter } from "../../middlewares/rate-limit.middleware.js";
import {
  CreateNotificationBodySchema,
  GetUserNotificationsQuerySchema,
  BatchCreateNotificationBodySchema,
} from "./notification.schema.js";
import {
  createNotification,
  batchCreateNotifications,
  userNotifications,
  findById,
  markAsRead,
} from "./notification.controller.js";

const router = express.Router();

router
  .route("/")
  .post(
    createNotificationLimiter,
    validate(CreateNotificationBodySchema),
    createNotification,
  )
  .get(
    validate(GetUserNotificationsQuerySchema, "query"),
    userNotifications,
  );

router
  .route("/batch")
  .post(
    createNotificationLimiter,
    validate(BatchCreateNotificationBodySchema),
    batchCreateNotifications,
  );

router.route("/:id").get(findById);
router.route("/:id/read").patch(markAsRead);

export default router;