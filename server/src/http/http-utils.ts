import type { IncomingMessage, ServerResponse } from 'node:http';
import type { JsonRecord, LoggerLike } from '../types.js';

export function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export async function readJsonBody(req: IncomingMessage, logger: LoggerLike): Promise<JsonRecord | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawBody);
    logger.debug('Parsed JSON body for request', {
      url: req.url,
      method: req.method,
      keys: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed as JsonRecord) : undefined,
      sizeBytes: rawBody.length,
    });
    return parsed;
  } catch (error) {
    logger.warn('Failed to parse request body as JSON', { rawBody, err: error });
    throw new Error('Invalid JSON payload');
  }
}

export function sendJson(res: ServerResponse, statusCode: number, payload: JsonRecord) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}
