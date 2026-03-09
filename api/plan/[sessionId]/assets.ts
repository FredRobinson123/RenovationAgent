import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, authService, sendJson, logger } from '../../_shared/init.js';
import { listPlanAssetsBySession } from '../../../server/dist/services/plan-asset-service.js';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { sessionId } = req.query;
  if (typeof sessionId !== 'string') {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const authUser = await authService.authenticateRequest(req, res);
  if (!authUser) return;

  try {
    const assets = await listPlanAssetsBySession(decodeURIComponent(sessionId), authUser.userId);
    sendJson(res, 200, { sessionId, assets });
  } catch (error) {
    logger.error('Failed to load plan assets', {
      sessionId,
      userId: authUser.userId,
      err: error instanceof Error ? { message: error.message } : error,
    });
    sendJson(res, 500, { error: 'Unable to load renovation plan assets' });
  }
}
