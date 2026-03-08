-- Alerts & Anomaly Detection Table
-- Run this in Snowflake to create the GOLD.ALERTS table

CREATE TABLE IF NOT EXISTS GOLD.ALERTS (
  ALERT_ID          VARCHAR(20),
  ALERT_DATETIME    TIMESTAMP_NTZ,
  SEVERITY          VARCHAR(10),    -- critical, warning, info
  CHANNEL           VARCHAR(50),
  CAMPAIGN          VARCHAR(200),
  METRIC            VARCHAR(50),    -- CPA, CTR, SPEND, ROAS, CONVERSIONS, IMPRESSIONS
  CURRENT_VALUE     NUMBER(12,2),
  BASELINE_VALUE    NUMBER(12,2),   -- 7-day moving average
  CHANGE_PCT        NUMBER(8,2),    -- % change from baseline
  DIRECTION         VARCHAR(10),    -- up, down
  STATUS            VARCHAR(20),    -- active, acknowledged, resolved
  MESSAGE           VARCHAR(500)
);

-- Insert realistic mock alerts for Q1 2026
TRUNCATE TABLE GOLD.ALERTS;
INSERT INTO GOLD.ALERTS VALUES
  -- Critical alerts (big spikes/drops)
  ('ALT-001', '2026-03-07 14:23:00', 'critical', 'Google Ads', 'Brand - Search', 'CPA',
   42.50, 28.10, 51.2, 'up', 'active',
   'CPA spiked 51% above 7-day average on Brand Search. Check for bid changes or competitor activity.'),

  ('ALT-002', '2026-03-07 09:15:00', 'critical', 'Meta Ads', 'Retargeting - DPA', 'ROAS',
   1.45, 3.20, -54.7, 'down', 'active',
   'ROAS dropped 55% on Retargeting DPA. Creative fatigue or audience saturation likely.'),

  ('ALT-003', '2026-03-06 18:42:00', 'critical', 'Google Ads', 'Performance Max - All', 'SPEND',
   2850.00, 1200.00, 137.5, 'up', 'active',
   'Daily spend 138% above normal on Performance Max. Budget cap may have been raised or removed.'),

  ('ALT-004', '2026-03-06 11:30:00', 'critical', 'Bing Ads', 'Brand - Exact', 'CONVERSIONS',
   2, 14, -85.7, 'down', 'active',
   'Conversions dropped 86% on Bing Brand Exact. Check tracking pixel or landing page issues.'),

  -- Warning alerts (moderate changes)
  ('ALT-005', '2026-03-07 16:05:00', 'warning', 'Google Ads', 'Non-Brand - Generic', 'CTR',
   1.82, 2.85, -36.1, 'down', 'active',
   'CTR declined 36% on Non-Brand Generic. Ad copy or keyword relevance may need review.'),

  ('ALT-006', '2026-03-07 08:30:00', 'warning', 'Meta Ads', 'Prospecting - Lookalike', 'CPA',
   38.90, 26.50, 46.8, 'up', 'active',
   'CPA increased 47% on Lookalike Prospecting. Audience expansion may be reaching less qualified users.'),

  ('ALT-007', '2026-03-06 22:10:00', 'warning', 'Google Ads', 'Shopping - Feed', 'IMPRESSIONS',
   4200, 8900, -52.8, 'down', 'acknowledged',
   'Shopping impressions dropped 53%. Check feed errors or disapproved products in Merchant Center.'),

  ('ALT-008', '2026-03-06 15:45:00', 'warning', 'Meta Ads', 'Brand Awareness - Video', 'SPEND',
   890.00, 520.00, 71.2, 'up', 'acknowledged',
   'Spend 71% above normal on Brand Awareness Video. Verify budget allocation is intentional.'),

  ('ALT-009', '2026-03-05 14:20:00', 'warning', 'Bing Ads', 'Non-Brand - Services', 'CPA',
   55.20, 38.80, 42.3, 'up', 'resolved',
   'CPA increased 42% on Bing Non-Brand Services. Resolved after negative keyword additions.'),

  ('ALT-010', '2026-03-05 10:00:00', 'warning', 'Google Ads', 'Display - Remarketing', 'CTR',
   0.18, 0.32, -43.8, 'down', 'resolved',
   'Display remarketing CTR dropped 44%. Resolved after creative refresh.'),

  -- Info alerts (notable but not urgent)
  ('ALT-011', '2026-03-07 12:00:00', 'info', 'Google Ads', 'Brand - Search', 'IMPRESSIONS',
   15200, 11800, 28.8, 'up', 'active',
   'Brand search impressions up 29%. Possible increase in brand awareness from Meta campaigns.'),

  ('ALT-012', '2026-03-06 09:30:00', 'info', 'Meta Ads', 'Conversion - Lead Gen', 'CONVERSIONS',
   45, 32, 40.6, 'up', 'active',
   'Lead gen conversions up 41%. New creative variant performing well.'),

  ('ALT-013', '2026-03-05 16:15:00', 'info', 'Google Ads', 'Non-Brand - Competitor', 'ROAS',
   4.10, 2.90, 41.4, 'up', 'acknowledged',
   'Competitor campaign ROAS up 41%. New landing page variant showing strong results.'),

  ('ALT-014', '2026-03-04 11:45:00', 'info', 'Bing Ads', 'Brand - Broad', 'CTR',
   5.80, 4.20, 38.1, 'up', 'resolved',
   'Bing Brand Broad CTR improved 38% after ad copy update.'),

  ('ALT-015', '2026-03-03 09:00:00', 'info', 'Meta Ads', 'Retargeting - Website', 'ROAS',
   5.20, 3.80, 36.8, 'up', 'resolved',
   'Website retargeting ROAS improved 37%. Audience window optimization working well.'),

  -- Older alerts (February)
  ('ALT-016', '2026-02-28 15:30:00', 'critical', 'Google Ads', 'Performance Max - All', 'CPA',
   52.00, 30.50, 70.5, 'up', 'resolved',
   'PMax CPA spiked 71%. Resolved after audience signal refinement.'),

  ('ALT-017', '2026-02-25 10:15:00', 'warning', 'Meta Ads', 'Prospecting - Interest', 'ROAS',
   1.80, 2.60, -30.8, 'down', 'resolved',
   'Interest targeting ROAS declined 31%. Resolved after interest group refresh.'),

  ('ALT-018', '2026-02-20 08:45:00', 'critical', 'Bing Ads', 'Non-Brand - Generic', 'SPEND',
   450.00, 180.00, 150.0, 'up', 'resolved',
   'Bing spend spiked 150%. Resolved: automated rule had doubled bids incorrectly.'),

  ('ALT-019', '2026-02-15 14:00:00', 'warning', 'Google Ads', 'Shopping - Feed', 'CONVERSIONS',
   18, 35, -48.6, 'down', 'resolved',
   'Shopping conversions dropped 49%. Feed error resolved after product data fix.'),

  ('ALT-020', '2026-02-10 11:30:00', 'info', 'Meta Ads', 'Brand Awareness - Video', 'CTR',
   1.20, 0.85, 41.2, 'up', 'resolved',
   'Video CTR improved 41% with new creative format.');
