require('dotenv').config();
const snowflake = require('snowflake-sdk');

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
});

function query(sql) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    });
  });
}

async function check() {
  await new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });

  // Date ranges for performance tables
  console.log('=== DATE RANGES ===');
  const dateQueries = [
    ['SILVER.GOOGLE_ADS_PERFORMANCE', 'DATE'],
    ['SILVER.META_ADS_PERFORMANCE', 'DATE'],
    ['SILVER.BING_PERFORMANCE', 'DATE'],
    ['SILVER.GA4_SESSIONS', 'DATE'],
    ['SILVER.GSC_PERFORMANCE', 'DATE'],
  ];
  for (const [table, col] of dateQueries) {
    const r = await query(`SELECT MIN(${col}) as MIN_DATE, MAX(${col}) as MAX_DATE, COUNT(DISTINCT ${col}) as DISTINCT_DAYS FROM ${table}`);
    console.log(`${table}: ${r[0].MIN_DATE} → ${r[0].MAX_DATE} (${r[0].DISTINCT_DAYS} distinct days)`);
  }

  // Check distinct campaigns per platform
  console.log('\n=== DISTINCT CAMPAIGNS ===');
  const gads = await query(`SELECT COUNT(DISTINCT CAMPAIGN_ID) as cnt FROM SILVER.GOOGLE_ADS_CAMPAIGNS`);
  const meta = await query(`SELECT COUNT(DISTINCT CAMPAIGN_ID) as cnt FROM SILVER.META_ADS_CAMPAIGNS`);
  const bing = await query(`SELECT COUNT(DISTINCT CAMPAIGN_ID) as cnt FROM SILVER.BING_CAMPAIGNS`);
  console.log(`Google Ads: ${gads[0].CNT} campaigns`);
  console.log(`Meta Ads: ${meta[0].CNT} campaigns`);
  console.log(`Bing Ads: ${bing[0].CNT} campaigns`);

  // Check if performance data has enough granularity
  console.log('\n=== GOOGLE ADS PERFORMANCE SAMPLE ===');
  const gPerf = await query(`SELECT * FROM SILVER.GOOGLE_ADS_PERFORMANCE_ENRICHED LIMIT 5`);
  gPerf.forEach(r => console.log(JSON.stringify(r)));

  // Check Meta enriched
  console.log('\n=== META ADS PERFORMANCE SAMPLE ===');
  const mPerf = await query(`SELECT * FROM SILVER.META_ADS_PERFORMANCE_ENRICHED LIMIT 5`);
  mPerf.forEach(r => console.log(JSON.stringify(r)));

  // Check GA4 enriched
  console.log('\n=== GA4 SESSIONS ENRICHED SAMPLE ===');
  const ga4 = await query(`SELECT * FROM SILVER.GA4_SESSIONS_ENRICHED LIMIT 5`);
  ga4.forEach(r => console.log(JSON.stringify(r)));

  // Check Salesforce pipeline
  console.log('\n=== SF PIPELINE SAMPLE ===');
  const sfp = await query(`SELECT * FROM SILVER.SF_PIPELINE LIMIT 5`);
  sfp.forEach(r => console.log(JSON.stringify(r)));

  // Total spend per platform
  console.log('\n=== TOTAL SPEND PER PLATFORM ===');
  const spendG = await query(`SELECT SUM(SPEND) as TOTAL FROM SILVER.GOOGLE_ADS_PERFORMANCE`);
  const spendM = await query(`SELECT SUM(SPEND) as TOTAL FROM SILVER.META_ADS_PERFORMANCE`);
  const spendB = await query(`SELECT SUM(SPEND) as TOTAL FROM SILVER.BING_PERFORMANCE`);
  console.log(`Google Ads: $${spendG[0].TOTAL}`);
  console.log(`Meta Ads: $${spendM[0].TOTAL}`);
  console.log(`Bing Ads: $${spendB[0].TOTAL}`);

  connection.destroy();
  console.log('\nDone!');
}

check().catch(err => {
  console.error('Error:', err.message);
  connection.destroy();
  process.exit(1);
});
