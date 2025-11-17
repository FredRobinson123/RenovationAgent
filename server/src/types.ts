export type JsonRecord = Record<string, unknown>;

type LoggerFn = (message: string, metadata?: Record<string, unknown>) => void;

export type LoggerLike = {
  debug: LoggerFn;
  info: LoggerFn;
  warn: LoggerFn;
  error: LoggerFn;
};
