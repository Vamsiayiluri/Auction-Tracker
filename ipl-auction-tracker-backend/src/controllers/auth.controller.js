import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { Team, User } from "../models/index.js";
import { sendVerificationEmail } from "../utils/emailService.js";

dotenv.config();

export const registerUser = async (req, res) => {
  try {
    let parsed = req.body;

    if (!parsed || !parsed.id) {
      try {
        parsed = JSON.parse(Object.keys(req.body)[0]);
      } catch (e) {
        // Safe fallback
      }
    }
    let { id, name, email, password, role } = parsed;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate secure token and hashed version for email verification
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Exactly 24 hours expiry

    const newUser = await User.create({
      id,
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: false,
      verificationToken: hashedToken,
      verificationExpires: tokenExpires,
    });

    if (role === "team_owner" && req.body.teamName) {
      await Team.create({
        name: req.body.teamName,
        ownerId: id,
        id: req.body.teamId,
      });
    }

    // Try to send the email, but do NOT delete user/team if email sending fails
    try {
      await sendVerificationEmail(email, name, rawToken);
    } catch (emailError) {
      console.error("Failed to send registration verification email:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      user: newUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    let parsed = req.body;

    if (!parsed || !parsed.email) {
      try {
        parsed = JSON.parse(Object.keys(req.body)[0]);
      } catch (e) {
        // Safe fallback
      }
    }
    let { email, password } = parsed;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid email or password", token: "" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid email or password", token: "" });
    }

    // Enforce email verification check only if required by environment setting
    const verificationRequired = process.env.EMAIL_VERIFICATION_REQUIRED === "true";
    if (verificationRequired && !user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required." });
    }

    // Hash incoming token to match database record
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        verificationToken: hashedToken,
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification token." });
    }

    if (user.isVerified) {
      return res.status(200).json({ success: true, message: "Email is already verified." });
    }

    if (user.verificationExpires && new Date() > new Date(user.verificationExpires)) {
      return res.status(400).json({ success: false, message: "Verification token has expired. Please request a new one." });
    }

    // Mark user as verified, remove token and expiry from db
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Verification failed.", error: error.message });
  }
};

export const resendVerification = async (req, res) => {
  try {
    let parsed = req.body;
    if (!parsed || !parsed.email) {
      try {
        parsed = JSON.parse(Object.keys(req.body)[0]);
      } catch (e) {
        // Safe fallback
      }
    }
    const { email } = parsed;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified." });
    }

    // Cooldown check (60 seconds)
    if (user.verificationExpires) {
      const cooldownMs = 60 * 1000;
      const sentTime = new Date(user.verificationExpires).getTime() - 24 * 60 * 60 * 1000;
      const timeSinceLastSent = Date.now() - sentTime;
      if (timeSinceLastSent < cooldownMs) {
        const secondsLeft = Math.ceil((cooldownMs - timeSinceLastSent) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${secondsLeft} seconds before requesting another verification email.`,
        });
      }
    }

    // Generate new secure token and hashed version
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiry

    user.verificationToken = hashedToken;
    user.verificationExpires = tokenExpires;
    await user.save();

    try {
      await sendVerificationEmail(user.email, user.name, rawToken);
    } catch (emailError) {
      console.error("Failed to send verification email during resend:", emailError);
      return res.status(500).json({ success: false, message: "Failed to send email. Please try again." });
    }

    return res.status(200).json({
      success: true,
      message: "Verification email resent. Please check your inbox.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Resending verification email failed.", error: error.message });
  }
};
