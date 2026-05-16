/**
 * Seed GOLD_LALA schema with synthetic data for Grupo LALA (Mexico's largest dairy company).
 *
 * Multi-tenant CAA tenant: GOLD_LALA
 * Currency: MXN
 * Time period: Jan 1, 2026 - Mar 31, 2026 (90 days)
 * Channels: Google Ads, Meta Ads, TikTok Ads, Influencer Marketing
 * Geography: 5 Mexico regions + 5 US Hispanic DMAs
 *
 * Run: node snowflake/06-create-gold-lala.js
 *
 * Data is built directly into GOLD_LALA tables (no bronze/silver pipeline) since
 * this is demo data for the Tuesday 2026-04-28 LALA meeting.
 */
const { getConnection, connect, query, batchInsert } = require('./config');

const SCHEMA = 'GOLD_LALA';

// ============================================================
// REFERENCE DATA
// ============================================================

const BRANDS = [
  { code: 'LALA', name: 'LALA', category: 'Master Brand' },
  { code: 'NUTRI', name: 'Nutri', category: 'Value Milk' },
  { code: 'BOREAL', name: 'Boreal', category: 'Infant Formula' },
  { code: 'LALA100', name: 'LALA 100', category: 'Premium Lactose-Free' },
  { code: 'YOMI', name: 'Yomi', category: 'Kids Yogurt' },
  { code: 'SILUETT', name: 'Siluett', category: 'Light/Wellness' },
  { code: 'VOLCANES', name: 'Los Volcanes', category: 'Traditional Dairy' },
];

// Mexico regions (real LALA distribution skew)
const MX_REGIONS = [
  { code: 'NORTE', name: 'Norte (Coahuila/NL/Tamaulipas/Chih)', share: 0.30 },
  { code: 'CENTRO', name: 'Centro (CDMX/EdoMex/Hidalgo)', share: 0.28 },
  { code: 'BAJIO', name: 'Bajío (Querétaro/Gto/Jalisco)', share: 0.20 },
  { code: 'OCCIDENTE', name: 'Occidente (Sinaloa/Durango/Sonora)', share: 0.12 },
  { code: 'SURESTE', name: 'Sureste (Veracruz/Yucatán/QR)', share: 0.10 },
];

// US Hispanic DMAs for LALA US line
const US_HISPANIC = [
  { code: 'US_LA', name: 'Los Angeles DMA', share: 0.30 },
  { code: 'US_HOUSTON', name: 'Houston DMA', share: 0.22 },
  { code: 'US_DALLAS', name: 'Dallas-Fort Worth DMA', share: 0.20 },
  { code: 'US_CHICAGO', name: 'Chicago DMA', share: 0.16 },
  { code: 'US_MIAMI', name: 'Miami DMA', share: 0.12 },
];

// ============================================================
// CAMPAIGNS (28 total: 3 real + 25 synthetic but believable)
// ============================================================

const CAMPAIGNS = [
  // ========== GOOGLE ADS (12) ==========
  { id: 1001, channel: 'Google Ads', type: 'SEARCH', name: 'Lala Marca - Branded MX', brand: 'LALA', geo: 'MX', dailyBudget: 18000, region: 'CENTRO' },
  { id: 1002, channel: 'Google Ads', type: 'SEARCH', name: 'Lala Productos - Genéricos', brand: 'LALA', geo: 'MX', dailyBudget: 22000, region: 'NORTE' },
  { id: 1003, channel: 'Google Ads', type: 'SEARCH', name: 'Nutri Leche - Familias', brand: 'NUTRI', geo: 'MX', dailyBudget: 12000, region: 'BAJIO' },
  { id: 1004, channel: 'Google Ads', type: 'SEARCH', name: 'Boreal Fórmulas Infantiles', brand: 'BOREAL', geo: 'MX', dailyBudget: 15000, region: 'CENTRO' },
  { id: 1005, channel: 'Google Ads', type: 'SEARCH', name: 'LALA 100 Deslactosada Search', brand: 'LALA100', geo: 'MX', dailyBudget: 14000, region: 'NORTE' },
  { id: 1006, channel: 'Google Ads', type: 'SHOPPING', name: 'Lala Shopping - Walmart', brand: 'LALA', geo: 'MX', dailyBudget: 25000, region: 'CENTRO' },
  { id: 1007, channel: 'Google Ads', type: 'SHOPPING', name: 'Lala Shopping - Soriana', brand: 'LALA', geo: 'MX', dailyBudget: 18000, region: 'BAJIO' },
  { id: 1008, channel: 'Google Ads', type: 'SHOPPING', name: 'Lala E-commerce - Mercado Libre', brand: 'LALA', geo: 'MX', dailyBudget: 16000, region: 'CENTRO' },
  { id: 1009, channel: 'Google Ads', type: 'VIDEO', name: 'La Neta Detrás de un Vaso de Lala (Chayanne)', brand: 'LALA', geo: 'MX', dailyBudget: 45000, region: 'NACIONAL' },
  { id: 1010, channel: 'Google Ads', type: 'VIDEO', name: 'Yomi Niños YouTube Kids', brand: 'YOMI', geo: 'MX', dailyBudget: 12000, region: 'NACIONAL' },
  { id: 1011, channel: 'Google Ads', type: 'VIDEO', name: 'Boreal Mamás Primerizas YouTube', brand: 'BOREAL', geo: 'MX', dailyBudget: 9000, region: 'NACIONAL' },
  { id: 1012, channel: 'Google Ads', type: 'SEARCH', name: 'LALA How You Wanna - US Hispanic Search', brand: 'LALA', geo: 'US_HISPANIC', dailyBudget: 8000, region: 'US_LA' },

  // ========== META ADS (11) ==========
  { id: 2001, channel: 'Meta Ads', type: 'CONVERSIONS', name: 'Leche Fresca Lala - El Verdadero Sabor', brand: 'LALA', geo: 'MX', dailyBudget: 28000, region: 'CENTRO' },
  { id: 2002, channel: 'Meta Ads', type: 'CONVERSIONS', name: 'Yomi Sabores - Conversiones IG', brand: 'YOMI', geo: 'MX', dailyBudget: 14000, region: 'NACIONAL' },
  { id: 2003, channel: 'Meta Ads', type: 'AWARENESS', name: 'LALA 100 - Vive Sin Límites Awareness', brand: 'LALA100', geo: 'MX', dailyBudget: 22000, region: 'NACIONAL' },
  { id: 2004, channel: 'Meta Ads', type: 'CONVERSIONS', name: 'Siluett Light - IG Stories Mujeres 25-45', brand: 'SILUETT', geo: 'MX', dailyBudget: 11000, region: 'CENTRO' },
  { id: 2005, channel: 'Meta Ads', type: 'AWARENESS', name: 'Lala Día de las Madres 2026', brand: 'LALA', geo: 'MX', dailyBudget: 35000, region: 'NACIONAL' },
  { id: 2006, channel: 'Meta Ads', type: 'TRAFFIC', name: 'Nutri Familia - Energía para tu Día', brand: 'NUTRI', geo: 'MX', dailyBudget: 13000, region: 'BAJIO' },
  { id: 2007, channel: 'Meta Ads', type: 'CATALOG_SALES', name: 'Lala E-commerce Catalog Walmart', brand: 'LALA', geo: 'MX', dailyBudget: 20000, region: 'NACIONAL' },
  { id: 2008, channel: 'Meta Ads', type: 'ENGAGEMENT', name: 'La Neta Lala - Reels Engagement', brand: 'LALA', geo: 'MX', dailyBudget: 18000, region: 'NACIONAL' },
  { id: 2009, channel: 'Meta Ads', type: 'ENGAGEMENT', name: 'Boreal Comunidad Mamás FB Group', brand: 'BOREAL', geo: 'MX', dailyBudget: 7000, region: 'NACIONAL' },
  { id: 2010, channel: 'Meta Ads', type: 'TRAFFIC', name: 'Volcanes Tradición - Crema y Mantequilla', brand: 'VOLCANES', geo: 'MX', dailyBudget: 6500, region: 'OCCIDENTE' },
  { id: 2011, channel: 'Meta Ads', type: 'CONVERSIONS', name: 'LALA How You Wanna - US Hispanic Meta', brand: 'LALA', geo: 'US_HISPANIC', dailyBudget: 12000, region: 'US_LA' },

  // ========== TIKTOK ADS (6) ==========
  { id: 3001, channel: 'TikTok Ads', type: 'REELS_SPARK', name: 'Yomi Niños - #YomiDance Challenge', brand: 'YOMI', geo: 'MX', dailyBudget: 14000, region: 'NACIONAL' },
  { id: 3002, channel: 'TikTok Ads', type: 'IN_FEED', name: 'LALA 100 - Vive Sin Límites TikTok', brand: 'LALA100', geo: 'MX', dailyBudget: 16000, region: 'NACIONAL' },
  { id: 3003, channel: 'TikTok Ads', type: 'SPARK_AD', name: 'Siluett Light - Mujeres 25-40 Fitness', brand: 'SILUETT', geo: 'MX', dailyBudget: 9000, region: 'CENTRO' },
  { id: 3004, channel: 'TikTok Ads', type: 'BRAND_TAKEOVER', name: 'La Neta Lala - Chayanne TikTok Edit', brand: 'LALA', geo: 'MX', dailyBudget: 32000, region: 'NACIONAL' },
  { id: 3005, channel: 'TikTok Ads', type: 'HASHTAG_CHALLENGE', name: 'Yomi Sabores - #YomiSaboreaLaVida', brand: 'YOMI', geo: 'MX', dailyBudget: 11000, region: 'NACIONAL' },
  { id: 3006, channel: 'TikTok Ads', type: 'IN_FEED', name: 'LALA How You Wanna - US Hispanic TikTok', brand: 'LALA', geo: 'US_HISPANIC', dailyBudget: 10000, region: 'US_LA' },

  // ========== INFLUENCER MARKETING (5) ==========
  { id: 4001, channel: 'Influencer Marketing', type: 'MACRO', name: 'Boreal - Mamás Primerizas (5 macro-influencers)', brand: 'BOREAL', geo: 'MX', dailyBudget: 18000, region: 'NACIONAL' },
  { id: 4002, channel: 'Influencer Marketing', type: 'MICRO', name: 'Yomi - Micro-Mamás Niños (20 micro)', brand: 'YOMI', geo: 'MX', dailyBudget: 12000, region: 'NACIONAL' },
  { id: 4003, channel: 'Influencer Marketing', type: 'MACRO', name: 'Siluett Fitness - 3 Fitness Influencers', brand: 'SILUETT', geo: 'MX', dailyBudget: 9500, region: 'CENTRO' },
  { id: 4004, channel: 'Influencer Marketing', type: 'CELEBRITY', name: 'Chayanne - La Neta Lala Embajador', brand: 'LALA', geo: 'MX', dailyBudget: 38000, region: 'NACIONAL' },
  { id: 4005, channel: 'Influencer Marketing', type: 'FOODIE', name: 'LALA Recetas - 8 Food Creators', brand: 'LALA', geo: 'MX', dailyBudget: 7500, region: 'NACIONAL' },
];

// ============================================================
// HELPERS
// ============================================================

function rnd(min, max) {
  return min + Math.random() * (max - min);
}

function rndInt(min, max) {
  return Math.floor(rnd(min, max + 1));
}

function dayOfWeekFactor(date) {
  // Weekend boost for CPG (people shop weekends), midweek slight dip
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return 1.15;
  if (dow === 1) return 0.92;
  return 1.0;
}

function seasonalFactor(date) {
  // Q1 ramp: Jan slow (post-holiday), Feb pickup (Valentine's), March stronger
  const m = date.getMonth();
  if (m === 0) return 0.85;       // January
  if (m === 1) return 1.05;       // February (Valentine's bump)
  if (m === 2) return 1.10;       // March
  return 1.0;
}

function valentinesBoost(date) {
  // Feb 10-14: Valentine's day digital push
  const d = date.toISOString().slice(5, 10);
  if (d >= '02-10' && d <= '02-14') return 1.25;
  return 1.0;
}

function generateDates(start, end) {
  const dates = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

// Channel-specific KPI ranges
function generateMetrics(campaign, date) {
  const sf = seasonalFactor(date) * dayOfWeekFactor(date) * valentinesBoost(date);
  const baseBudget = campaign.dailyBudget * sf * rnd(0.85, 1.15);
  const spend = Math.round(baseBudget * rnd(0.92, 1.05));

  let cpm, ctr, convRate, aov;

  if (campaign.channel === 'Google Ads') {
    if (campaign.type === 'SEARCH') {
      cpm = rnd(180, 320);
      ctr = rnd(4.5, 7.5);
      convRate = rnd(3.5, 6.0);
      aov = rnd(380, 680);
    } else if (campaign.type === 'SHOPPING') {
      cpm = rnd(80, 160);
      ctr = rnd(1.2, 2.8);
      convRate = rnd(2.5, 4.5);
      aov = rnd(450, 820);
    } else { // VIDEO (YouTube)
      cpm = rnd(35, 90);
      ctr = rnd(0.3, 0.9);
      convRate = rnd(0.6, 1.6);
      aov = rnd(280, 480);
    }
  } else if (campaign.channel === 'Meta Ads') {
    if (campaign.type === 'CONVERSIONS' || campaign.type === 'CATALOG_SALES') {
      cpm = rnd(80, 180);
      ctr = rnd(1.0, 2.4);
      convRate = rnd(2.0, 4.0);
      aov = rnd(380, 680);
    } else if (campaign.type === 'AWARENESS') {
      cpm = rnd(45, 110);
      ctr = rnd(0.6, 1.4);
      convRate = rnd(0.4, 1.2);
      aov = rnd(280, 460);
    } else { // TRAFFIC, ENGAGEMENT
      cpm = rnd(60, 140);
      ctr = rnd(1.2, 3.0);
      convRate = rnd(1.0, 2.5);
      aov = rnd(320, 540);
    }
  } else if (campaign.channel === 'TikTok Ads') {
    if (campaign.type === 'BRAND_TAKEOVER' || campaign.type === 'HASHTAG_CHALLENGE') {
      cpm = rnd(30, 70);
      ctr = rnd(1.4, 3.2);
      convRate = rnd(0.6, 1.6);
      aov = rnd(280, 480);
    } else if (campaign.type === 'SPARK_AD' || campaign.type === 'REELS_SPARK') {
      cpm = rnd(40, 95);
      ctr = rnd(1.8, 4.0);
      convRate = rnd(1.2, 2.8);
      aov = rnd(320, 520);
    } else { // IN_FEED
      cpm = rnd(50, 110);
      ctr = rnd(1.2, 2.6);
      convRate = rnd(1.5, 3.2);
      aov = rnd(340, 560);
    }
  } else { // Influencer Marketing (organic-style reach, promo-code conversions)
    if (campaign.type === 'CELEBRITY') {
      cpm = rnd(120, 220);
      ctr = rnd(0.3, 0.8);
      convRate = rnd(2.5, 4.5);
      aov = rnd(420, 680);
    } else if (campaign.type === 'MACRO') {
      cpm = rnd(80, 160);
      ctr = rnd(0.5, 1.2);
      convRate = rnd(1.8, 3.6);
      aov = rnd(380, 580);
    } else if (campaign.type === 'MICRO') {
      cpm = rnd(40, 95);
      ctr = rnd(1.0, 2.4);
      convRate = rnd(3.0, 5.5); // High trust → high conversion via promo code
      aov = rnd(340, 540);
    } else { // FOODIE
      cpm = rnd(55, 120);
      ctr = rnd(0.8, 1.8);
      convRate = rnd(2.0, 4.0);
      aov = rnd(360, 580);
    }
  }

  const impressions = Math.round((spend / cpm) * 1000);
  const clicks = Math.round(impressions * (ctr / 100));
  const conversions = Math.round(clicks * (convRate / 100));
  const conversionValue = Math.round(conversions * aov);

  return { spend, impressions, clicks, conversions, conversionValue };
}

// ============================================================
// MAIN
// ============================================================

async function run() {
  const conn = getConnection();
  await connect(conn);
  console.log(`Connected. Building ${SCHEMA} schema...\n`);

  // ============================================================
  // CREATE SCHEMA
  // ============================================================
  await query(conn, `CREATE SCHEMA IF NOT EXISTS CAA_DB.${SCHEMA}`);
  console.log(`Schema ${SCHEMA} ready`);

  // ============================================================
  // GENERATE CAMPAIGN_DAILY (the source-of-truth fact table)
  // ============================================================
  console.log('\n--- Generating CAMPAIGN_DAILY ---');
  const dates = generateDates('2026-01-01', '2026-03-31');
  const campaignDailyRows = [];

  for (const campaign of CAMPAIGNS) {
    for (const date of dates) {
      const metrics = generateMetrics(campaign, date);
      const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions * 100).toFixed(2) : 0;
      const cpc = metrics.clicks > 0 ? (metrics.spend / metrics.clicks).toFixed(2) : 0;
      const cpa = metrics.conversions > 0 ? (metrics.spend / metrics.conversions).toFixed(2) : 0;
      const roas = metrics.spend > 0 ? (metrics.conversionValue / metrics.spend).toFixed(2) : 0;
      campaignDailyRows.push([
        fmtDate(date),
        campaign.channel,
        campaign.id,
        campaign.name,
        campaign.type,
        campaign.geo,
        campaign.dailyBudget,
        metrics.impressions,
        metrics.clicks,
        metrics.spend,
        metrics.conversions,
        metrics.conversionValue,
        parseFloat(ctr),
        parseFloat(cpc),
        parseFloat(cpa),
        parseFloat(roas),
      ]);
    }
  }

  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.CAMPAIGN_DAILY (
    DATE DATE, CHANNEL TEXT, CAMPAIGN_ID NUMBER, CAMPAIGN_NAME TEXT, CAMPAIGN_TYPE TEXT,
    GEO TEXT, DAILY_BUDGET FLOAT,
    IMPRESSIONS NUMBER, CLICKS NUMBER, SPEND FLOAT,
    CONVERSIONS NUMBER, CONVERSION_VALUE FLOAT,
    CTR_PCT FLOAT, AVG_CPC FLOAT, CPA FLOAT, ROAS FLOAT
  )`);

  await batchInsert(conn, `${SCHEMA}.CAMPAIGN_DAILY`,
    ['DATE', 'CHANNEL', 'CAMPAIGN_ID', 'CAMPAIGN_NAME', 'CAMPAIGN_TYPE', 'GEO', 'DAILY_BUDGET',
     'IMPRESSIONS', 'CLICKS', 'SPEND', 'CONVERSIONS', 'CONVERSION_VALUE',
     'CTR_PCT', 'AVG_CPC', 'CPA', 'ROAS'],
    campaignDailyRows);

  // ============================================================
  // DERIVED TABLES (CTAS from CAMPAIGN_DAILY)
  // ============================================================
  console.log('\n--- Deriving aggregated tables ---');

  console.log('Creating CHANNEL_DAILY...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.CHANNEL_DAILY AS
    SELECT
      DATE, CHANNEL,
      SUM(IMPRESSIONS) AS IMPRESSIONS, SUM(CLICKS) AS CLICKS, SUM(SPEND) AS SPEND,
      SUM(CONVERSIONS) AS CONVERSIONS, SUM(CONVERSION_VALUE) AS CONVERSION_VALUE,
      ROUND(SUM(CLICKS) / NULLIF(SUM(IMPRESSIONS), 0) * 100, 2) AS CTR_PCT,
      ROUND(SUM(SPEND) / NULLIF(SUM(CLICKS), 0), 2) AS AVG_CPC,
      ROUND(SUM(SPEND) / NULLIF(SUM(CONVERSIONS), 0), 2) AS CPA,
      ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS ROAS,
      SUM(DAILY_BUDGET) AS TOTAL_DAILY_BUDGET,
      ROUND(SUM(SPEND) / NULLIF(SUM(DAILY_BUDGET), 0) * 100, 2) AS BUDGET_UTILIZATION_PCT
    FROM ${SCHEMA}.CAMPAIGN_DAILY
    GROUP BY DATE, CHANNEL`);

  console.log('Creating WEEKLY_TRENDS...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.WEEKLY_TRENDS AS
    SELECT
      DATE_TRUNC('WEEK', DATE) AS WEEK_START, CHANNEL,
      SUM(IMPRESSIONS) AS IMPRESSIONS, SUM(CLICKS) AS CLICKS, SUM(SPEND) AS SPEND,
      SUM(CONVERSIONS) AS CONVERSIONS, SUM(CONVERSION_VALUE) AS CONVERSION_VALUE,
      ROUND(SUM(CLICKS) / NULLIF(SUM(IMPRESSIONS), 0) * 100, 2) AS CTR_PCT,
      ROUND(SUM(SPEND) / NULLIF(SUM(CLICKS), 0), 2) AS AVG_CPC,
      ROUND(SUM(SPEND) / NULLIF(SUM(CONVERSIONS), 0), 2) AS CPA,
      ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS ROAS,
      LAG(SUM(SPEND)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('WEEK', DATE)) AS PREV_WEEK_SPEND,
      LAG(SUM(CONVERSIONS)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('WEEK', DATE)) AS PREV_WEEK_CONVERSIONS,
      ROUND((SUM(SPEND) - LAG(SUM(SPEND)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('WEEK', DATE)))
        / NULLIF(LAG(SUM(SPEND)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('WEEK', DATE)), 0) * 100, 1) AS SPEND_WOW_CHANGE_PCT,
      ROUND((SUM(CONVERSIONS) - LAG(SUM(CONVERSIONS)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('WEEK', DATE)))
        / NULLIF(LAG(SUM(CONVERSIONS)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('WEEK', DATE)), 0) * 100, 1) AS CONVERSIONS_WOW_CHANGE_PCT
    FROM ${SCHEMA}.CAMPAIGN_DAILY
    GROUP BY DATE_TRUNC('WEEK', DATE), CHANNEL`);

  console.log('Creating MONTHLY_SUMMARY...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.MONTHLY_SUMMARY AS
    SELECT
      DATE_TRUNC('MONTH', DATE) AS MONTH, CHANNEL,
      SUM(IMPRESSIONS) AS IMPRESSIONS, SUM(CLICKS) AS CLICKS, SUM(SPEND) AS SPEND,
      SUM(CONVERSIONS) AS CONVERSIONS, SUM(CONVERSION_VALUE) AS CONVERSION_VALUE,
      ROUND(SUM(CLICKS) / NULLIF(SUM(IMPRESSIONS), 0) * 100, 2) AS CTR_PCT,
      ROUND(SUM(SPEND) / NULLIF(SUM(CLICKS), 0), 2) AS AVG_CPC,
      ROUND(SUM(SPEND) / NULLIF(SUM(CONVERSIONS), 0), 2) AS CPA,
      ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS ROAS,
      LAG(SUM(SPEND)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('MONTH', DATE)) AS PREV_MONTH_SPEND,
      LAG(SUM(CONVERSIONS)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('MONTH', DATE)) AS PREV_MONTH_CONVERSIONS,
      LAG(ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('MONTH', DATE)) AS PREV_MONTH_ROAS,
      ROUND((SUM(SPEND) - LAG(SUM(SPEND)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('MONTH', DATE)))
        / NULLIF(LAG(SUM(SPEND)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('MONTH', DATE)), 0) * 100, 1) AS SPEND_MOM_CHANGE_PCT,
      ROUND((SUM(CONVERSIONS) - LAG(SUM(CONVERSIONS)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('MONTH', DATE)))
        / NULLIF(LAG(SUM(CONVERSIONS)) OVER (PARTITION BY CHANNEL ORDER BY DATE_TRUNC('MONTH', DATE)), 0) * 100, 1) AS CONVERSIONS_MOM_CHANGE_PCT
    FROM ${SCHEMA}.CAMPAIGN_DAILY
    GROUP BY DATE_TRUNC('MONTH', DATE), CHANNEL`);

  console.log('Creating CAMPAIGN_RANKING...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.CAMPAIGN_RANKING AS
    WITH campaign_metrics AS (
      SELECT
        CHANNEL, CAMPAIGN_ID, CAMPAIGN_NAME, CAMPAIGN_TYPE, GEO,
        DATE_TRUNC('MONTH', DATE) AS MONTH,
        SUM(SPEND) AS SPEND, SUM(CONVERSIONS) AS CONVERSIONS,
        SUM(CONVERSION_VALUE) AS CONVERSION_VALUE,
        SUM(IMPRESSIONS) AS IMPRESSIONS, SUM(CLICKS) AS CLICKS,
        ROUND(SUM(SPEND) / NULLIF(SUM(CONVERSIONS), 0), 2) AS CPA,
        ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS ROAS
      FROM ${SCHEMA}.CAMPAIGN_DAILY
      GROUP BY CHANNEL, CAMPAIGN_ID, CAMPAIGN_NAME, CAMPAIGN_TYPE, GEO, DATE_TRUNC('MONTH', DATE)
    )
    SELECT *,
      RANK() OVER (PARTITION BY MONTH, CHANNEL ORDER BY ROAS DESC) AS ROAS_RANK,
      RANK() OVER (PARTITION BY MONTH, CHANNEL ORDER BY CONVERSIONS DESC) AS CONVERSIONS_RANK,
      LAG(SPEND) OVER (PARTITION BY CAMPAIGN_ID ORDER BY MONTH) AS PREV_MONTH_SPEND,
      LAG(CONVERSIONS) OVER (PARTITION BY CAMPAIGN_ID ORDER BY MONTH) AS PREV_MONTH_CONVERSIONS,
      LAG(ROAS) OVER (PARTITION BY CAMPAIGN_ID ORDER BY MONTH) AS PREV_MONTH_ROAS
    FROM campaign_metrics`);

  console.log('Creating BUDGET_PACING...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.BUDGET_PACING AS
    WITH daily_spend AS (
      SELECT DATE, CHANNEL, CAMPAIGN_ID, CAMPAIGN_NAME, DAILY_BUDGET, SPEND
      FROM ${SCHEMA}.CAMPAIGN_DAILY
    ),
    monthly_pacing AS (
      SELECT
        DATE_TRUNC('MONTH', DATE) AS MONTH,
        CHANNEL, CAMPAIGN_ID, CAMPAIGN_NAME,
        AVG(DAILY_BUDGET) AS AVG_DAILY_BUDGET,
        AVG(DAILY_BUDGET) * DAY(LAST_DAY(DATE)) AS MONTHLY_BUDGET,
        SUM(SPEND) AS MONTHLY_SPEND,
        COUNT(DISTINCT DATE) AS DAYS_ACTIVE,
        DAY(LAST_DAY(DATE)) AS DAYS_IN_MONTH
      FROM daily_spend
      GROUP BY DATE_TRUNC('MONTH', DATE), CHANNEL, CAMPAIGN_ID, CAMPAIGN_NAME, LAST_DAY(DATE)
    )
    SELECT *,
      ROUND(MONTHLY_SPEND / NULLIF(MONTHLY_BUDGET, 0) * 100, 1) AS BUDGET_UTILIZATION_PCT,
      ROUND(MONTHLY_BUDGET - MONTHLY_SPEND, 2) AS REMAINING_BUDGET,
      CASE
        WHEN MONTHLY_SPEND / NULLIF(MONTHLY_BUDGET, 0) > 1.1 THEN 'OVERSPENDING'
        WHEN MONTHLY_SPEND / NULLIF(MONTHLY_BUDGET, 0) > 0.9 THEN 'ON_TRACK'
        WHEN MONTHLY_SPEND / NULLIF(MONTHLY_BUDGET, 0) > 0.7 THEN 'UNDERSPENDING'
        ELSE 'SEVERELY_UNDER'
      END AS PACING_STATUS
    FROM monthly_pacing`);

  console.log('Creating FUNNEL...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.FUNNEL AS
    SELECT
      DATE_TRUNC('MONTH', DATE) AS MONTH, CHANNEL,
      SUM(IMPRESSIONS) AS TOTAL_IMPRESSIONS, SUM(CLICKS) AS TOTAL_CLICKS,
      SUM(CONVERSIONS) AS TOTAL_CONVERSIONS, SUM(CONVERSION_VALUE) AS TOTAL_VALUE,
      ROUND(SUM(CLICKS) / NULLIF(SUM(IMPRESSIONS), 0) * 100, 2) AS IMPRESSION_TO_CLICK_PCT,
      ROUND(SUM(CONVERSIONS) / NULLIF(SUM(CLICKS), 0) * 100, 2) AS CLICK_TO_CONVERSION_PCT,
      ROUND(SUM(CONVERSIONS) / NULLIF(SUM(IMPRESSIONS), 0) * 100, 4) AS IMPRESSION_TO_CONVERSION_PCT,
      ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(CONVERSIONS), 0), 2) AS AVG_ORDER_VALUE
    FROM ${SCHEMA}.CAMPAIGN_DAILY
    GROUP BY DATE_TRUNC('MONTH', DATE), CHANNEL`);

  console.log('Creating FORECAST_BASE...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.FORECAST_BASE AS
    SELECT
      DATE, CHANNEL,
      SUM(SPEND) AS SPEND, SUM(CONVERSIONS) AS CONVERSIONS,
      SUM(CONVERSION_VALUE) AS REVENUE,
      ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS ROAS,
      DAYOFWEEK(DATE) AS DAY_OF_WEEK, DAYOFMONTH(DATE) AS DAY_OF_MONTH,
      MONTH(DATE) AS MONTH_NUM, WEEKOFYEAR(DATE) AS WEEK_NUM,
      ROUND(AVG(SUM(SPEND)) OVER (PARTITION BY CHANNEL ORDER BY DATE ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS SPEND_7D_AVG,
      ROUND(AVG(SUM(CONVERSIONS)) OVER (PARTITION BY CHANNEL ORDER BY DATE ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS CONVERSIONS_7D_AVG,
      ROUND(AVG(SUM(CONVERSION_VALUE)) OVER (PARTITION BY CHANNEL ORDER BY DATE ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS REVENUE_7D_AVG
    FROM ${SCHEMA}.CAMPAIGN_DAILY
    GROUP BY DATE, CHANNEL`);

  console.log('Creating EXECUTIVE_KPI...');
  // Use March 2026 as "current month" since data ends 2026-03-31
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.EXECUTIVE_KPI AS
    WITH current_month AS (
      SELECT
        SUM(SPEND) AS SPEND, SUM(CONVERSIONS) AS CONVERSIONS,
        SUM(CONVERSION_VALUE) AS REVENUE,
        ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS ROAS,
        ROUND(SUM(SPEND) / NULLIF(SUM(CONVERSIONS), 0), 2) AS CPA,
        SUM(IMPRESSIONS) AS IMPRESSIONS, SUM(CLICKS) AS CLICKS
      FROM ${SCHEMA}.CAMPAIGN_DAILY
      WHERE DATE >= '2026-03-01' AND DATE <= '2026-03-31'
    ),
    prev_month AS (
      SELECT
        SUM(SPEND) AS SPEND, SUM(CONVERSIONS) AS CONVERSIONS,
        SUM(CONVERSION_VALUE) AS REVENUE,
        ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS ROAS,
        ROUND(SUM(SPEND) / NULLIF(SUM(CONVERSIONS), 0), 2) AS CPA
      FROM ${SCHEMA}.CAMPAIGN_DAILY
      WHERE DATE >= '2026-02-01' AND DATE <= '2026-02-28'
    )
    SELECT
      c.SPEND AS CURRENT_SPEND, c.CONVERSIONS AS CURRENT_CONVERSIONS,
      c.REVENUE AS CURRENT_REVENUE, c.ROAS AS CURRENT_ROAS, c.CPA AS CURRENT_CPA,
      c.IMPRESSIONS AS CURRENT_IMPRESSIONS, c.CLICKS AS CURRENT_CLICKS,
      p.SPEND AS PREV_SPEND, p.CONVERSIONS AS PREV_CONVERSIONS,
      p.REVENUE AS PREV_REVENUE, p.ROAS AS PREV_ROAS, p.CPA AS PREV_CPA,
      ROUND((c.SPEND - p.SPEND) / NULLIF(p.SPEND, 0) * 100, 1) AS SPEND_CHANGE_PCT,
      ROUND((c.CONVERSIONS - p.CONVERSIONS) / NULLIF(p.CONVERSIONS, 0) * 100, 1) AS CONVERSIONS_CHANGE_PCT,
      ROUND((c.REVENUE - p.REVENUE) / NULLIF(p.REVENUE, 0) * 100, 1) AS REVENUE_CHANGE_PCT
    FROM current_month c, prev_month p`);

  // ============================================================
  // BREAKDOWN TABLES (synthesized directly)
  // ============================================================
  console.log('\n--- Generating breakdown tables ---');

  console.log('Creating DEVICE_BREAKDOWN...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.DEVICE_BREAKDOWN (
    MONTH DATE, CHANNEL TEXT, DEVICE TEXT,
    IMPRESSIONS NUMBER, CLICKS NUMBER, SPEND FLOAT,
    CONVERSIONS NUMBER, CONVERSION_VALUE FLOAT,
    CPA FLOAT, ROAS FLOAT
  )`);
  const deviceRows = [];
  // CPG mobile-heavy: 65% mobile, 25% desktop, 10% tablet
  const deviceShares = { MOBILE: 0.68, DESKTOP: 0.22, TABLET: 0.10 };
  const channels = ['Google Ads', 'Meta Ads', 'TikTok Ads', 'Influencer Marketing'];
  const months = ['2026-01-01', '2026-02-01', '2026-03-01'];
  for (const month of months) {
    for (const channel of channels) {
      // Get monthly totals from CAMPAIGN_DAILY
      const totals = await query(conn, `
        SELECT SUM(IMPRESSIONS) AS I, SUM(CLICKS) AS C, SUM(SPEND) AS S,
               SUM(CONVERSIONS) AS CV, SUM(CONVERSION_VALUE) AS CRV
        FROM ${SCHEMA}.CAMPAIGN_DAILY
        WHERE CHANNEL = '${channel}' AND DATE_TRUNC('MONTH', DATE) = '${month}'`);
      const t = totals[0];
      for (const [device, share] of Object.entries(deviceShares)) {
        const imp = Math.round(t.I * share * rnd(0.9, 1.1));
        const clk = Math.round(t.C * share * rnd(0.9, 1.1));
        const spd = Math.round(t.S * share * rnd(0.9, 1.1));
        const cnv = Math.round(t.CV * share * rnd(0.9, 1.1));
        const crv = Math.round(t.CRV * share * rnd(0.9, 1.1));
        const cpa = cnv > 0 ? Math.round(spd / cnv * 100) / 100 : 0;
        const roas = spd > 0 ? Math.round(crv / spd * 100) / 100 : 0;
        deviceRows.push([month, channel, device, imp, clk, spd, cnv, crv, cpa, roas]);
      }
    }
  }
  await batchInsert(conn, `${SCHEMA}.DEVICE_BREAKDOWN`,
    ['MONTH', 'CHANNEL', 'DEVICE', 'IMPRESSIONS', 'CLICKS', 'SPEND', 'CONVERSIONS', 'CONVERSION_VALUE', 'CPA', 'ROAS'],
    deviceRows);

  console.log('Creating PLACEMENT_BREAKDOWN...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.PLACEMENT_BREAKDOWN (
    MONTH DATE, PUBLISHER_PLATFORM TEXT, PLACEMENT TEXT,
    IMPRESSIONS NUMBER, CLICKS NUMBER, SPEND FLOAT,
    CONVERSIONS NUMBER, CONVERSION_VALUE FLOAT,
    CTR_PCT FLOAT, CPM FLOAT, CPA FLOAT, ROAS FLOAT,
    REACH NUMBER, AVG_FREQUENCY FLOAT
  )`);
  const placementRows = [];
  const placements = [
    { platform: 'INSTAGRAM', placement: 'instagram_reels', share: 0.32 },
    { platform: 'INSTAGRAM', placement: 'instagram_stories', share: 0.18 },
    { platform: 'INSTAGRAM', placement: 'instagram_feed', share: 0.14 },
    { platform: 'FACEBOOK', placement: 'facebook_feed', share: 0.20 },
    { platform: 'FACEBOOK', placement: 'facebook_stories', share: 0.08 },
    { platform: 'FACEBOOK', placement: 'facebook_reels', share: 0.08 },
  ];
  for (const month of months) {
    const metaTotals = await query(conn, `
      SELECT SUM(IMPRESSIONS) AS I, SUM(CLICKS) AS C, SUM(SPEND) AS S,
             SUM(CONVERSIONS) AS CV, SUM(CONVERSION_VALUE) AS CRV
      FROM ${SCHEMA}.CAMPAIGN_DAILY
      WHERE CHANNEL = 'Meta Ads' AND DATE_TRUNC('MONTH', DATE) = '${month}'`);
    const m = metaTotals[0];
    for (const p of placements) {
      const imp = Math.round(m.I * p.share * rnd(0.9, 1.1));
      const clk = Math.round(m.C * p.share * rnd(0.9, 1.1));
      const spd = Math.round(m.S * p.share * rnd(0.9, 1.1));
      const cnv = Math.round(m.CV * p.share * rnd(0.9, 1.1));
      const crv = Math.round(m.CRV * p.share * rnd(0.9, 1.1));
      const ctr = imp > 0 ? Math.round(clk / imp * 10000) / 100 : 0;
      const cpm = imp > 0 ? Math.round(spd / imp * 100000) / 100 : 0;
      const cpa = cnv > 0 ? Math.round(spd / cnv * 100) / 100 : 0;
      const roas = spd > 0 ? Math.round(crv / spd * 100) / 100 : 0;
      const reach = Math.round(imp / rnd(2.4, 3.6));
      const freq = Math.round(imp / reach * 100) / 100;
      placementRows.push([month, p.platform, p.placement, imp, clk, spd, cnv, crv, ctr, cpm, cpa, roas, reach, freq]);
    }
  }
  await batchInsert(conn, `${SCHEMA}.PLACEMENT_BREAKDOWN`,
    ['MONTH', 'PUBLISHER_PLATFORM', 'PLACEMENT', 'IMPRESSIONS', 'CLICKS', 'SPEND', 'CONVERSIONS', 'CONVERSION_VALUE',
     'CTR_PCT', 'CPM', 'CPA', 'ROAS', 'REACH', 'AVG_FREQUENCY'],
    placementRows);

  console.log('Creating CREATIVE_PERFORMANCE...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.CREATIVE_PERFORMANCE (
    CAMPAIGN_NAME TEXT, ADSET_NAME TEXT, AD_NAME TEXT,
    CREATIVE_NAME TEXT, FORMAT TEXT, CALL_TO_ACTION TEXT, HEADLINE TEXT,
    IMPRESSIONS NUMBER, CLICKS NUMBER, SPEND FLOAT,
    CONVERSIONS NUMBER, CONVERSION_VALUE FLOAT,
    CTR_PCT FLOAT, CPA FLOAT, ROAS FLOAT
  )`);
  const creatives = [
    { camp: 'Leche Fresca Lala - El Verdadero Sabor', adset: 'Madres 28-45 Norte', ad: 'Reel_15s_v1', name: 'Leche Fresca Hero Reel', format: 'VIDEO', cta: 'COMPRAR', headline: 'El verdadero sabor de la leche, ahora más fresca' },
    { camp: 'Leche Fresca Lala - El Verdadero Sabor', adset: 'Madres 28-45 Centro', ad: 'Reel_15s_v2', name: 'Leche Fresca Familia', format: 'VIDEO', cta: 'COMPRAR', headline: 'Frescura que se siente en cada vaso' },
    { camp: 'La Neta Lala - Reels Engagement', adset: 'Adultos 25-55 Nacional', ad: 'Chayanne_Reel_30s', name: 'Chayanne La Neta', format: 'VIDEO', cta: 'VER MÁS', headline: 'La neta detrás de un vaso de Lala' },
    { camp: 'Yomi Sabores - Conversiones IG', adset: 'Mamás 25-40 Niños 4-10', ad: 'Yomi_Carousel_4SKU', name: 'Yomi 4 Sabores Carousel', format: 'CAROUSEL', cta: 'COMPRAR', headline: 'Diversión en cada sabor' },
    { camp: 'Yomi Sabores - Conversiones IG', adset: 'Mamás 25-40 Niños 4-10', ad: 'Yomi_Reel_BackToSchool', name: 'Yomi Regreso a Clases', format: 'VIDEO', cta: 'COMPRAR', headline: 'El yogurt que tus hijos piden' },
    { camp: 'LALA 100 - Vive Sin Límites Awareness', adset: 'Adultos 30-55 Premium', ad: 'LALA100_Hero_Image', name: 'LALA 100 Hero Bottle', format: 'IMAGE', cta: 'CONOCER MÁS', headline: '100% deslactosada, 100% proteína' },
    { camp: 'LALA 100 - Vive Sin Límites Awareness', adset: 'Adultos 30-55 Premium', ad: 'LALA100_Reel_Athletes', name: 'LALA 100 Atletas', format: 'VIDEO', cta: 'CONOCER MÁS', headline: 'Vive sin límites' },
    { camp: 'Siluett Light - IG Stories Mujeres 25-45', adset: 'Mujeres 25-45 Wellness', ad: 'Siluett_Story_Smoothie', name: 'Siluett Smoothie Story', format: 'IMAGE', cta: 'COMPRAR', headline: 'Tu mejor versión, cada mañana' },
    { camp: 'Lala Día de las Madres 2026', adset: 'Adultos 25-55 Nacional', ad: 'Madres_Hero_Reel', name: 'Día de las Madres Hero', format: 'VIDEO', cta: 'COMPRAR', headline: 'Para la mamá que da todo' },
    { camp: 'Boreal Comunidad Mamás FB Group', adset: 'Mamás Primerizas 22-32', ad: 'Boreal_Carousel_Etapas', name: 'Boreal Etapas 1-3 Carousel', format: 'CAROUSEL', cta: 'CONOCER MÁS', headline: 'Crecimiento saludable en cada etapa' },
    { camp: 'Volcanes Tradición - Crema y Mantequilla', adset: 'Adultos 35-65 Tradicional', ad: 'Volcanes_Image_Mesa', name: 'Volcanes Mesa Tradicional', format: 'IMAGE', cta: 'COMPRAR', headline: 'El sabor tradicional que recuerdas' },
    { camp: 'Lala E-commerce Catalog Walmart', adset: 'Compradores Walmart App', ad: 'Catalog_Dynamic_v3', name: 'Walmart Dynamic Catalog', format: 'CAROUSEL', cta: 'COMPRAR', headline: 'Tus productos Lala en Walmart' },
    { camp: 'La Neta Lala - Chayanne TikTok Edit', adset: 'Gen Z & Millennials Nacional', ad: 'Chayanne_TT_Spark_v1', name: 'Chayanne TikTok Edit', format: 'VIDEO', cta: 'VER MÁS', headline: 'La neta detrás de un vaso de Lala' },
    { camp: 'Yomi Niños - #YomiDance Challenge', adset: 'Niños 6-12 + Mamás', ad: 'Yomi_Dance_HashtagChallenge', name: 'Yomi Dance Challenge', format: 'VIDEO', cta: 'PARTICIPAR', headline: '¡Baila con Yomi y gana!' },
    { camp: 'LALA 100 - Vive Sin Límites TikTok', adset: 'Atletas amateurs 22-40', ad: 'LALA100_TT_Athletes', name: 'LALA 100 Atletas TikTok', format: 'VIDEO', cta: 'COMPRAR', headline: '100% proteína para superarte' },
    { camp: 'Boreal - Mamás Primerizas (5 macro-influencers)', adset: 'Macro Mamás 25-35', ad: 'Boreal_Influencer_Rutina', name: 'Boreal Rutina Mamá Influencer', format: 'VIDEO', cta: 'CONOCER MÁS', headline: 'La fórmula que las mamás eligen' },
    { camp: 'Chayanne - La Neta Lala Embajador', adset: 'Adultos 30-60 Premium', ad: 'Chayanne_Celebrity_LongForm', name: 'Chayanne Celebrity Embajador', format: 'VIDEO', cta: 'VER HISTORIA', headline: 'La neta que cambia generaciones' },
    { camp: 'LALA Recetas - 8 Food Creators', adset: 'Foodies & Home Cooks 28-50', ad: 'Foodie_Recetas_Carousel', name: 'LALA Recetas Foodies', format: 'CAROUSEL', cta: 'GUARDAR RECETA', headline: '8 recetas que tu familia va a amar' },
  ];
  const creativeRows = [];
  for (const c of creatives) {
    const imp = rndInt(180000, 1800000);
    const clk = Math.round(imp * rnd(0.008, 0.028));
    const spd = Math.round(imp / 1000 * rnd(80, 180));
    const cnv = Math.round(clk * rnd(0.008, 0.025));
    const crv = Math.round(cnv * rnd(180, 420));
    const ctr = Math.round(clk / imp * 10000) / 100;
    const cpa = cnv > 0 ? Math.round(spd / cnv * 100) / 100 : 0;
    const roas = spd > 0 ? Math.round(crv / spd * 100) / 100 : 0;
    creativeRows.push([c.camp, c.adset, c.ad, c.name, c.format, c.cta, c.headline, imp, clk, spd, cnv, crv, ctr, cpa, roas]);
  }
  await batchInsert(conn, `${SCHEMA}.CREATIVE_PERFORMANCE`,
    ['CAMPAIGN_NAME', 'ADSET_NAME', 'AD_NAME', 'CREATIVE_NAME', 'FORMAT', 'CALL_TO_ACTION', 'HEADLINE',
     'IMPRESSIONS', 'CLICKS', 'SPEND', 'CONVERSIONS', 'CONVERSION_VALUE', 'CTR_PCT', 'CPA', 'ROAS'],
    creativeRows);

  console.log('Creating KEYWORD_PERFORMANCE...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.KEYWORD_PERFORMANCE (
    CHANNEL TEXT, CAMPAIGN_NAME TEXT, AD_GROUP_NAME TEXT,
    KEYWORD TEXT, MATCH_TYPE TEXT,
    IMPRESSIONS NUMBER, CLICKS NUMBER, SPEND FLOAT,
    CONVERSIONS NUMBER, CONVERSION_VALUE FLOAT,
    CTR_PCT FLOAT, AVG_CPC FLOAT, CPA FLOAT, ROAS FLOAT
  )`);
  const keywords = [
    { ch: 'Google Ads', camp: 'Lala Marca - Branded MX', adg: 'Branded Core', kw: 'lala', mt: 'EXACT' },
    { ch: 'Google Ads', camp: 'Lala Marca - Branded MX', adg: 'Branded Core', kw: 'leche lala', mt: 'PHRASE' },
    { ch: 'Google Ads', camp: 'Lala Marca - Branded MX', adg: 'Branded Core', kw: 'lala leche entera', mt: 'EXACT' },
    { ch: 'Google Ads', camp: 'Lala Productos - Genéricos', adg: 'Leche Generica', kw: 'leche deslactosada', mt: 'PHRASE' },
    { ch: 'Google Ads', camp: 'Lala Productos - Genéricos', adg: 'Leche Generica', kw: 'leche entera 1 litro', mt: 'BROAD' },
    { ch: 'Google Ads', camp: 'Lala Productos - Genéricos', adg: 'Yogurt Generico', kw: 'yogurt natural', mt: 'PHRASE' },
    { ch: 'Google Ads', camp: 'Lala Productos - Genéricos', adg: 'Yogurt Generico', kw: 'yogurt griego', mt: 'BROAD' },
    { ch: 'Google Ads', camp: 'Nutri Leche - Familias', adg: 'Nutri Branded', kw: 'nutri leche', mt: 'EXACT' },
    { ch: 'Google Ads', camp: 'Nutri Leche - Familias', adg: 'Nutri Branded', kw: 'nutrileche', mt: 'EXACT' },
    { ch: 'Google Ads', camp: 'Boreal Fórmulas Infantiles', adg: 'Formula Infantil', kw: 'formula infantil', mt: 'PHRASE' },
    { ch: 'Google Ads', camp: 'Boreal Fórmulas Infantiles', adg: 'Formula Infantil', kw: 'leche para bebe', mt: 'BROAD' },
    { ch: 'Google Ads', camp: 'Boreal Fórmulas Infantiles', adg: 'Boreal Branded', kw: 'boreal etapa 2', mt: 'EXACT' },
    { ch: 'Google Ads', camp: 'LALA 100 Deslactosada Search', adg: 'Deslactosada', kw: 'leche sin lactosa', mt: 'PHRASE' },
    { ch: 'Google Ads', camp: 'LALA 100 Deslactosada Search', adg: 'Deslactosada', kw: 'lala 100', mt: 'EXACT' },
    { ch: 'Google Ads', camp: 'LALA 100 Deslactosada Search', adg: 'Deslactosada', kw: 'leche alta proteina', mt: 'BROAD' },
    { ch: 'Google Ads', camp: 'Lala Shopping - Walmart', adg: 'Shopping Lacteos', kw: 'queso oaxaca lala', mt: 'PHRASE' },
    { ch: 'Google Ads', camp: 'Lala Shopping - Walmart', adg: 'Shopping Lacteos', kw: 'crema lala', mt: 'EXACT' },
  ];
  const keywordRows = [];
  for (const k of keywords) {
    const imp = rndInt(8000, 250000);
    const ctr = rnd(3.5, 8.5);
    const clk = Math.round(imp * ctr / 100);
    const cpc = rnd(4, 22);
    const spd = Math.round(clk * cpc);
    const cr = rnd(2.5, 5.5);
    const cnv = Math.round(clk * cr / 100);
    const aov = rnd(200, 380);
    const crv = Math.round(cnv * aov);
    const cpa = cnv > 0 ? Math.round(spd / cnv * 100) / 100 : 0;
    const roas = spd > 0 ? Math.round(crv / spd * 100) / 100 : 0;
    keywordRows.push([k.ch, k.camp, k.adg, k.kw, k.mt, imp, clk, spd, cnv, crv, Math.round(ctr * 100) / 100, Math.round(cpc * 100) / 100, cpa, roas]);
  }
  await batchInsert(conn, `${SCHEMA}.KEYWORD_PERFORMANCE`,
    ['CHANNEL', 'CAMPAIGN_NAME', 'AD_GROUP_NAME', 'KEYWORD', 'MATCH_TYPE',
     'IMPRESSIONS', 'CLICKS', 'SPEND', 'CONVERSIONS', 'CONVERSION_VALUE',
     'CTR_PCT', 'AVG_CPC', 'CPA', 'ROAS'],
    keywordRows);

  console.log('Creating CHANGE_AUDIT...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.CHANGE_AUDIT (
    CHANGE_DATETIME TIMESTAMP_NTZ, CHANGE_DATE DATE, USER_EMAIL TEXT, PLATFORM TEXT,
    RESOURCE_TYPE TEXT, CHANGE_TYPE TEXT, CAMPAIGN_ID NUMBER,
    CHANGED_FIELD TEXT, OLD_VALUE TEXT, NEW_VALUE TEXT
  )`);
  const auditRows = [];
  const users = ['ilse.parra@lala.com.mx', 'javier.pejito@lala.com.mx', 'media.team@lala.com.mx', 'agency.kenmedia@kenmedia.mx'];
  const auditEvents = [
    { plat: 'google_ads', rt: 'CAMPAIGN', ct: 'BUDGET_INCREASE', cid: 1009, field: 'daily_budget', ov: '35000', nv: '45000' },
    { plat: 'google_ads', rt: 'CAMPAIGN', ct: 'STATUS_CHANGE', cid: 1010, field: 'status', ov: 'PAUSED', nv: 'ENABLED' },
    { plat: 'meta_ads', rt: 'CAMPAIGN', ct: 'BUDGET_INCREASE', cid: 2001, field: 'daily_budget', ov: '20000', nv: '28000' },
    { plat: 'meta_ads', rt: 'AD_SET', ct: 'TARGETING_UPDATE', cid: 2003, field: 'targeting_age', ov: '25-45', nv: '28-50' },
    { plat: 'meta_ads', rt: 'CAMPAIGN', ct: 'BUDGET_DECREASE', cid: 2010, field: 'daily_budget', ov: '8500', nv: '6500' },
    { plat: 'google_ads', rt: 'KEYWORD', ct: 'BID_INCREASE', cid: 1001, field: 'max_cpc', ov: '12', nv: '18' },
    { plat: 'meta_ads', rt: 'CREATIVE', ct: 'NEW_AD', cid: 2002, field: 'ad_name', ov: null, nv: 'Yomi_Reel_BackToSchool' },
    { plat: 'google_ads', rt: 'CAMPAIGN', ct: 'BUDGET_INCREASE', cid: 1006, field: 'daily_budget', ov: '20000', nv: '25000' },
    { plat: 'meta_ads', rt: 'CAMPAIGN', ct: 'NEW_CAMPAIGN', cid: 2005, field: 'name', ov: null, nv: 'Lala Día de las Madres 2026' },
    { plat: 'google_ads', rt: 'CAMPAIGN', ct: 'STATUS_CHANGE', cid: 1012, field: 'status', ov: 'ENABLED', nv: 'PAUSED' },
  ];
  for (const e of auditEvents) {
    const dayOffset = rndInt(0, 89);
    const date = new Date('2026-01-01');
    date.setDate(date.getDate() + dayOffset);
    const dt = `${fmtDate(date)} ${String(rndInt(8, 19)).padStart(2, '0')}:${String(rndInt(0, 59)).padStart(2, '0')}:${String(rndInt(0, 59)).padStart(2, '0')}`;
    auditRows.push([dt, fmtDate(date), users[rndInt(0, users.length - 1)], e.plat, e.rt, e.ct, e.cid, e.field, e.ov, e.nv]);
  }
  await batchInsert(conn, `${SCHEMA}.CHANGE_AUDIT`,
    ['CHANGE_DATETIME', 'CHANGE_DATE', 'USER_EMAIL', 'PLATFORM', 'RESOURCE_TYPE', 'CHANGE_TYPE', 'CAMPAIGN_ID',
     'CHANGED_FIELD', 'OLD_VALUE', 'NEW_VALUE'],
    auditRows);

  // ============================================================
  // GA4 (web analytics for lala.com.mx)
  // ============================================================
  console.log('\n--- Generating GA4 + SEO + CRM ---');

  console.log('Creating GA4_OVERVIEW...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.GA4_OVERVIEW (
    MONTH DATE, CHANNEL_GROUPING TEXT,
    SESSIONS NUMBER, ACTIVE_USERS NUMBER, ENGAGED_SESSIONS NUMBER,
    CONVERSIONS NUMBER, REVENUE FLOAT,
    ENGAGEMENT_RATE_PCT FLOAT, CONVERSION_RATE_PCT FLOAT,
    REVENUE_PER_SESSION FLOAT, AVG_SESSION_DURATION_SEC FLOAT
  )`);
  const channelGroupings = [
    { name: 'Paid Search', share: 0.18, convMult: 1.4 },
    { name: 'Paid Social', share: 0.32, convMult: 1.0 },
    { name: 'Organic Search', share: 0.22, convMult: 1.2 },
    { name: 'Direct', share: 0.14, convMult: 1.6 },
    { name: 'Referral', share: 0.08, convMult: 0.8 },
    { name: 'Email', share: 0.04, convMult: 1.8 },
    { name: 'Other', share: 0.02, convMult: 0.5 },
  ];
  const ga4Rows = [];
  const monthlyTotals = { '2026-01-01': 480000, '2026-02-01': 520000, '2026-03-01': 610000 };
  for (const month of months) {
    const total = monthlyTotals[month];
    for (const cg of channelGroupings) {
      const sessions = Math.round(total * cg.share * rnd(0.9, 1.1));
      const users = Math.round(sessions * 0.78);
      const engaged = Math.round(sessions * rnd(0.55, 0.72));
      const convs = Math.round(sessions * rnd(0.012, 0.035) * cg.convMult);
      const rev = Math.round(convs * rnd(280, 480));
      const er = Math.round(engaged / sessions * 10000) / 100;
      const cr = Math.round(convs / sessions * 10000) / 100;
      const rps = Math.round(rev / sessions * 100) / 100;
      const dur = Math.round(rnd(85, 220) * 10) / 10;
      ga4Rows.push([month, cg.name, sessions, users, engaged, convs, rev, er, cr, rps, dur]);
    }
  }
  await batchInsert(conn, `${SCHEMA}.GA4_OVERVIEW`,
    ['MONTH', 'CHANNEL_GROUPING', 'SESSIONS', 'ACTIVE_USERS', 'ENGAGED_SESSIONS', 'CONVERSIONS', 'REVENUE',
     'ENGAGEMENT_RATE_PCT', 'CONVERSION_RATE_PCT', 'REVENUE_PER_SESSION', 'AVG_SESSION_DURATION_SEC'],
    ga4Rows);

  console.log('Creating GA4_DAILY...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.GA4_DAILY (
    DATE DATE,
    SESSIONS NUMBER, ACTIVE_USERS NUMBER, ENGAGED_SESSIONS NUMBER,
    CONVERSIONS NUMBER, REVENUE FLOAT,
    ENGAGEMENT_RATE_PCT FLOAT, CONVERSION_RATE_PCT FLOAT
  )`);
  const ga4DailyRows = [];
  for (const date of dates) {
    const sf = seasonalFactor(date) * dayOfWeekFactor(date) * valentinesBoost(date);
    const baseDaily = 17000 * sf * rnd(0.85, 1.15);
    const sessions = Math.round(baseDaily);
    const users = Math.round(sessions * 0.78);
    const engaged = Math.round(sessions * rnd(0.58, 0.70));
    const convs = Math.round(sessions * rnd(0.018, 0.032));
    const rev = Math.round(convs * rnd(280, 460));
    const er = Math.round(engaged / sessions * 10000) / 100;
    const cr = Math.round(convs / sessions * 10000) / 100;
    ga4DailyRows.push([fmtDate(date), sessions, users, engaged, convs, rev, er, cr]);
  }
  await batchInsert(conn, `${SCHEMA}.GA4_DAILY`,
    ['DATE', 'SESSIONS', 'ACTIVE_USERS', 'ENGAGED_SESSIONS', 'CONVERSIONS', 'REVENUE',
     'ENGAGEMENT_RATE_PCT', 'CONVERSION_RATE_PCT'],
    ga4DailyRows);

  // ============================================================
  // SEO (Spanish queries for lala.com.mx)
  // ============================================================
  console.log('Creating SEO_PERFORMANCE...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.SEO_PERFORMANCE (
    MONTH DATE, QUERY TEXT,
    CLICKS NUMBER, IMPRESSIONS NUMBER, CTR_PCT FLOAT, AVG_POSITION FLOAT,
    PREV_MONTH_CLICKS NUMBER, PREV_MONTH_POSITION FLOAT
  )`);
  const seoQueries = [
    'lala', 'leche lala', 'productos lala', 'lala leche entera', 'lala 100',
    'leche deslactosada', 'leche sin lactosa', 'yogurt natural', 'yogurt griego',
    'nutri leche', 'nutrileche', 'leche para niños',
    'boreal etapa 1', 'boreal etapa 2', 'formula infantil',
    'queso oaxaca', 'queso manchego lala', 'crema lala', 'mantequilla lala',
    'yomi yogurt', 'yomi sabores', 'yogurt para niños',
    'siluett yogurt light', 'yogurt sin azucar',
    'leche fresca', 'leche fresca lala',
    'recetas con leche', 'beneficios de la leche', 'cuanta proteina tiene la leche',
    'lala mexico', 'grupo lala',
  ];
  const seoRows = [];
  for (const month of months) {
    for (const q of seoQueries) {
      // Branded queries get more volume + better position
      const isBranded = q.includes('lala') || q.includes('nutri') || q.includes('boreal') || q.includes('yomi') || q.includes('siluett');
      const imp = rndInt(isBranded ? 8000 : 1500, isBranded ? 80000 : 22000);
      const pos = isBranded ? rnd(1.0, 3.5) : rnd(4.0, 18.0);
      const ctrPct = pos < 3 ? rnd(15, 35) : pos < 6 ? rnd(6, 14) : rnd(1, 5);
      const clicks = Math.round(imp * ctrPct / 100);
      const prevClicks = Math.round(clicks * rnd(0.85, 1.05));
      const prevPos = Math.round((pos + rnd(-0.5, 0.8)) * 10) / 10;
      seoRows.push([month, q, clicks, imp, Math.round(ctrPct * 100) / 100, Math.round(pos * 10) / 10, prevClicks, prevPos]);
    }
  }
  await batchInsert(conn, `${SCHEMA}.SEO_PERFORMANCE`,
    ['MONTH', 'QUERY', 'CLICKS', 'IMPRESSIONS', 'CTR_PCT', 'AVG_POSITION', 'PREV_MONTH_CLICKS', 'PREV_MONTH_POSITION'],
    seoRows);

  console.log('Creating SEO_DAILY...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.SEO_DAILY (
    DATE DATE,
    CLICKS NUMBER, IMPRESSIONS NUMBER, CTR_PCT FLOAT, AVG_POSITION FLOAT
  )`);
  const seoDailyRows = [];
  for (const date of dates) {
    const sf = seasonalFactor(date) * dayOfWeekFactor(date);
    const imp = Math.round(420000 * sf * rnd(0.9, 1.1));
    const ctr = rnd(8, 14);
    const clk = Math.round(imp * ctr / 100);
    const pos = rnd(2.8, 4.2);
    seoDailyRows.push([fmtDate(date), clk, imp, Math.round(ctr * 100) / 100, Math.round(pos * 10) / 10]);
  }
  await batchInsert(conn, `${SCHEMA}.SEO_DAILY`,
    ['DATE', 'CLICKS', 'IMPRESSIONS', 'CTR_PCT', 'AVG_POSITION'],
    seoDailyRows);

  // ============================================================
  // CRM (B2B foodservice/wholesale pipeline)
  // ============================================================
  console.log('Creating CRM_PIPELINE...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.CRM_PIPELINE (
    STAGE TEXT, DEAL_STATUS TEXT, DEAL_SIZE TEXT,
    INDUSTRY TEXT, COUNTRY TEXT, LEAD_SOURCE TEXT,
    NUM_DEALS NUMBER, TOTAL_VALUE FLOAT, AVG_DEAL_SIZE FLOAT,
    AVG_PROBABILITY FLOAT, WEIGHTED_VALUE FLOAT
  )`);
  const stages = [
    { name: 'Prospecting', prob: 10, status: 'Open' },
    { name: 'Qualification', prob: 25, status: 'Open' },
    { name: 'Proposal', prob: 50, status: 'Open' },
    { name: 'Negotiation', prob: 75, status: 'Open' },
    { name: 'Closed Won', prob: 100, status: 'Won' },
    { name: 'Closed Lost', prob: 0, status: 'Lost' },
  ];
  const dealSizes = [
    { name: 'Small', avg: 180000, prob: 0.5 },        // MXN, foodservice independents
    { name: 'Medium', avg: 850000, prob: 0.3 },        // Regional chains
    { name: 'Large', avg: 3500000, prob: 0.15 },       // National chains
    { name: 'Enterprise', avg: 12000000, prob: 0.05 }, // Walmart/OXXO/Sams contracts
  ];
  const industries = ['Foodservice (Restaurants)', 'Hotels & Resorts', 'Schools & Education', 'Convenience Retail', 'Grocery Wholesale', 'Coffee Shops & Bakeries', 'Industrial Catering'];
  const leadSources = ['Trade Show', 'Inbound Web', 'Sales Outreach', 'Referral', 'Walmart Connect Partner', 'Industry Event', 'Cold Call'];
  const crmRows = [];
  for (const stage of stages) {
    for (const ds of dealSizes) {
      for (const ind of industries.slice(0, 4)) { // limit combinations
        for (const ls of leadSources.slice(0, 3)) {
          const numDeals = rndInt(1, stage.name === 'Closed Lost' ? 8 : (stage.name === 'Closed Won' ? 12 : 18));
          const total = numDeals * ds.avg * rnd(0.8, 1.2);
          const avgDeal = total / numDeals;
          const weighted = total * stage.prob / 100;
          crmRows.push([
            stage.name, stage.status, ds.name, ind, 'Mexico', ls,
            numDeals, Math.round(total), Math.round(avgDeal), stage.prob, Math.round(weighted)
          ]);
        }
      }
    }
  }
  await batchInsert(conn, `${SCHEMA}.CRM_PIPELINE`,
    ['STAGE', 'DEAL_STATUS', 'DEAL_SIZE', 'INDUSTRY', 'COUNTRY', 'LEAD_SOURCE',
     'NUM_DEALS', 'TOTAL_VALUE', 'AVG_DEAL_SIZE', 'AVG_PROBABILITY', 'WEIGHTED_VALUE'],
    crmRows);

  console.log('Creating CRM_LEAD_FUNNEL...');
  await query(conn, `CREATE OR REPLACE TABLE ${SCHEMA}.CRM_LEAD_FUNNEL (
    LEAD_SOURCE TEXT,
    TOTAL_LEADS NUMBER, QUALIFIED_LEADS NUMBER, CONVERTED_LEADS NUMBER,
    CONVERSION_RATE_PCT FLOAT
  )`);
  const leadFunnelRows = [];
  for (const ls of leadSources) {
    const total = rndInt(80, 420);
    const qualified = Math.round(total * rnd(0.35, 0.62));
    const converted = Math.round(qualified * rnd(0.18, 0.38));
    const cr = Math.round(converted / total * 10000) / 100;
    leadFunnelRows.push([ls, total, qualified, converted, cr]);
  }
  await batchInsert(conn, `${SCHEMA}.CRM_LEAD_FUNNEL`,
    ['LEAD_SOURCE', 'TOTAL_LEADS', 'QUALIFIED_LEADS', 'CONVERTED_LEADS', 'CONVERSION_RATE_PCT'],
    leadFunnelRows);

  conn.destroy();
  console.log(`\n${SCHEMA} schema fully built!`);
  console.log(`\nSummary:`);
  console.log(`  - ${campaignDailyRows.length} campaign-daily records`);
  console.log(`  - ${CAMPAIGNS.length} campaigns across 4 channels (Google Ads, Meta Ads, TikTok Ads, Influencer Marketing)`);
  console.log(`  - ${BRANDS.length} brand families`);
  console.log(`  - 90 days of data (2026-01-01 to 2026-03-31)`);
  console.log(`  - All amounts in MXN`);
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
