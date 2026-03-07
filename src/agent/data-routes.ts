import { Router } from 'express';
import { executeQuery } from './snowflake-client';

const router = Router();

// Helper to handle errors
function handleQuery(sql: string) {
  return async (_req: any, res: any) => {
    try {
      const result = await executeQuery(sql);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}

// Executive KPIs
router.get('/kpi', handleQuery(`SELECT * FROM GOLD.EXECUTIVE_KPI`));

// Channel daily
router.get('/channel-daily', handleQuery(`SELECT * FROM GOLD.CHANNEL_DAILY ORDER BY DATE`));

// Monthly summary
router.get('/monthly-summary', handleQuery(`SELECT * FROM GOLD.MONTHLY_SUMMARY ORDER BY MONTH, CHANNEL`));

// Weekly trends
router.get('/weekly-trends', handleQuery(`SELECT * FROM GOLD.WEEKLY_TRENDS ORDER BY WEEK_START, CHANNEL`));

// Campaign daily (with optional channel filter)
router.get('/campaigns', async (req, res) => {
  const channel = req.query.channel as string | undefined;
  const month = req.query.month as string | undefined;
  let sql = `SELECT * FROM GOLD.CAMPAIGN_RANKING`;
  const conditions: string[] = [];
  if (channel) conditions.push(`CHANNEL = '${channel.replace(/'/g, "''")}'`);
  if (month) conditions.push(`MONTH = '${month.replace(/'/g, "''")}'`);
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
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
    FROM GOLD.CAMPAIGN_DAILY`;
  if (channel) sql += ` WHERE CHANNEL = '${channel.replace(/'/g, "''")}'`;
  sql += ` GROUP BY DATE, CHANNEL ORDER BY DATE`;
  try {
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Device breakdown
router.get('/device-breakdown', handleQuery(`SELECT * FROM GOLD.DEVICE_BREAKDOWN ORDER BY MONTH, CHANNEL`));

// Placement breakdown (Meta)
router.get('/placements', handleQuery(`SELECT * FROM GOLD.PLACEMENT_BREAKDOWN ORDER BY MONTH`));

// Creative performance
router.get('/creatives', handleQuery(`SELECT * FROM GOLD.CREATIVE_PERFORMANCE ORDER BY ROAS DESC`));

// Keyword performance
router.get('/keywords', handleQuery(`SELECT * FROM GOLD.KEYWORD_PERFORMANCE ORDER BY SPEND DESC`));

// Budget pacing
router.get('/budget-pacing', handleQuery(`SELECT * FROM GOLD.BUDGET_PACING ORDER BY MONTH, CHANNEL`));

// Funnel
router.get('/funnel', handleQuery(`SELECT * FROM GOLD.FUNNEL ORDER BY MONTH, CHANNEL`));

// Change audit
router.get('/change-audit', handleQuery(`SELECT * FROM GOLD.CHANGE_AUDIT ORDER BY CHANGE_DATETIME DESC LIMIT 100`));

// GA4 overview
router.get('/ga4-overview', handleQuery(`SELECT * FROM GOLD.GA4_OVERVIEW ORDER BY MONTH`));

// GA4 daily
router.get('/ga4-daily', handleQuery(`SELECT * FROM GOLD.GA4_DAILY ORDER BY DATE`));

// SEO performance
router.get('/seo', handleQuery(`SELECT * FROM GOLD.SEO_PERFORMANCE ORDER BY MONTH, CLICKS DESC`));

// SEO daily
router.get('/seo-daily', handleQuery(`SELECT * FROM GOLD.SEO_DAILY ORDER BY DATE`));

// CRM pipeline
router.get('/crm-pipeline', handleQuery(`SELECT * FROM GOLD.CRM_PIPELINE`));

// CRM lead funnel
router.get('/crm-leads', handleQuery(`SELECT * FROM GOLD.CRM_LEAD_FUNNEL ORDER BY TOTAL_LEADS DESC`));

// Forecast base
router.get('/forecast', handleQuery(`SELECT * FROM GOLD.FORECAST_BASE ORDER BY DATE, CHANNEL`));

export default router;
