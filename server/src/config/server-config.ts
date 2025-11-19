import '../load-env.js';

export type ServerConfig = {
  port: number;
  hostname: string;
  workflowTimeoutMs: number;
  clerkSecretKey?: string;
  missingClerkSecretMessage: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseBucket: string;
  uploadMaxFileSizeBytes: number;
  uploadMaxFileCount: number;
  uploadSignedUrlTTLSeconds: number;
  uploadRetentionHours: number;
  uploadCleanupCron: string;
  uploadCleanupTimezone: string;
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
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseBucket: process.env.SUPABASE_BUCKET || 'chat-image-uploads',
  uploadMaxFileSizeBytes: parseMegabytesEnv(process.env.UPLOAD_MAX_FILE_SIZE_MB, 10),
  uploadMaxFileCount: parseNumberEnv(process.env.UPLOAD_MAX_FILE_COUNT, 5),
  uploadSignedUrlTTLSeconds: parseNumberEnv(process.env.UPLOAD_SIGNED_URL_TTL_SECONDS, 3600),
  uploadRetentionHours: parseNumberEnv(process.env.UPLOAD_RETENTION_HOURS, 24),
  uploadCleanupCron: process.env.UPLOAD_CLEANUP_CRON || '0 18 * * *',
  uploadCleanupTimezone: process.env.UPLOAD_CLEANUP_TZ || 'Europe/London',
};

export const serverEnvironmentSummary = {
  host: serverConfig.hostname,
  port: serverConfig.port,
  workflowTimeoutMs: serverConfig.workflowTimeoutMs,
  clerkSecretConfigured: Boolean(serverConfig.clerkSecretKey),
  supabaseConfigured: Boolean(serverConfig.supabaseUrl && serverConfig.supabaseServiceRoleKey),
  uploadRetentionHours: serverConfig.uploadRetentionHours,
  uploadCleanupCron: serverConfig.uploadCleanupCron,
  uploadCleanupTimezone: serverConfig.uploadCleanupTimezone,
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

function parseMegabytesEnv(value: string | undefined, fallbackMb: number): number {
  const mb = parseNumberEnv(value, fallbackMb);
  return Math.max(mb, 1) * 1024 * 1024;
}

