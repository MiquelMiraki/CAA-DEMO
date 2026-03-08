import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { validateApiKey, hasSchemaAccess, hasScope, type ApiKey } from './api-keys';

// Extend Express Request to include apiKey
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}

/** Standard API response wrapper */
export function apiResponse(res: Response, data: unknown, meta?: Record<string, unknown>) {
  res.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

/** Standard API error response */
export function apiError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({
    error: {
      code,
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

/** Authentication middleware — validates X-API-Key header */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'] as string | undefined;

  if (!key) {
    apiError(res, 401, 'MISSING_API_KEY', 'Provide your API key in the X-API-Key header.');
    return;
  }

  const apiKey = validateApiKey(key);
  if (!apiKey) {
    apiError(res, 401, 'INVALID_API_KEY', 'The provided API key is invalid or revoked.');
    return;
  }

  req.apiKey = apiKey;
  next();
}

/** Scope check middleware factory */
export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      apiError(res, 401, 'UNAUTHORIZED', 'Authentication required.');
      return;
    }
    if (!hasScope(req.apiKey, scope)) {
      apiError(res, 403, 'INSUFFICIENT_SCOPE', `This endpoint requires the '${scope}' scope.`);
      return;
    }
    next();
  };
}

/** Schema access check middleware */
export function requireSchemaAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.apiKey) {
    apiError(res, 401, 'UNAUTHORIZED', 'Authentication required.');
    return;
  }
  const schema = getSchemaFromRequest(req);
  if (!hasSchemaAccess(req.apiKey, schema)) {
    apiError(res, 403, 'SCHEMA_ACCESS_DENIED', `Your API key does not have access to schema '${schema}'.`);
    return;
  }
  next();
}

/** Extract and validate schema from request */
export function getSchemaFromRequest(req: Request): string {
  const client = (req.query.client as string | undefined) || 'GOLD';
  if (!/^GOLD[A-Z0-9_]*$/i.test(client)) return 'GOLD';
  return client.toUpperCase();
}

/** Dynamic rate limiter based on API key's rate_limit field */
export const dynamicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req: Request) => {
    return req.apiKey?.rate_limit || 30;
  },
  keyGenerator: (req: Request) => {
    return req.apiKey?.id || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    apiError(res as Response, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please slow down.');
  },
});
