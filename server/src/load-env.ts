import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(__dirname, '../.env'),
];

const normalizedSeen = new Set<string>();
let hasLoadedAny = false;

for (const candidate of candidatePaths) {
  const normalized = path.normalize(candidate);
  if (normalizedSeen.has(normalized)) {
    continue;
  }
  normalizedSeen.add(normalized);

  if (!fs.existsSync(normalized)) {
    continue;
  }

  config({
    path: normalized,
    override: hasLoadedAny,
  });
  hasLoadedAny = true;
}

