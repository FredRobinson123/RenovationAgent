import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_shared/init.js';
import { agents } from '../server/dist/mastra/agents/index.js';

export const config = {
  api: { bodyParser: false },
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const agentIds = Object.keys(agents);
  res.status(200).json({
    message: 'Renovation Agent server is running',
    agents: agentIds,
    agentEndpoints: agentIds.map(
      (id) => `/api/agents/${id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}/run`,
    ),
  });
}
