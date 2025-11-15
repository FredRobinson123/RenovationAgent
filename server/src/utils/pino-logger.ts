import { PinoLogger, type LogLevel } from '@mastra/loggers';

export function createLogger(options?: {
  level?: LogLevel | string;
  name?: string;
  pretty?: boolean;
}) {
  const {
    level = (process.env.LOG_LEVEL as LogLevel) || 'info',
    name = 'renovation-agent',
  } = options || {};

  const pinoOptions: {
    level?: LogLevel;
    name?: string;
  } = {
    level: level as LogLevel,
    name,
  };

  return new PinoLogger(pinoOptions);
}

export const logger = createLogger();

