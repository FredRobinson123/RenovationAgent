import '../load-env.js';

export type ServerConfig = {
  port: number;
  hostname: string;
  workflowTimeoutMs: number;
  clerkSecretKey?: string;
  missingClerkSecretMessage: string;
};

const parseNumberEnv = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const serverConfig: ServerConfig = {
  port: parseNumberEnv(process.env.PORT, 5001),
  hostname: process.env.HOST || '0.0.0.0',
  workflowTimeoutMs: parseNumberEnv(process.env.WORKFLOW_TIMEOUT_MS, 60_000),
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  missingClerkSecretMessage:
    'Server authentication is misconfigured: set CLERK_SECRET_KEY in server/.env (from the Clerk dashboard).',
};

export const serverEnvironmentSummary = {
  host: serverConfig.hostname,
  port: serverConfig.port,
  workflowTimeoutMs: serverConfig.workflowTimeoutMs,
  clerkSecretConfigured: Boolean(serverConfig.clerkSecretKey),
};

export const redactToken = (token: string | undefined | null): string => {
  if (!token) {
    return '';
  }
  if (token.length <= 12) {
    return `${token.slice(0, 3)}***`;
  }
  return `${token.slice(0, 6)}***${token.slice(-4)}`;
};

