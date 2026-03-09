import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runUploadCleanupNow } from '../../server/src/services/upload-cleanup.js';
import { logger } from '../../server/src/utils/pino-logger.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron Jobs send a GET with Authorization: Bearer <CRON_SECRET>.
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const removed = await runUploadCleanupNow();
    logger.info('Cron upload cleanup complete', { removedUploads: removed });
    res.status(200).json({ success: true, removedUploads: removed });
  } catch (error) {
    logger.error('Cron upload cleanup failed', {
      err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    res.status(500).json({ error: 'Cleanup failed' });
  }
}
