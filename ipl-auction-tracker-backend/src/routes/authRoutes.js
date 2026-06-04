import express from "express";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);

export default router;
