import { Router, Request, Response } from 'express';
import { executeQuery } from './snowflake-client';
import {
  authenticate,
  requireScope,
  requireSchemaAccess,
  dynamicRateLimit,
  apiResponse,
  apiError,
  getSchemaFromRequest,
} from './api-middleware';
import { createApiKey, listApiKeys, revokeApiKey } from './api-keys';

const router = Router();

// ── All public API routes require authentication ──
router.use(authenticate);
router.use(dynamicRateLimit);

// ─── Helpers ─────────────────────────────────────────────

function dateCondition(req: Request, dateCol: string): string {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (!from || !to) return '';
  const safeFrom = from.replace(/'/g, "''");
  const safeTo = to.replace(/'/g, "''");
  return ` AND ${dateCol} >= '${safeFrom}' AND ${dateCol} <= '${safeTo}'`;
}

function monthCondition(req: Request, monthCol: string): string {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (!from || !to) return '';
  const safeFrom = from.replace(/'/g, "''").slice(0, 7) + '-01';
  const safeTo = to.replace(/'/g, "''");
  return ` AND ${monthCol} >= '${safeFrom}' AND ${monthCol} <= '${safeTo}'`;
}

function parsePagination(req: Request): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 1000);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  return { limit, offset };
}

async function queryEndpoint(
  req: Request,
  res: Response,
  buildSql: (schema: string, limit: number, offset: number) => string,
) {
  const schema = getSchemaFromRequest(req);
  const { limit, offset } = parsePagination(req);
  try {
    const sql = buildSql(schema, limit, offset);
    const result = await executeQuery(sql);
    apiResponse(res, result.rows, {
      schema,
      count: result.rowCount,
      limit,
      offset,
    });
  } catch (err) {
    apiError(res, 500, 'QUERY_ERROR', (err as Error).message);
  }
}

// ─── Data Endpoints (read scope) ────────────────────────

// GET /api/v1/kpi
router.get('/kpi', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const schema = getSchemaFromRequest(req);

  if (from && to) {
    const safeFrom = from.replace(/'/g, "''");
    const safeTo = to.replace(/'/g, "''");
    queryEndpoint(req, res, () => `
      SELECT
        SUM(SPEND) AS CURRENT_SPEND,
        SUM(CONVERSIONS) AS CURRENT_CONVERSIONS,
        SUM(CONVERSION_VALUE) AS CURRENT_REVENUE,
        ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS CURRENT_ROAS
      FROM ${schema}.CHANNEL_DAILY
      WHERE DATE >= '${safeFrom}' AND DATE <= '${safeTo}'
    `);
  } else {
    queryEndpoint(req, res, (s) => `SELECT * FROM ${s}.EXECUTIVE_KPI`);
  }
});

// GET /api/v1/channels/daily
router.get('/channels/daily', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.CHANNEL_DAILY WHERE 1=1${dateCondition(req, 'DATE')} ORDER BY DATE LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/channels/monthly
router.get('/channels/monthly', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.MONTHLY_SUMMARY WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/channels/weekly
router.get('/channels/weekly', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.WEEKLY_TRENDS WHERE 1=1${dateCondition(req, 'WEEK_START')} ORDER BY WEEK_START, CHANNEL LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/campaigns
router.get('/campaigns', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  const channel = req.query.channel as string | undefined;
  queryEndpoint(req, res, (s, limit, offset) => {
    let sql = `SELECT * FROM ${s}.CAMPAIGN_RANKING WHERE 1=1`;
    if (channel) sql += ` AND CHANNEL = '${channel.replace(/'/g, "''")}'`;
    sql += monthCondition(req, 'MONTH');
    sql += ` ORDER BY ROAS DESC LIMIT ${limit} OFFSET ${offset}`;
    return sql;
  });
});

// GET /api/v1/campaigns/daily
router.get('/campaigns/daily', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  const channel = req.query.channel as string | undefined;
  queryEndpoint(req, res, (s, limit, offset) => {
    let sql = `SELECT DATE, CHANNEL, SUM(IMPRESSIONS) AS IMPRESSIONS, SUM(CLICKS) AS CLICKS,
      SUM(SPEND) AS SPEND, SUM(CONVERSIONS) AS CONVERSIONS, SUM(CONVERSION_VALUE) AS CONVERSION_VALUE,
      ROUND(SUM(CLICKS)/NULLIF(SUM(IMPRESSIONS),0)*100,2) AS CTR_PCT,
      ROUND(SUM(SPEND)/NULLIF(SUM(CLICKS),0),2) AS AVG_CPC,
      ROUND(SUM(SPEND)/NULLIF(SUM(CONVERSIONS),0),2) AS CPA,
      ROUND(SUM(CONVERSION_VALUE)/NULLIF(SUM(SPEND),0),2) AS ROAS
      FROM ${s}.CAMPAIGN_DAILY WHERE 1=1`;
    if (channel) sql += ` AND CHANNEL = '${channel.replace(/'/g, "''")}'`;
    sql += dateCondition(req, 'DATE');
    sql += ` GROUP BY DATE, CHANNEL ORDER BY DATE LIMIT ${limit} OFFSET ${offset}`;
    return sql;
  });
});

// GET /api/v1/devices
router.get('/devices', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.DEVICE_BREAKDOWN WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/placements
router.get('/placements', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.PLACEMENT_BREAKDOWN WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/creatives
router.get('/creatives', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.CREATIVE_PERFORMANCE WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY ROAS DESC LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/keywords
router.get('/keywords', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.KEYWORD_PERFORMANCE WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY SPEND DESC LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/budget-pacing
router.get('/budget-pacing', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.BUDGET_PACING WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/funnel
router.get('/funnel', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.FUNNEL WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/change-audit
router.get('/change-audit', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.CHANGE_AUDIT WHERE 1=1${dateCondition(req, 'CHANGE_DATETIME')} ORDER BY CHANGE_DATETIME DESC LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/analytics/overview
router.get('/analytics/overview', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.GA4_OVERVIEW WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/analytics/daily
router.get('/analytics/daily', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.GA4_DAILY WHERE 1=1${dateCondition(req, 'DATE')} ORDER BY DATE LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/seo
router.get('/seo', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.SEO_PERFORMANCE WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CLICKS DESC LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/seo/daily
router.get('/seo/daily', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.SEO_DAILY WHERE 1=1${dateCondition(req, 'DATE')} ORDER BY DATE LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/crm/pipeline
router.get('/crm/pipeline', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s) => `SELECT * FROM ${s}.CRM_PIPELINE`);
});

// GET /api/v1/crm/leads
router.get('/crm/leads', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s) => `SELECT * FROM ${s}.CRM_LEAD_FUNNEL ORDER BY TOTAL_LEADS DESC`);
});

// GET /api/v1/attribution
router.get('/attribution', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.ATTRIBUTION WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/channel-overlap
router.get('/channel-overlap', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.CHANNEL_OVERLAP WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, SOURCE_CHANNEL LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/alerts
router.get('/alerts', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.ALERTS WHERE 1=1${dateCondition(req, 'ALERT_DATETIME')} ORDER BY ALERT_DATETIME DESC LIMIT ${limit} OFFSET ${offset}`
  );
});

// GET /api/v1/forecast
router.get('/forecast', requireScope('read'), requireSchemaAccess, (req: Request, res: Response) => {
  queryEndpoint(req, res, (s, limit, offset) =>
    `SELECT * FROM ${s}.FORECAST_BASE WHERE 1=1${dateCondition(req, 'DATE')} ORDER BY DATE, CHANNEL LIMIT ${limit} OFFSET ${offset}`
  );
});

// ─── Admin Endpoints (admin scope) ──────────────────────

// GET /api/v1/keys — list all API keys
router.get('/keys', requireScope('admin'), (_req: Request, res: Response) => {
  apiResponse(res, listApiKeys());
});

// POST /api/v1/keys — create a new API key
router.post('/keys', requireScope('admin'), (req: Request, res: Response) => {
  const { name, client_schema, scopes, rate_limit } = req.body || {};
  if (!name || typeof name !== 'string') {
    apiError(res, 400, 'INVALID_REQUEST', 'Field "name" is required.');
    return;
  }
  const newKey = createApiKey(
    name,
    client_schema || 'GOLD',
    scopes || ['read'],
    rate_limit || 60,
  );
  apiResponse(res, newKey, { note: 'Save this key — it will not be shown again.' });
});

// DELETE /api/v1/keys/:id — revoke an API key
router.delete('/keys/:id', requireScope('admin'), (req: Request, res: Response) => {
  const success = revokeApiKey(req.params.id as string);
  if (!success) {
    apiError(res, 404, 'KEY_NOT_FOUND', 'API key not found.');
    return;
  }
  apiResponse(res, { revoked: true });
});

export default router;
