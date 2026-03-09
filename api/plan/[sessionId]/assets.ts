import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getRuntimeDeps,
  handleCors,
  sendInitializationError,
  sendJson,
} from '../../_shared/init.js';

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

  try {
    const { authService, logger } = await getRuntimeDeps();
    const { listPlanAssetsBySession } = await import(
      '../../../server/dist/services/plan-asset-service.js'
    );
    const authUser = await authService.authenticateRequest(req, res);
    if (!authUser) return;

    const assets = await listPlanAssetsBySession(decodeURIComponent(sessionId), authUser.userId);
    res.status(200).json({ sessionId, assets });
  } catch (error) {
    if (error instanceof Error && /required|misconfigured|configured/i.test(error.message)) {
      sendInitializationError(res, error, 'Plan assets backend initialization failed.');
      return;
    }

    const { logger } = await getRuntimeDeps().catch(() => ({ logger: console }));
    logger.error('Failed to load plan assets', {
      sessionId,
      err: error instanceof Error ? { message: error.message } : error,
    });
    res.status(500).json({ error: 'Unable to load renovation plan assets' });
  }
}
