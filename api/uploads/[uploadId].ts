import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRuntimeDeps, handleCors, sendInitializationError } from '../_shared/init.js';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { uploadId } = req.query;
  try {
    const { authService, logger } = await getRuntimeDeps();
    const { handleUploadDeleteRequest } = await import('../../server/src/routing/upload-handler.js');
    const authUser = await authService.authenticateRequest(req, res);
    if (!authUser) return;

    await handleUploadDeleteRequest(
      typeof uploadId === 'string' ? uploadId : undefined,
      res,
      authUser,
      { logger },
    );
  } catch (error) {
    sendInitializationError(res, error, 'Uploads backend initialization failed.');
  }
}
