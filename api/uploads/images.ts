import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRuntimeDeps, handleCors, sendInitializationError } from '../_shared/init.js';
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { authService, logger } = await getRuntimeDeps();
    const { handleImageUploadRequest } = await import('../../server/dist/routing/upload-handler.js');
    const authUser = await authService.authenticateRequest(req, res);
    if (!authUser) return;

    await handleImageUploadRequest(req, res, authUser, { logger });
  } catch (error) {
    sendInitializationError(res, error, 'Uploads backend initialization failed.');
  }
}
