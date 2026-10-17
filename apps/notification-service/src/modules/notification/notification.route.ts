import express from "express";
import { validate } from "../../middlewares/validate.middleware";
import {
  CreateNotificationBodySchema,
  GetUserNotificationsQuerySchema,
} from "./notification.schema";
import {
  createNotification,
  userNotifications,
  findById,
  markAsRead,
} from "./notification.controller";

const router = express.Router();

router
  .route("/")
  .post(validate(CreateNotificationBodySchema), createNotification);
router
  .route("/")
  .get(validate(GetUserNotificationsQuerySchema, "query"), userNotifications);
router.route("/:id").get(findById);
router.route("/:id/read").patch(markAsRead);

export default router;
