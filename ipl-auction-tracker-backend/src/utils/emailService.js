import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const sendVerificationEmail = async (email, name, token) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verificationLink = `${clientUrl}/verify-email/${token}`;
  const emailFrom = process.env.EMAIL_FROM;
  const safeName = escapeHtml(name);

  if (!emailFrom) {
    throw new Error("EMAIL_FROM is not defined in environment variables");
  }

  const msg = {
    to: email,
    from: emailFrom,
    subject: "Verify Your Email - AuctionArena",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-bottom: 24px;">Welcome to AuctionArena!</h2>
        <p>Hello ${safeName},</p>
        <p>Thank you for registering on AuctionArena. To get started with managing or participating in live auctions, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #64748b;"><a href="${verificationLink}">${verificationLink}</a></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">This link will expire in 24 hours.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} AuctionArena. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(msg);
};

export const sendPasswordResetEmail = async (email, name, token) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const resetLink = `${clientUrl}/reset-password/${token}`;
  const emailFrom = process.env.EMAIL_FROM;
  const safeName = escapeHtml(name);

  if (!emailFrom) {
    throw new Error("EMAIL_FROM is not defined in environment variables");
  }

  const msg = {
    to: email,
    from: emailFrom,
    subject: "Reset Your Password - AuctionArena",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-bottom: 24px;">Reset your password</h2>
        <p>Hello ${safeName},</p>
        <p>We received a request to reset your AuctionArena password. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #64748b;"><a href="${resetLink}">${resetLink}</a></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">This link will expire in 1 hour and can be used only once.</p>
        <p style="color: #64748b; font-size: 14px;">If you did not request a password reset, you can ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} AuctionArena. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(msg);
};
