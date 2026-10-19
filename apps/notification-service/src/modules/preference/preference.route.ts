import express from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { adminAuthMiddleware } from "../../middlewares/admin-auth.middleware.js";
import {
  UpdatePreferencesBodySchema,
  UserIdParamsSchema,
} from "./preference.schema.js";
import { getPreferences, updatePreferences } from "./preference.controller.js";

const router = express.Router({ mergeParams: true });

// Protect with existing admin API key until real user auth exists
router.use(adminAuthMiddleware);

router
  .route("/")
  .get(validate(UserIdParamsSchema, "params"), getPreferences)
  .put(
    validate(UserIdParamsSchema, "params"),
    validate(UpdatePreferencesBodySchema),
    updatePreferences,
  );

export default router;