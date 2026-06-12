import dotenv from "dotenv";

dotenv.config();

const EMAIL_PROVIDER = (
  process.env.EMAIL_PROVIDER ||
  (process.env.RESEND_API_KEY ? "resend" : "smtp")
).toLowerCase();
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE =
  process.env.SMTP_SECURE === undefined
    ? SMTP_PORT === 465
    : process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 10000);
const RESEND_TIMEOUT_MS = Number(process.env.RESEND_TIMEOUT_MS || 10000);

let smtpTransporter;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getEmailFrom = () => {
  const emailFrom = process.env.EMAIL_FROM;
  if (!emailFrom) {
    throw new Error("EMAIL_FROM is not defined in environment variables");
  }
  return emailFrom;
};

const toEmailErrorDetails = (error) => ({
  name: error?.name,
  message: error?.message,
  code: error?.code,
  command: error?.command,
  syscall: error?.syscall,
  hostname: error?.hostname,
  address: error?.address,
  port: error?.port,
  responseCode: error?.responseCode,
  response: error?.response,
  provider: EMAIL_PROVIDER,
});

const getSmtpTransporter = async () => {
  if (smtpTransporter) return smtpTransporter;

  let nodemailer;
  try {
    ({ default: nodemailer } = await import("nodemailer"));
  } catch (error) {
    throw new Error(
      "EMAIL_PROVIDER=smtp requires the nodemailer package. Use EMAIL_PROVIDER=resend in production or install nodemailer for SMTP diagnostics.",
      { cause: error }
    );
  }

  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      servername: SMTP_HOST,
    },
  });

  return smtpTransporter;
};

const sendWithResend = async (message) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not defined in environment variables");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        payload.message || `Resend request failed with status ${response.status}`
      );
      error.code = payload.name || "RESEND_API_ERROR";
      error.responseCode = response.status;
      throw error;
    }

    return {
      messageId: payload.id,
      response: `Resend accepted message (${response.status})`,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const sendEmail = async (message, emailType) => {
  try {
    let info;
    if (EMAIL_PROVIDER === "resend") {
      info = await sendWithResend(message);
    } else if (EMAIL_PROVIDER === "smtp") {
      const transporter = await getSmtpTransporter();
      info = await transporter.sendMail(message);
    } else {
      throw new Error(`Unsupported EMAIL_PROVIDER: ${EMAIL_PROVIDER}`);
    }

    console.info("[email] Delivery accepted", {
      provider: EMAIL_PROVIDER,
      emailType,
      messageId: info.messageId,
      response: info.response,
    });
    return info;
  } catch (error) {
    console.error("[email] Delivery failed", {
      emailType,
      ...toEmailErrorDetails(error),
    });
    throw error;
  }
};

export const verifyEmailTransport = async () => {
  console.info("[email] Delivery configuration", {
    provider: EMAIL_PROVIDER,
    emailFromConfigured: Boolean(process.env.EMAIL_FROM),
    clientUrlConfigured: Boolean(process.env.CLIENT_URL),
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
    smtpHost: SMTP_HOST,
    smtpPort: SMTP_PORT,
    smtpSecure: SMTP_SECURE,
    smtpUserConfigured: Boolean(SMTP_USER),
    smtpPasswordConfigured: Boolean(SMTP_PASS),
  });

  if (EMAIL_PROVIDER === "resend") {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      console.error("[email] Resend configuration is incomplete");
      return false;
    }
    console.info("[email] Resend configuration is ready");
    return true;
  }

  if (EMAIL_PROVIDER !== "smtp") {
    console.error("[email] Unsupported email provider", {
      provider: EMAIL_PROVIDER,
    });
    return false;
  }

  try {
    const transporter = await getSmtpTransporter();
    await transporter.verify();
    console.info("[email] SMTP transporter verification succeeded", {
      smtpHost: SMTP_HOST,
      smtpPort: SMTP_PORT,
      smtpSecure: SMTP_SECURE,
    });
    return true;
  } catch (error) {
    console.error("[email] SMTP transporter verification failed", {
      smtpHost: SMTP_HOST,
      smtpPort: SMTP_PORT,
      smtpSecure: SMTP_SECURE,
      ...toEmailErrorDetails(error),
    });
    return false;
  }
};

export const sendVerificationEmail = async (email, name, token) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verificationLink = `${clientUrl}/verify-email/${token}`;
  const safeName = escapeHtml(name);

  return sendEmail(
    {
      to: email,
      from: getEmailFrom(),
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
    },
    "verification"
  );
};

export const sendPasswordResetEmail = async (email, name, token) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const resetLink = `${clientUrl}/reset-password/${token}`;
  const safeName = escapeHtml(name);

  return sendEmail(
    {
      to: email,
      from: getEmailFrom(),
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
    },
    "password_reset"
  );
};

export const sendTeamOwnerCredentialsEmail = async ({
  email,
  name,
  temporaryPassword,
}) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const loginUrl = `${clientUrl}/login`;
  const forgotPasswordUrl = `${clientUrl}/forgot-password`;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeTemporaryPassword = temporaryPassword
    ? escapeHtml(temporaryPassword)
    : null;

  return sendEmail(
    {
      to: email,
      from: getEmailFrom(),
      subject: "Your Team Owner Access - AuctionArena",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #2563eb;">Team Owner access assigned</h2>
          <p>Hello ${safeName},</p>
          <p>Your AuctionArena account is ready for Team Owner access.</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          ${
            safeTemporaryPassword
              ? `<p><strong>Temporary password:</strong> ${safeTemporaryPassword}</p>
                 <p>You must choose a new password immediately after your first login. Auction access remains blocked until that change is complete.</p>`
              : `<p>Use your existing password to sign in. If you do not remember it, use the password reset link below.</p>`
          }
          <p><a href="${loginUrl}">Log in to AuctionArena</a></p>
          <p><a href="${forgotPasswordUrl}">Reset or recover your password</a></p>
          <p style="color: #64748b; font-size: 14px;">Do not share a temporary password. AuctionArena will never ask you to send it by email.</p>
        </div>
      `,
    },
    "team_owner_credentials"
  );
};
