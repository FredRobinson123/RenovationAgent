import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRuntimeDeps, handleCors, sendInitializationError } from '../../_shared/init.js';

export const config = {
  maxDuration: 300,
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { agentSlug } = req.query;
  if (typeof agentSlug !== 'string') {
    res.status(400).json({ error: 'Invalid agent path' });
    return;
  }

  try {
    const { authService, agentRunner } = await getRuntimeDeps();
    const authUser = await authService.authenticateRequest(req, res);
    if (!authUser) return;

    await agentRunner.handleAgentRunRequest(agentSlug, req, res, authUser);
  } catch (error) {
    sendInitializationError(res, error, 'Assistant backend initialization failed.');
  }
}
