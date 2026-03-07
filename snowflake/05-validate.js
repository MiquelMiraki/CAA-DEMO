const { getConnection, connect, query } = require('./config');

async function run() {
  const conn = getConnection();
  await connect(conn);
  console.log('Connected. Running validation queries...\n');

  // 1. Row counts
  console.log('=== ROW COUNTS ===');
  const tables = [
    'BRONZE_V2.GOOGLE_ADS_PERFORMANCE', 'BRONZE_V2.META_ADS_PERFORMANCE', 'BRONZE_V2.BING_ADS_PERFORMANCE',
    'BRONZE_V2.GA4_EVENTS', 'BRONZE_V2.GSC_PERFORMANCE',
    'GOLD.CAMPAIGN_DAILY', 'GOLD.CHANNEL_DAILY', 'GOLD.WEEKLY_TRENDS', 'GOLD.MONTHLY_SUMMARY',
    'GOLD.CAMPAIGN_RANKING', 'GOLD.DEVICE_BREAKDOWN', 'GOLD.FUNNEL', 'GOLD.FORECAST_BASE',
    'GOLD.EXECUTIVE_KPI', 'GOLD.CREATIVE_PERFORMANCE', 'GOLD.KEYWORD_PERFORMANCE',
    'GOLD.BUDGET_PACING', 'GOLD.CHANGE_AUDIT', 'GOLD.GA4_OVERVIEW', 'GOLD.SEO_PERFORMANCE',
    'GOLD.CRM_PIPELINE', 'GOLD.CRM_LEAD_FUNNEL'
  ];
  for (const t of tables) {
    const r = await query(conn, `SELECT COUNT(*) AS CNT FROM ${t}`);
    console.log(`  ${t}: ${r[0].CNT} rows`);
  }

  // 2. Monthly summary — "How did this month compare to last?"
  console.log('\n=== MONTHLY SUMMARY (MoM comparison) ===');
  const monthly = await query(conn, `SELECT * FROM GOLD.MONTHLY_SUMMARY ORDER BY MONTH, CHANNEL`);
  monthly.forEach(r => console.log(`  ${r.MONTH} | ${r.CHANNEL} | Spend: $${r.SPEND} | Conv: ${r.CONVERSIONS} | ROAS: ${r.ROAS} | MoM Spend: ${r.SPEND_MOM_CHANGE_PCT}%`));

  // 3. Best campaigns by ROAS in March
  console.log('\n=== TOP 5 CAMPAIGNS BY ROAS (March 2026) ===');
  const top = await query(conn, `SELECT CHANNEL, CAMPAIGN_NAME, ROAS, CONVERSIONS, SPEND
    FROM GOLD.CAMPAIGN_RANKING WHERE MONTH = '2026-03-01' AND ROAS_RANK <= 5 ORDER BY ROAS DESC LIMIT 10`);
  top.forEach(r => console.log(`  ${r.CHANNEL} | ${r.CAMPAIGN_NAME} | ROAS: ${r.ROAS} | Conv: ${r.CONVERSIONS} | Spend: $${r.SPEND}`));

  // 4. Device breakdown
  console.log('\n=== DEVICE PERFORMANCE (Q1 Total) ===');
  const devices = await query(conn, `SELECT CHANNEL, DEVICE, SUM(SPEND) AS SPEND, SUM(CONVERSIONS) AS CONV,
    ROUND(SUM(CONVERSION_VALUE) / NULLIF(SUM(SPEND), 0), 2) AS ROAS
    FROM GOLD.DEVICE_BREAKDOWN GROUP BY CHANNEL, DEVICE ORDER BY CHANNEL, SPEND DESC`);
  devices.forEach(r => console.log(`  ${r.CHANNEL} | ${r.DEVICE} | Spend: $${r.SPEND} | Conv: ${r.CONV} | ROAS: ${r.ROAS}`));

  // 5. Funnel
  console.log('\n=== CONVERSION FUNNEL (per channel, Q1) ===');
  const funnel = await query(conn, `SELECT MONTH, CHANNEL, TOTAL_IMPRESSIONS, TOTAL_CLICKS, TOTAL_CONVERSIONS,
    IMPRESSION_TO_CLICK_PCT, CLICK_TO_CONVERSION_PCT, AVG_ORDER_VALUE
    FROM GOLD.FUNNEL ORDER BY MONTH, CHANNEL`);
  funnel.forEach(r => console.log(`  ${r.MONTH} | ${r.CHANNEL} | Imp: ${r.TOTAL_IMPRESSIONS} → Click: ${r.TOTAL_CLICKS} (${r.IMPRESSION_TO_CLICK_PCT}%) → Conv: ${r.TOTAL_CONVERSIONS} (${r.CLICK_TO_CONVERSION_PCT}%) | AOV: $${r.AVG_ORDER_VALUE}`));

  // 6. Executive KPI
  console.log('\n=== EXECUTIVE KPI (Current vs Previous Month) ===');
  const kpi = await query(conn, `SELECT * FROM GOLD.EXECUTIVE_KPI`);
  if (kpi.length > 0) {
    const k = kpi[0];
    console.log(`  Current Month: Spend $${k.CURRENT_SPEND} | Conv: ${k.CURRENT_CONVERSIONS} | Revenue: $${k.CURRENT_REVENUE} | ROAS: ${k.CURRENT_ROAS}`);
    console.log(`  Previous Month: Spend $${k.PREV_SPEND} | Conv: ${k.PREV_CONVERSIONS} | Revenue: $${k.PREV_REVENUE} | ROAS: ${k.PREV_ROAS}`);
    console.log(`  Changes: Spend ${k.SPEND_CHANGE_PCT}% | Conv ${k.CONVERSIONS_CHANGE_PCT}% | Revenue ${k.REVENUE_CHANGE_PCT}%`);
  }

  // 7. CRM Pipeline
  console.log('\n=== CRM PIPELINE ===');
  const pipe = await query(conn, `SELECT DEAL_STATUS, COUNT(*) AS DEALS, SUM(TOTAL_VALUE) AS VALUE
    FROM GOLD.CRM_PIPELINE GROUP BY DEAL_STATUS`);
  pipe.forEach(r => console.log(`  ${r.DEAL_STATUS}: ${r.DEALS} deals, $${r.VALUE} total`));

  // 8. Weekly trends sample
  console.log('\n=== WEEKLY TRENDS (last 4 weeks, Google Ads) ===');
  const weekly = await query(conn, `SELECT WEEK_START, SPEND, CONVERSIONS, ROAS, SPEND_WOW_CHANGE_PCT, CONVERSIONS_WOW_CHANGE_PCT
    FROM GOLD.WEEKLY_TRENDS WHERE CHANNEL = 'Google Ads' ORDER BY WEEK_START DESC LIMIT 4`);
  weekly.forEach(r => console.log(`  ${r.WEEK_START} | Spend: $${r.SPEND} (WoW: ${r.SPEND_WOW_CHANGE_PCT}%) | Conv: ${r.CONVERSIONS} (WoW: ${r.CONVERSIONS_WOW_CHANGE_PCT}%) | ROAS: ${r.ROAS}`));

  conn.destroy();
  console.log('\nValidation complete!');
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
