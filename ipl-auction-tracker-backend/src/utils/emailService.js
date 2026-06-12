import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { setDefaultResultOrder } from "node:dns";
import { resolve4, resolve6 } from "node:dns/promises";
import { isIPv4 } from "node:net";

dotenv.config();
setDefaultResultOrder("ipv4first");

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE =
  process.env.SMTP_SECURE === undefined
    ? false
    : process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 15000);
const RESEND_TIMEOUT_MS = Number(process.env.RESEND_TIMEOUT_MS || 10000);

let smtpTransporter;
let smtpAddressSelection;

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

const getSmtpConfiguration = () => ({
  hostname: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  requireTls: !SMTP_SECURE,
  dnsResultOrder: "ipv4first",
  chosenAddressFamily: "IPv4",
  chosenAddress: smtpAddressSelection?.chosenAddress,
  userConfigured: Boolean(SMTP_USER),
  passwordConfigured: Boolean(SMTP_PASS),
  fromConfigured: Boolean(process.env.EMAIL_FROM),
});

const resolveSmtpAddresses = async () => {
  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    isIPv4(SMTP_HOST) ? Promise.resolve([SMTP_HOST]) : resolve4(SMTP_HOST),
    isIPv4(SMTP_HOST) ? Promise.resolve([]) : resolve6(SMTP_HOST),
  ]);
  const ipv4Addresses =
    ipv4Result.status === "fulfilled" ? ipv4Result.value : [];
  const ipv6Addresses =
    ipv6Result.status === "fulfilled" ? ipv6Result.value : [];

  if (!ipv4Addresses.length) {
    const error =
      ipv4Result.status === "rejected"
        ? ipv4Result.reason
        : new Error(`No IPv4 addresses resolved for ${SMTP_HOST}`);
    error.code ||= "SMTP_IPV4_UNAVAILABLE";
    throw Object.assign(error, {
      smtpDns: {
        hostname: SMTP_HOST,
        ipv4Addresses,
        ipv6Addresses,
        chosenAddressFamily: "IPv4",
        chosenAddress: null,
      },
    });
  }

  return {
    hostname: SMTP_HOST,
    ipv4Addresses,
    ipv6Addresses,
    chosenAddressFamily: "IPv4",
    chosenAddress: ipv4Addresses[0],
  };
};

export const classifyEmailError = (error) => {
  const code = error?.code;
  const responseCode = error?.responseCode;
  const message = String(error?.message || "");
  const response = String(error?.response || "");
  const combinedMessage = `${message} ${response}`.toLowerCase();

  let category = "unknown";
  if (code === "SMTP_CONFIGURATION_MISSING") {
    category = "configuration_missing";
  } else if (code === "SMTP_IPV4_UNAVAILABLE") {
    category = "ipv4_resolution_failed";
  } else if (code === "ENETUNREACH") {
    category = "network_unreachable";
  } else if (code === "ETIMEDOUT" || combinedMessage.includes("timeout")) {
    category = "connection_timeout";
  } else if (code === "ECONNREFUSED") {
    category = "connection_refused";
  } else if (code === "EDNS" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
    category = "dns_failure";
  } else if (
    code === "EAUTH" ||
    responseCode === 534 ||
    responseCode === 535 ||
    combinedMessage.includes("invalid login") ||
    combinedMessage.includes("username and password not accepted") ||
    combinedMessage.includes("application-specific password required")
  ) {
    category = "gmail_authentication_failed";
  } else if (
    code?.startsWith?.("ERR_TLS") ||
    code?.startsWith?.("CERT_") ||
    code === "EPROTO" ||
    combinedMessage.includes("tls") ||
    combinedMessage.includes("ssl") ||
    combinedMessage.includes("certificate")
  ) {
    category = "tls_failure";
  } else if (code === "ECONNECTION" || code === "ESOCKET") {
    category = "smtp_connection_failed";
  } else if (responseCode >= 400) {
    category = "smtp_rejected";
  }

  return {
    category,
    name: error?.name,
    message,
    code,
    command: error?.command,
    syscall: error?.syscall,
    hostname: error?.hostname,
    address: error?.address,
    port: error?.port,
    responseCode,
  };
};

const logEmailError = (event, error, details = {}) => {
  const diagnostic = {
    event,
    provider: EMAIL_PROVIDER,
    ...details,
    ...classifyEmailError(error),
  };
  console.error("[email]", diagnostic);
  return diagnostic;
};

const getSmtpTransporter = async (addressSelection) => {
  if (smtpTransporter) return smtpTransporter;

  smtpAddressSelection = addressSelection || (await resolveSmtpAddresses());
  smtpTransporter = nodemailer.createTransport({
    // Passing an IPv4 literal prevents Nodemailer from selecting an AAAA record.
    host: smtpAddressSelection.chosenAddress,
    servername: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    requireTLS: !SMTP_SECURE,
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
      // Preserve Gmail hostname validation while connecting to an IPv4 literal.
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
    logEmailError("delivery_failed", error, { emailType });
    throw error;
  }
};

export const verifyEmailTransport = async () => {
  console.info("[email] Delivery configuration", {
    provider: EMAIL_PROVIDER,
    clientUrlConfigured: Boolean(process.env.CLIENT_URL),
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
    smtp: getSmtpConfiguration(),
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

  if (
    !SMTP_USER ||
    !SMTP_PASS ||
    !process.env.EMAIL_FROM ||
    !Number.isInteger(SMTP_PORT) ||
    SMTP_PORT <= 0
  ) {
    const error = new Error(
      "SMTP_USER, SMTP_PASS, EMAIL_FROM, and a valid SMTP_PORT are required"
    );
    error.code = "SMTP_CONFIGURATION_MISSING";
    logEmailError("smtp_startup_configuration_invalid", error, {
      smtp: getSmtpConfiguration(),
    });
    return false;
  }

  try {
    const addressSelection = await resolveSmtpAddresses();
    smtpAddressSelection = addressSelection;
    console.info("[email] SMTP address selection", addressSelection);
    const transporter = await getSmtpTransporter(addressSelection);
    await transporter.verify();
    console.info("[email] SMTP transporter verification succeeded", {
      provider: EMAIL_PROVIDER,
      smtp: getSmtpConfiguration(),
    });
    return true;
  } catch (error) {
    logEmailError("smtp_startup_verification_failed", error, {
      smtp: getSmtpConfiguration(),
    });
    return false;
  }
};

export const runSmtpDiagnostic = async () => {
  const startedAt = new Date();
  const smtp = getSmtpConfiguration();
  const result = {
    provider: EMAIL_PROVIDER,
    smtp,
    startedAt: startedAt.toISOString(),
    dns: null,
    verify: null,
    send: null,
  };

  if (!SMTP_USER || !SMTP_PASS || !process.env.EMAIL_FROM) {
    const error = new Error(
      "SMTP_USER, SMTP_PASS, and EMAIL_FROM must be configured"
    );
    error.code = "SMTP_CONFIGURATION_MISSING";
    throw Object.assign(error, {
      diagnostic: {
        ...result,
        verify: {
          success: false,
          ...classifyEmailError(error),
        },
      },
    });
  }

  const dnsStartedAt = Date.now();
  try {
    const addressSelection = await resolveSmtpAddresses();
    smtpAddressSelection = addressSelection;
    result.dns = {
      success: true,
      durationMs: Date.now() - dnsStartedAt,
      ...addressSelection,
    };
    result.smtp = getSmtpConfiguration();
  } catch (error) {
    result.dns = {
      success: false,
      durationMs: Date.now() - dnsStartedAt,
      hostname: SMTP_HOST,
      ipv4Addresses: error.smtpDns?.ipv4Addresses || [],
      ipv6Addresses: error.smtpDns?.ipv6Addresses || [],
      chosenAddressFamily: "IPv4",
      chosenAddress: null,
      ...classifyEmailError(error),
    };
    logEmailError("smtp_debug_dns_failed", error, { smtp });
    throw Object.assign(error, { diagnostic: result });
  }

  const transporter = await getSmtpTransporter(smtpAddressSelection);
  const verifyStartedAt = Date.now();
  try {
    await transporter.verify();
    result.verify = {
      success: true,
      durationMs: Date.now() - verifyStartedAt,
    };
  } catch (error) {
    result.verify = {
      success: false,
      durationMs: Date.now() - verifyStartedAt,
      ...classifyEmailError(error),
    };
    logEmailError("smtp_debug_verify_failed", error, { smtp });
    throw Object.assign(error, { diagnostic: result });
  }

  const sendStartedAt = Date.now();
  try {
    const info = await transporter.sendMail({
      to: SMTP_USER,
      from: getEmailFrom(),
      subject: "AuctionArena SMTP diagnostic",
      text: `SMTP diagnostic succeeded at ${new Date().toISOString()}.`,
      html: `<p>SMTP diagnostic succeeded at ${new Date().toISOString()}.</p>`,
    });
    result.send = {
      success: true,
      durationMs: Date.now() - sendStartedAt,
      messageId: info.messageId,
      acceptedCount: info.accepted?.length || 0,
      rejectedCount: info.rejected?.length || 0,
      response: info.response,
    };
    result.completedAt = new Date().toISOString();
    console.info("[email] SMTP diagnostic succeeded", result);
    return result;
  } catch (error) {
    result.send = {
      success: false,
      durationMs: Date.now() - sendStartedAt,
      ...classifyEmailError(error),
    };
    logEmailError("smtp_debug_send_failed", error, { smtp });
    throw Object.assign(error, { diagnostic: result });
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
