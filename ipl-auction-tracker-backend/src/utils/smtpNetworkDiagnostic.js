import net from "node:net";
import tls from "node:tls";
import { resolve4, resolve6 } from "node:dns/promises";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const NETWORK_TIMEOUT_MS = Number(
  process.env.SMTP_NETWORK_TIMEOUT_MS || process.env.SMTP_TIMEOUT_MS || 15000
);

const toNetworkError = (error) => ({
  name: error?.name,
  message: error?.message,
  code: error?.code,
  syscall: error?.syscall,
  address: error?.address,
  port: error?.port,
});

const connectTcp = ({ address, port, keepSocket = false }) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = net.connect({ host: address, port, family: 4 });

    const finish = (result) => {
      socket.removeAllListeners("connect");
      socket.removeAllListeners("timeout");
      socket.removeAllListeners("error");
      if (!keepSocket || !result.success) socket.destroy();
      resolve({
        ...result,
        socket: keepSocket && result.success ? socket : null,
      });
    };

    socket.setTimeout(NETWORK_TIMEOUT_MS);
    socket.once("connect", () =>
      finish({
        success: true,
        connectTimeMs: Date.now() - startedAt,
        address,
        port,
      })
    );
    socket.once("timeout", () => {
      const error = new Error(
        `TCP connection timed out after ${NETWORK_TIMEOUT_MS}ms`
      );
      error.code = "ETIMEDOUT";
      finish({
        success: false,
        connectTimeMs: Date.now() - startedAt,
        address,
        port,
        error: toNetworkError(error),
      });
    });
    socket.once("error", (error) =>
      finish({
        success: false,
        connectTimeMs: Date.now() - startedAt,
        address,
        port,
        error: toNetworkError(error),
      })
    );
  });

const performTlsHandshake = (socket) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const tlsSocket = tls.connect({
      socket,
      servername: SMTP_HOST,
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    });

    const finish = (result) => {
      tlsSocket.removeAllListeners("secureConnect");
      tlsSocket.removeAllListeners("timeout");
      tlsSocket.removeAllListeners("error");
      tlsSocket.destroy();
      resolve(result);
    };

    tlsSocket.setTimeout(NETWORK_TIMEOUT_MS);
    tlsSocket.once("secureConnect", () =>
      finish({
        success: true,
        handshakeTimeMs: Date.now() - startedAt,
        protocol: tlsSocket.getProtocol(),
        authorized: tlsSocket.authorized,
      })
    );
    tlsSocket.once("timeout", () => {
      const error = new Error(
        `TLS handshake timed out after ${NETWORK_TIMEOUT_MS}ms`
      );
      error.code = "ETIMEDOUT";
      finish({
        success: false,
        handshakeTimeMs: Date.now() - startedAt,
        error: toNetworkError(error),
      });
    });
    tlsSocket.once("error", (error) =>
      finish({
        success: false,
        handshakeTimeMs: Date.now() - startedAt,
        error: toNetworkError(error),
      })
    );
  });

export const runGmailNetworkDiagnostic = async () => {
  const dnsStartedAt = Date.now();
  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    resolve4(SMTP_HOST),
    resolve6(SMTP_HOST),
  ]);
  const ipv4Addresses =
    ipv4Result.status === "fulfilled" ? ipv4Result.value : [];
  const ipv6Addresses =
    ipv6Result.status === "fulfilled" ? ipv6Result.value : [];
  const chosenAddress = ipv4Addresses[0] || null;

  const result = {
    dnsSuccess: Boolean(chosenAddress),
    tcp587Success: false,
    tcp465Success: false,
    tlsSuccess: false,
    timings: {
      dnsMs: Date.now() - dnsStartedAt,
      tcp587Ms: null,
      tcp465Ms: null,
      tlsMs: null,
    },
    dns: {
      hostname: SMTP_HOST,
      ipv4Addresses,
      ipv6Addresses,
      chosenAddressFamily: "IPv4",
      chosenAddress,
      error:
        ipv4Result.status === "rejected"
          ? toNetworkError(ipv4Result.reason)
          : null,
    },
    tcp587: null,
    tcp465: null,
    tls: null,
  };

  if (!chosenAddress) return result;

  const [tcp587, tcp465] = await Promise.all([
    connectTcp({ address: chosenAddress, port: 587 }),
    connectTcp({ address: chosenAddress, port: 465, keepSocket: true }),
  ]);

  result.tcp587 = { ...tcp587, socket: undefined };
  result.tcp465 = { ...tcp465, socket: undefined };
  result.tcp587Success = tcp587.success;
  result.tcp465Success = tcp465.success;
  result.timings.tcp587Ms = tcp587.connectTimeMs;
  result.timings.tcp465Ms = tcp465.connectTimeMs;

  if (tcp465.success && tcp465.socket) {
    const tlsResult = await performTlsHandshake(tcp465.socket);
    result.tls = tlsResult;
    result.tlsSuccess = tlsResult.success;
    result.timings.tlsMs = tlsResult.handshakeTimeMs;
  }

  return result;
};
