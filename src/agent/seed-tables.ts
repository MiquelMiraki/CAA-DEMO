import { executeQuery } from './snowflake-client';

/**
 * Creates and populates ATTRIBUTION, CHANNEL_OVERLAP, and ALERTS tables
 * in Snowflake GOLD schema if they do not exist yet.
 */
export async function seedMissingTables(): Promise<void> {
  await seedAttribution();
  await seedChannelOverlap();
  await seedAlerts();
}

async function tableExists(tableName: string): Promise<boolean> {
  const db = process.env.SNOWFLAKE_DATABASE || 'CAA_DB';
  try {
    const result = await executeQuery(
      `SELECT COUNT(*) AS CNT FROM ${db}.INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'GOLD' AND TABLE_NAME = '${tableName}'`
    );
    return Number((result.rows[0] as any).CNT) > 0;
  } catch {
    return false;
  }
}

async function seedAttribution(): Promise<void> {
  if (await tableExists('ATTRIBUTION')) {
    console.log('[Seed] ATTRIBUTION already exists — skipping.');
    return;
  }
  console.log('[Seed] Creating and seeding GOLD.ATTRIBUTION...');

  await executeQuery(`
    CREATE TABLE GOLD.ATTRIBUTION (
      MONTH                   DATE,
      CHANNEL                 VARCHAR(50),
      FIRST_TOUCH_CONVERSIONS NUMBER(10,2),
      LAST_TOUCH_CONVERSIONS  NUMBER(10,2),
      LINEAR_CONVERSIONS      NUMBER(10,2),
      FIRST_TOUCH_REVENUE     NUMBER(14,2),
      LAST_TOUCH_REVENUE      NUMBER(14,2),
      LINEAR_REVENUE          NUMBER(14,2),
      ASSISTED_CONVERSIONS    NUMBER(10,2),
      TOTAL_TOUCHPOINTS       NUMBER(12,0)
    )
  `);

  // Data based on existing KPI numbers:
  // Jan 2026: 1880 total conv, €118K rev
  // Feb 2026: 2060 total conv, €130K rev
  // Mar 2026: 2092 total conv, €133K rev
  // Google ~50%, Meta ~33%, Bing ~17%
  // First-touch favors Google (awareness); last-touch favors Meta (closer)
  await executeQuery(`
    INSERT INTO GOLD.ATTRIBUTION VALUES
    -- January 2026
    ('2026-01-01', 'Google Ads',  564.0, 470.0, 470.0,  35240.0, 29375.0, 29375.0,  820.0, 128400),
    ('2026-01-01', 'Meta Ads',    376.0, 470.0, 376.0,  23500.0, 29375.0, 23500.0,  658.0,  94200),
    ('2026-01-01', 'Bing Ads',    188.0, 188.0, 188.0,  11750.0, 11750.0, 11750.0,  310.0,  51600),
    -- February 2026
    ('2026-02-01', 'Google Ads',  618.0, 515.0, 515.0,  38980.0, 32469.0, 32469.0,  900.0, 141600),
    ('2026-02-01', 'Meta Ads',    412.0, 515.0, 412.0,  25963.0, 32469.0, 25963.0,  720.0, 103600),
    ('2026-02-01', 'Bing Ads',    206.0, 206.0, 206.0,  12981.0, 12981.0, 12981.0,  340.0,  56800),
    -- March 2026
    ('2026-03-01', 'Google Ads',  627.6, 523.0, 523.0,  39538.0, 32948.0, 32948.0,  913.0, 143700),
    ('2026-03-01', 'Meta Ads',    418.4, 523.0, 418.4,  26359.0, 32948.0, 26359.0,  730.0, 105100),
    ('2026-03-01', 'Bing Ads',    209.2, 209.2, 209.2,  13178.0, 13178.0, 13178.0,  346.0,  57600)
  `);

  console.log('[Seed] ATTRIBUTION created and seeded.');
}

async function seedChannelOverlap(): Promise<void> {
  if (await tableExists('CHANNEL_OVERLAP')) {
    console.log('[Seed] CHANNEL_OVERLAP already exists — skipping.');
    return;
  }
  console.log('[Seed] Creating and seeding GOLD.CHANNEL_OVERLAP...');

  await executeQuery(`
    CREATE TABLE GOLD.CHANNEL_OVERLAP (
      MONTH            DATE,
      SOURCE_CHANNEL   VARCHAR(50),
      ASSIST_CHANNEL   VARCHAR(50),
      SHARED_CONVERSIONS NUMBER(10,2),
      SHARED_REVENUE     NUMBER(14,2)
    )
  `);

  await executeQuery(`
    INSERT INTO GOLD.CHANNEL_OVERLAP VALUES
    -- January 2026 (Google starts → Meta closes, etc.)
    ('2026-01-01', 'Google Ads', 'Meta Ads',  182.0, 11375.0),
    ('2026-01-01', 'Google Ads', 'Bing Ads',   94.0,  5875.0),
    ('2026-01-01', 'Meta Ads',   'Google Ads', 148.0,  9250.0),
    ('2026-01-01', 'Meta Ads',   'Bing Ads',    62.0,  3875.0),
    ('2026-01-01', 'Bing Ads',   'Google Ads',  56.0,  3500.0),
    ('2026-01-01', 'Bing Ads',   'Meta Ads',    38.0,  2375.0),
    -- February 2026
    ('2026-02-01', 'Google Ads', 'Meta Ads',  200.0, 12600.0),
    ('2026-02-01', 'Google Ads', 'Bing Ads',  103.0,  6490.0),
    ('2026-02-01', 'Meta Ads',   'Google Ads', 163.0, 10270.0),
    ('2026-02-01', 'Meta Ads',   'Bing Ads',    68.0,  4280.0),
    ('2026-02-01', 'Bing Ads',   'Google Ads',  62.0,  3905.0),
    ('2026-02-01', 'Bing Ads',   'Meta Ads',    42.0,  2645.0),
    -- March 2026
    ('2026-03-01', 'Google Ads', 'Meta Ads',  203.0, 12790.0),
    ('2026-03-01', 'Google Ads', 'Bing Ads',  105.0,  6615.0),
    ('2026-03-01', 'Meta Ads',   'Google Ads', 166.0, 10453.0),
    ('2026-03-01', 'Meta Ads',   'Bing Ads',    69.0,  4347.0),
    ('2026-03-01', 'Bing Ads',   'Google Ads',  63.0,  3969.0),
    ('2026-03-01', 'Bing Ads',   'Meta Ads',    43.0,  2709.0)
  `);

  console.log('[Seed] CHANNEL_OVERLAP created and seeded.');
}

async function seedAlerts(): Promise<void> {
  if (await tableExists('ALERTS')) {
    console.log('[Seed] ALERTS already exists — skipping.');
    return;
  }
  console.log('[Seed] Creating and seeding GOLD.ALERTS...');

  await executeQuery(`
    CREATE TABLE GOLD.ALERTS (
      ALERT_ID        VARCHAR(20) PRIMARY KEY,
      ALERT_DATETIME  TIMESTAMP,
      SEVERITY        VARCHAR(10),
      STATUS          VARCHAR(20),
      CHANNEL         VARCHAR(50),
      METRIC          VARCHAR(30),
      CAMPAIGN        VARCHAR(120),
      MESSAGE         VARCHAR(500),
      DIRECTION       VARCHAR(5),
      CHANGE_PCT      NUMBER(8,2),
      CURRENT_VALUE   NUMBER(14,4),
      BASELINE_VALUE  NUMBER(14,4)
    )
  `);

  await executeQuery(`
    INSERT INTO GOLD.ALERTS VALUES
    -- CRITICAL alerts
    ('ALT-001', '2026-03-07 09:14:00', 'critical', 'active',       'Google Ads', 'CPA',   'Brand - Search EU',           'Cost per acquisition has spiked 42% above the 7-day average, breaching the €35 CPA threshold. Investigate bid strategy and search term report.',   'up',   42.3,  49.80, 35.00),
    ('ALT-002', '2026-03-06 14:22:00', 'critical', 'active',       'Meta Ads',   'ROAS',  'Retargeting - DPA Catalogue',  'ROAS has dropped below 1.0x for the last 48 hours. Campaign is now unprofitable. Recommend pausing or refreshing creative assets.',            'down', 38.1,   0.82,  2.10),
    ('ALT-003', '2026-03-05 11:05:00', 'critical', 'acknowledged', 'Google Ads', 'SPEND', 'Performance Max - EU Markets', 'Daily budget exceeded by 67% on three consecutive days. Auto-bidding target may be too aggressive. Review budget caps and tROAS settings.', 'up',   67.2, 1672.00, 1000.00),
    ('ALT-004', '2026-03-04 08:30:00', 'critical', 'resolved',     'Bing Ads',   'CTR',   'Brand - Exact Match',          'Click-through rate collapsed 55% overnight. Possible ad disapproval or auction disruption. Review ad status in Microsoft Ads dashboard.',     'down', 55.4,   0.54,  1.21),
    ('ALT-005', '2026-02-28 16:45:00', 'critical', 'resolved',     'Meta Ads',   'SPEND', 'Prospecting - Lookalike 3%',   'Spend dropped to zero for 6 hours due to payment hold. Campaigns were automatically paused. Revenue impact estimated at €4,200.',           'down', 100.0,  0.00, 412.00),
    -- WARNING alerts
    ('ALT-006', '2026-03-07 12:00:00', 'warning', 'active',        'Google Ads', 'ROAS',  'Shopping - Top Products',      'ROAS has declined 18% over the past 7 days. Still above threshold but trending downward. Monitor closely and consider bid adjustments.',   'down', 18.2,   2.12,  2.58),
    ('ALT-007', '2026-03-07 08:00:00', 'warning', 'active',        'Meta Ads',   'CPC',   'Awareness - Video Views',      'Average CPC increased 25% compared to last week. Audience saturation may be occurring. Consider expanding lookalike seed audience.',        'up',   24.8,   1.24,  0.99),
    ('ALT-008', '2026-03-06 17:30:00', 'warning', 'active',        'Bing Ads',   'CPA',   'Non-Brand - Competitors',      'CPA is 28% above target threshold. Conversion rate has declined while CPCs remain stable. Review landing page performance.',               'up',   28.1,  38.40, 30.00),
    ('ALT-009', '2026-03-06 10:15:00', 'warning', 'acknowledged',  'Google Ads', 'CTR',   'Display - Remarketing',        'CTR dropped 22% after creative rotation. New banner set underperforming versus previous cycle. Recommend reverting to best-performing ad.', 'down', 22.3,   0.09,  0.12),
    ('ALT-010', '2026-03-05 15:00:00', 'warning', 'acknowledged',  'Meta Ads',   'ROAS',  'Conversion - Lead Gen',        'ROAS declined 15% this week. Lead quality may be degrading — cross-reference with CRM data to check close rates.',                          'down', 15.1,   1.98,  2.33),
    ('ALT-011', '2026-03-05 09:45:00', 'warning', 'resolved',      'Google Ads', 'SPEND', 'Branded - Mobile',             'Mobile spend share increased 35% unexpectedly. Verify device bid adjustments have not been overridden by Smart Bidding.',                  'up',   35.0, 642.00, 475.00),
    ('ALT-012', '2026-03-04 14:00:00', 'warning', 'resolved',      'Bing Ads',   'IMPRESSIONS', 'Generic - High Intent', 'Impression share dropped 31% following a competitor budget increase. Consider raising bids on top converting terms.',                      'down', 31.2, 48200.0, 70000.0),
    ('ALT-013', '2026-03-03 11:20:00', 'warning', 'active',        'Meta Ads',   'CPC',   'Retargeting - Cart Abandoners', 'CPC rose 20% as audience size shrinks. Remarketing pool may need refreshing. Review pixel event data.',                                  'up',   20.4,   1.68,  1.40),
    ('ALT-014', '2026-03-02 16:00:00', 'warning', 'resolved',      'Google Ads', 'CPA',   'DSA - Blog Traffic',           'CPA spiked 33% after site content update changed auto-targets. Review dynamic ad targets and exclude low-quality pages.',                  'up',   33.1,  44.70, 33.60),
    ('ALT-015', '2026-03-01 09:00:00', 'warning', 'resolved',      'Meta Ads',   'ROAS',  'Prospecting - Interest Stack',  'Weekend ROAS 19% lower than weekday average. Consider scheduling rules to reduce bids on weekends.',                                      'down', 19.3,   1.71,  2.12),
    -- INFO alerts
    ('ALT-016', '2026-03-08 07:00:00', 'info', 'active',           'Google Ads', 'ROAS',  'Performance Max - EU Markets', 'ROAS improved 12% week-over-week following creative refresh. Current performance above target. No action needed.',                         'up',   12.0,   2.89,  2.58),
    ('ALT-017', '2026-03-07 18:00:00', 'info', 'active',           'Meta Ads',   'CTR',   'Awareness - Video Views',      'CTR increased 16% after video thumbnail A/B test concluded. Winner has been applied to all ad sets.',                                       'up',   16.3,   4.21,  3.62),
    ('ALT-018', '2026-03-07 12:30:00', 'info', 'acknowledged',     'Bing Ads',   'SPEND', 'Non-Brand - Competitors',      'Daily spend is 15% below budget allocation. Auction competition has decreased. Consider relaxing bid constraints to capture volume.',       'down', 15.0, 680.00, 800.00),
    ('ALT-019', '2026-03-06 09:00:00', 'info', 'resolved',         'Google Ads', 'CONVERSIONS', 'Shopping - Top Products','Conversion volume up 11% following product feed optimisation. Enhanced titles and descriptions improved quality score.',                   'up',   11.2,  186.0, 167.0),
    ('ALT-020', '2026-03-05 14:00:00', 'info', 'resolved',         'Meta Ads',   'CPA',   'Conversion - Lead Gen',        'CPA decreased 10% after audience narrowing. Qualified lead rate improved. Campaign is performing efficiently.',                              'down', 10.4,  22.50, 25.10),
    ('ALT-021', '2026-03-04 16:00:00', 'info', 'resolved',         'Google Ads', 'CTR',   'Brand - Search EU',            'Branded CTR up 9% following ad copy update. New headline with social proof message outperforming control by 18%.',                          'up',    9.1,   8.72,  8.00),
    ('ALT-022', '2026-03-03 10:00:00', 'info', 'resolved',         'Meta Ads',   'IMPRESSIONS', 'Prospecting - Lookalike 3%', 'Reach expanded 22% after audience replenishment. Frequency is back within healthy range (< 2.5x).',                               'up',   22.0, 342000.0, 280000.0),
    ('ALT-023', '2026-03-01 08:00:00', 'info', 'resolved',         'Bing Ads',   'ROAS',  'Brand - Exact Match',          'ROAS improved 14% in February versus January. Budget reallocation from display to search has paid off.',                                    'up',   14.3,   3.10,  2.71),
    -- February alerts
    ('ALT-024', '2026-02-27 11:00:00', 'critical', 'resolved',     'Google Ads', 'CPA',   'Branded - Mobile',             'Mobile CPA exceeded desktop by 85%. Negative mobile bid adjustment of -30% applied as temporary measure.',                                  'up',   85.2,  63.40, 34.20),
    ('ALT-025', '2026-02-25 14:30:00', 'warning',  'resolved',     'Meta Ads',   'ROAS',  'Retargeting - DPA Catalogue',  'ROAS declined 17% after catalogue sync error caused outdated prices to show. Catalogue refreshed manually.',                                'down', 17.4,   1.74,  2.10),
    ('ALT-026', '2026-02-22 09:00:00', 'warning',  'resolved',     'Google Ads', 'CTR',   'Display - Remarketing',        'CTR dropped 26% across display network following frequency cap reduction. Consider raising cap from 3 to 5 per week.',                      'down', 26.1,   0.07,  0.10),
    ('ALT-027', '2026-02-20 16:00:00', 'info',     'resolved',     'Bing Ads',   'SPEND', 'Non-Brand - Competitors',      'Spend increased 18% during competitor brand campaign pause. Opportunity captured successfully.',                                             'up',   18.0, 943.00, 800.00),
    ('ALT-028', '2026-02-18 10:00:00', 'critical', 'resolved',     'Meta Ads',   'CPA',   'Prospecting - Interest Stack',  'CPA jumped 52% during Super Bowl weekend. Expected seasonal spike. Budgets temporarily reduced and restored post-event.',                  'up',   52.3,  38.10, 25.00),
    ('ALT-029', '2026-02-15 08:00:00', 'warning',  'resolved',     'Google Ads', 'ROAS',  'Performance Max - EU Markets', 'February mid-month ROAS dip of 20% consistent with historical pattern. Performance expected to recover in week 3.',                        'down', 20.1,   2.06,  2.58),
    ('ALT-030', '2026-02-10 12:00:00', 'info',     'resolved',     'Meta Ads',   'CTR',   'Awareness - Video Views',      '3-second video view rate up 13% after thumbnail optimisation. Brand recall lift study shows positive correlation.',                         'up',   13.2,   4.08,  3.60),
    -- January alerts
    ('ALT-031', '2026-01-28 15:00:00', 'warning',  'resolved',     'Google Ads', 'SPEND', 'Shopping - Top Products',      'Monthly budget pacing 8% below target heading into final week of January. Bid modifiers adjusted to accelerate spend.',                     'down',  8.3, 3680.00, 4012.00),
    ('ALT-032', '2026-01-25 10:30:00', 'critical', 'resolved',     'Meta Ads',   'ROAS',  'Retargeting - Cart Abandoners', 'Post-holiday ROAS crash of 44%. Retargeting pool exhausted after January sales period. Audience expanded to 180-day window.',             'down', 44.1,   0.95,  1.70),
    ('ALT-033', '2026-01-20 09:00:00', 'info',     'resolved',     'Google Ads', 'CTR',   'Brand - Search EU',            'New year branded searches up 21% vs December. Campaign impression share maintained at 96%. No action required.',                            'up',   21.0,   9.14,  7.56),
    ('ALT-034', '2026-01-15 14:00:00', 'warning',  'resolved',     'Bing Ads',   'CPA',   'Generic - High Intent',        'CPA 24% above target after Microsoft Ads automated bidding update. Switched back to manual CPC temporarily.',                               'up',   24.3,  37.20, 30.00),
    ('ALT-035', '2026-01-10 11:00:00', 'info',     'resolved',     'Meta Ads',   'IMPRESSIONS', 'Prospecting - Lookalike 3%', 'New year prospecting audience refreshed. Reach expanded 28% with no corresponding CPA increase. Strong Q1 start.',                  'up',   28.4, 398000.0, 310000.0)
  `);

  console.log('[Seed] ALERTS created and seeded with 35 entries.');
}
