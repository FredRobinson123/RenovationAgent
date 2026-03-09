import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, authService, logger } from '../_shared/init.js';
import { handleImageUploadRequest } from '../../server/src/routing/upload-handler.js';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authUser = await authService.authenticateRequest(req, res);
  if (!authUser) return;

  await handleImageUploadRequest(req, res, authUser, { logger });
}
