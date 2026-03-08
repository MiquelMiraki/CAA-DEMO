-- Cross-Channel Attribution Tables
-- Run this in Snowflake to create the GOLD attribution tables

-- Attribution by model: shows how conversions are distributed per channel under different models
CREATE TABLE IF NOT EXISTS GOLD.ATTRIBUTION (
  MONTH         DATE,
  CHANNEL       VARCHAR(50),
  FIRST_TOUCH_CONVERSIONS   NUMBER(10,2),
  LAST_TOUCH_CONVERSIONS    NUMBER(10,2),
  LINEAR_CONVERSIONS        NUMBER(10,2),
  FIRST_TOUCH_REVENUE       NUMBER(12,2),
  LAST_TOUCH_REVENUE        NUMBER(12,2),
  LINEAR_REVENUE            NUMBER(12,2),
  ASSISTED_CONVERSIONS      NUMBER(10,2),
  TOTAL_TOUCHPOINTS         NUMBER(10,0)
);

-- Channel overlap: how often two channels appear in the same conversion path
CREATE TABLE IF NOT EXISTS GOLD.CHANNEL_OVERLAP (
  MONTH           DATE,
  SOURCE_CHANNEL  VARCHAR(50),
  ASSIST_CHANNEL  VARCHAR(50),
  SHARED_CONVERSIONS  NUMBER(10,0),
  SHARED_REVENUE      NUMBER(12,2)
);

-- Insert mock data for Q1 2026
-- Attribution data - realistic multi-touch distribution
TRUNCATE TABLE GOLD.ATTRIBUTION;
INSERT INTO GOLD.ATTRIBUTION VALUES
  -- January 2026
  ('2026-01-01', 'Google Ads', 312, 285, 298, 46800, 42750, 44700, 187, 1245),
  ('2026-01-01', 'Meta Ads',   198, 235, 216, 23760, 28200, 25920, 243, 1580),
  ('2026-01-01', 'Bing Ads',    90,  80,  86, 11700, 10400, 11180,  72,  410),
  -- February 2026
  ('2026-02-01', 'Google Ads', 335, 302, 318, 50250, 45300, 47700, 201, 1380),
  ('2026-02-01', 'Meta Ads',   215, 258, 236, 25800, 30960, 28320, 268, 1720),
  ('2026-02-01', 'Bing Ads',    98,  88,  93, 12740, 11440, 12090,  78,  445),
  -- March 2026
  ('2026-03-01', 'Google Ads', 358, 320, 339, 53700, 48000, 50850, 218, 1465),
  ('2026-03-01', 'Meta Ads',   230, 278, 254, 27600, 33360, 30480, 285, 1850),
  ('2026-03-01', 'Bing Ads',   108,  98, 103, 14040, 12740, 13390,  85,  480);

-- Channel overlap data - which channels assist each other
TRUNCATE TABLE GOLD.CHANNEL_OVERLAP;
INSERT INTO GOLD.CHANNEL_OVERLAP VALUES
  -- January 2026
  ('2026-01-01', 'Google Ads', 'Meta Ads',   142, 18460),
  ('2026-01-01', 'Google Ads', 'Bing Ads',    45,  5850),
  ('2026-01-01', 'Meta Ads',   'Google Ads', 187, 22440),
  ('2026-01-01', 'Meta Ads',   'Bing Ads',    38,  4560),
  ('2026-01-01', 'Bing Ads',   'Google Ads',  52,  6760),
  ('2026-01-01', 'Bing Ads',   'Meta Ads',    28,  3360),
  -- February 2026
  ('2026-02-01', 'Google Ads', 'Meta Ads',   158, 20540),
  ('2026-02-01', 'Google Ads', 'Bing Ads',    48,  6240),
  ('2026-02-01', 'Meta Ads',   'Google Ads', 205, 24600),
  ('2026-02-01', 'Meta Ads',   'Bing Ads',    42,  5040),
  ('2026-02-01', 'Bing Ads',   'Google Ads',  58,  7540),
  ('2026-02-01', 'Bing Ads',   'Meta Ads',    32,  3840),
  -- March 2026
  ('2026-03-01', 'Google Ads', 'Meta Ads',   172, 22360),
  ('2026-03-01', 'Google Ads', 'Bing Ads',    52,  6760),
  ('2026-03-01', 'Meta Ads',   'Google Ads', 220, 26400),
  ('2026-03-01', 'Meta Ads',   'Bing Ads',    48,  5760),
  ('2026-03-01', 'Bing Ads',   'Google Ads',  65,  8450),
  ('2026-03-01', 'Bing Ads',   'Meta Ads',    35,  4200);
