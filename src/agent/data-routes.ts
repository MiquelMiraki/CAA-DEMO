import { Router } from 'express';
import { executeQuery } from './snowflake-client';

const router = Router();

// Helper: extract from/to date range from query params and build SQL condition
function dateCondition(req: any, dateCol: string): string {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (!from || !to) return '';
  const safeFrom = from.replace(/'/g, "''");
  const safeTo = to.replace(/'/g, "''");
  return ` AND ${dateCol} >= '${safeFrom}' AND ${dateCol} <= '${safeTo}'`;
}

function monthCondition(req: any, monthCol: string): string {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (!from || !to) return '';
  const safeFrom = from.replace(/'/g, "''").slice(0, 7) + '-01'; // first day of from-month
  const safeTo = to.replace(/'/g, "''");
  return ` AND ${monthCol} >= '${safeFrom}' AND ${monthCol} <= '${safeTo}'`;
}

// Executive KPIs — recompute from channel_daily when date range is provided
router.get('/kpi', async (req, res) => {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  try {
    if (from && to) {
      const safeFrom = from.replace(/'/g, "''");
      const safeTo = to.replace(/'/g, "''");
      const sql = `
        SELECT
          SUM(SPEND) AS CURRENT_SPEND,
          SUM(CONVERSIONS) AS CURRENT_CONVERSIONS,
          SUM(CONVERSION_VALUE) AS CURRENT_REVENUE,
          ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS CURRENT_ROAS,
          NULL AS PREV_SPEND, NULL AS PREV_CONVERSIONS, NULL AS PREV_REVENUE, NULL AS PREV_ROAS,
          NULL AS SPEND_CHANGE_PCT, NULL AS CONVERSIONS_CHANGE_PCT, NULL AS REVENUE_CHANGE_PCT
        FROM GOLD.CHANNEL_DAILY
        WHERE DATE >= '${safeFrom}' AND DATE <= '${safeTo}'
      `;
      const result = await executeQuery(sql);
      res.json(result.rows);
    } else {
      const result = await executeQuery('SELECT * FROM GOLD.EXECUTIVE_KPI');
      res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Channel daily
router.get('/channel-daily', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.CHANNEL_DAILY WHERE 1=1${dateCondition(req, 'DATE')} ORDER BY DATE`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Monthly summary
router.get('/monthly-summary', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.MONTHLY_SUMMARY WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Weekly trends
router.get('/weekly-trends', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.WEEKLY_TRENDS WHERE 1=1${dateCondition(req, 'WEEK_START')} ORDER BY WEEK_START, CHANNEL`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Campaign ranking (with optional channel filter + date range)
router.get('/campaigns', async (req, res) => {
  const channel = req.query.channel as string | undefined;
  const month = req.query.month as string | undefined;
  let sql = `SELECT * FROM GOLD.CAMPAIGN_RANKING WHERE 1=1`;
  if (channel) sql += ` AND CHANNEL = '${channel.replace(/'/g, "''")}'`;
  if (month) sql += ` AND MONTH = '${month.replace(/'/g, "''")}'`;
  sql += monthCondition(req, 'MONTH');
  sql += ` ORDER BY ROAS DESC`;
  try {
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Campaign daily time series
router.get('/campaign-daily', async (req, res) => {
  const channel = req.query.channel as string | undefined;
  let sql = `SELECT DATE, CHANNEL, SUM(IMPRESSIONS) AS IMPRESSIONS, SUM(CLICKS) AS CLICKS,
    SUM(SPEND) AS SPEND, SUM(CONVERSIONS) AS CONVERSIONS, SUM(CONVERSION_VALUE) AS CONVERSION_VALUE,
    ROUND(SUM(CLICKS)/NULLIF(SUM(IMPRESSIONS),0)*100,2) AS CTR_PCT,
    ROUND(SUM(SPEND)/NULLIF(SUM(CLICKS),0),2) AS AVG_CPC,
    ROUND(SUM(SPEND)/NULLIF(SUM(CONVERSIONS),0),2) AS CPA,
    ROUND(SUM(CONVERSION_VALUE)/NULLIF(SUM(SPEND),0),2) AS ROAS
    FROM GOLD.CAMPAIGN_DAILY WHERE 1=1`;
  if (channel) sql += ` AND CHANNEL = '${channel.replace(/'/g, "''")}'`;
  sql += dateCondition(req, 'DATE');
  sql += ` GROUP BY DATE, CHANNEL ORDER BY DATE`;
  try {
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Device breakdown
router.get('/device-breakdown', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.DEVICE_BREAKDOWN WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Placement breakdown (Meta)
router.get('/placements', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.PLACEMENT_BREAKDOWN WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Creative performance
router.get('/creatives', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.CREATIVE_PERFORMANCE WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY ROAS DESC`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Keyword performance
router.get('/keywords', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.KEYWORD_PERFORMANCE WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY SPEND DESC`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Budget pacing
router.get('/budget-pacing', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.BUDGET_PACING WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Funnel
router.get('/funnel', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.FUNNEL WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CHANNEL`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Change audit
router.get('/change-audit', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.CHANGE_AUDIT WHERE 1=1${dateCondition(req, 'CHANGE_DATETIME')} ORDER BY CHANGE_DATETIME DESC LIMIT 100`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GA4 overview
router.get('/ga4-overview', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.GA4_OVERVIEW WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GA4 daily
router.get('/ga4-daily', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.GA4_DAILY WHERE 1=1${dateCondition(req, 'DATE')} ORDER BY DATE`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// SEO performance
router.get('/seo', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.SEO_PERFORMANCE WHERE 1=1${monthCondition(req, 'MONTH')} ORDER BY MONTH, CLICKS DESC`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// SEO daily
router.get('/seo-daily', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.SEO_DAILY WHERE 1=1${dateCondition(req, 'DATE')} ORDER BY DATE`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// CRM pipeline
router.get('/crm-pipeline', async (_req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM GOLD.CRM_PIPELINE');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// CRM lead funnel
router.get('/crm-leads', async (_req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM GOLD.CRM_LEAD_FUNNEL ORDER BY TOTAL_LEADS DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Forecast base
router.get('/forecast', async (req, res) => {
  try {
    let sql = `SELECT * FROM GOLD.FORECAST_BASE WHERE 1=1${dateCondition(req, 'DATE')} ORDER BY DATE, CHANNEL`;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
