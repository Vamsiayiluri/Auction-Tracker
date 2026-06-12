import express from "express";
import { testSmtpDelivery } from "../controllers/debug.controller.js";
import {
  adminMiddleware,
  authMiddleware,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get("/smtp-test", testSmtpDelivery);

export default router;
