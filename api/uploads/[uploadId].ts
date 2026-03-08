import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, authService, logger } from '../_shared/init.js';
import { handleUploadDeleteRequest } from '../../server/dist/routing/upload-handler.js';

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
  const authUser = await authService.authenticateRequest(req, res);
  if (!authUser) return;

  await handleUploadDeleteRequest(
    typeof uploadId === 'string' ? uploadId : undefined,
    res,
    authUser,
    { logger },
  );
}
