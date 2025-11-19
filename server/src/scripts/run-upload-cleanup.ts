import '../load-env.js';
import { runUploadCleanupNow } from '../services/upload-cleanup.js';
import { logger } from '../utils/pino-logger.js';

async function main() {
  try {
    const removed = await runUploadCleanupNow();
    logger.info('Manual upload cleanup complete', { removedUploads: removed });
    process.exit(0);
  } catch (error) {
    logger.error('Manual upload cleanup failed', {
      err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    process.exit(1);
  }
}

void main();

