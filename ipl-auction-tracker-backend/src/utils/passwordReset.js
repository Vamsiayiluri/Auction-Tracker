import crypto from "crypto";

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const createPasswordResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashPasswordResetToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
  };
};

export const hashPasswordResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
