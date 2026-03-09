import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: { bodyParser: false },
};

const agentIds = [
  'designInspirationGuideAgent',
  'budgetAgent',
  'contractorAgent',
  'timelineAgent',
  'materialsAgent',
  'leadRenovationAgent',
];

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    message: 'Renovation Agent server is running',
    agents: agentIds,
    agentEndpoints: agentIds.map(
      (id) => `/api/agents/${id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}/run`,
    ),
  });
}
