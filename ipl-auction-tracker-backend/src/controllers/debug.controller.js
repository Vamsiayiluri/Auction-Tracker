import {
  classifyEmailError,
  runSmtpDiagnostic,
} from "../utils/emailService.js";
import { runGmailNetworkDiagnostic } from "../utils/smtpNetworkDiagnostic.js";

const isDebugEndpointEnabled = () =>
  process.env.SMTP_DEBUG_ENDPOINT_ENABLED === "true";

export const testSmtpDelivery = async (req, res) => {
  if (!isDebugEndpointEnabled()) {
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

export const testSmtpNetwork = async (req, res) => {
  if (!isDebugEndpointEnabled()) {
    return res.status(404).json({ message: "Not found" });
  }

  try {
    const diagnostic = await runGmailNetworkDiagnostic();
    const success =
      diagnostic.dnsSuccess &&
      diagnostic.tcp587Success &&
      diagnostic.tcp465Success &&
      diagnostic.tlsSuccess;

    console.info("[email] Gmail network diagnostic completed", {
      dnsSuccess: diagnostic.dnsSuccess,
      tcp587Success: diagnostic.tcp587Success,
      tcp465Success: diagnostic.tcp465Success,
      tlsSuccess: diagnostic.tlsSuccess,
      timings: diagnostic.timings,
      chosenAddress: diagnostic.dns?.chosenAddress,
    });

    return res.status(success ? 200 : 502).json(diagnostic);
  } catch (error) {
    return res.status(502).json({
      dnsSuccess: false,
      tcp587Success: false,
      tcp465Success: false,
      tlsSuccess: false,
      timings: {
        dnsMs: null,
        tcp587Ms: null,
        tcp465Ms: null,
        tlsMs: null,
      },
      error: {
        name: error?.name,
        message: error?.message,
        code: error?.code,
      },
    });
  }
};
