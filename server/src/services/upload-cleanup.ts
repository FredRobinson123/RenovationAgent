import cron from 'node-cron';
import { serverConfig } from '../config/server-config.js';
import { deleteUploadsOlderThan, removeObjectsFromBucket } from './chat-upload-service.js';
import { logger } from '../utils/pino-logger.js';

export function scheduleUploadCleanup() {
  const { uploadCleanupCron, uploadCleanupTimezone } = serverConfig;

  cron.schedule(
    uploadCleanupCron,
    async () => {
      logger.info('Starting scheduled upload cleanup');
      try {
        const removed = await runUploadCleanupNow();
        logger.info('Scheduled upload cleanup finished', { removedUploads: removed });
      } catch (error) {
        logger.error('Scheduled upload cleanup failed', {
          err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        });
      }
    },
    { timezone: uploadCleanupTimezone }
  );

  logger.info('Upload cleanup job scheduled', {
    cron: uploadCleanupCron,
    timezone: uploadCleanupTimezone,
    retentionHours: serverConfig.uploadRetentionHours,
  });
}

export async function runUploadCleanupNow(): Promise<number> {
  const cutoff = new Date(Date.now() - serverConfig.uploadRetentionHours * 60 * 60 * 1000);
  logger.info('Running upload cleanup', { cutoff: cutoff.toISOString() });

  const expiredUploads = await deleteUploadsOlderThan(cutoff);
  const storagePaths = expiredUploads.map((upload) => upload.storagePath);

  if (storagePaths.length) {
    await removeObjectsFromBucket(storagePaths);
  }

  return expiredUploads.length;
}

