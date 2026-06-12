import {
  classifyEmailError,
  runSmtpDiagnostic,
} from "../utils/emailService.js";

export const testSmtpDelivery = async (req, res) => {
  if (process.env.SMTP_DEBUG_ENDPOINT_ENABLED !== "true") {
    return res.status(404).json({ message: "Not found" });
  }

  try {
    const diagnostic = await runSmtpDiagnostic();
    return res.status(200).json({
      success: true,
      message: "SMTP verification and test delivery succeeded.",
      diagnostic,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "SMTP diagnostic failed.",
      diagnostic:
        error.diagnostic || {
          verify: {
            success: false,
            ...classifyEmailError(error),
          },
        },
    });
  }
};
