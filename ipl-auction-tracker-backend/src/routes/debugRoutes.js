import express from "express";
import {
  testActiveEmailProvider,
  testSmtpDelivery,
  testSmtpNetwork,
} from "../controllers/debug.controller.js";
import {
  adminMiddleware,
  authMiddleware,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get("/smtp-test", testSmtpDelivery);
router.get("/network-test", testSmtpNetwork);
router.get("/email-test", testActiveEmailProvider);

export default router;
