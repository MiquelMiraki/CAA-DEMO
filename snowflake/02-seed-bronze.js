const { getConnection, connect, query, batchInsert } = require('./config');

// ====== HELPERS ======
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function dateStr(d) { return d.toISOString().split('T')[0]; }
function tsStr(d) { return d.toISOString().replace('T', ' ').replace('Z', ''); }

// Day-of-week factor (Mon=1.1, Sat=0.7, Sun=0.6)
function dowFactor(date) {
  const d = date.getDay();
  return [0.6, 1.1, 1.05, 1.0, 1.05, 1.1, 0.7][d];
}
// Monthly trend factor (gradual growth Jan→Mar)
function monthTrend(date) {
  const m = date.getMonth(); // 0=Jan, 1=Feb, 2=Mar
  return 1.0 + (m * 0.08); // +8% per month
}
// Add noise
function noise(base, pct = 0.15) {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

// Generate date range
function dateRange(start, end) {
  const dates = [];
  const d = new Date(start);
  const e = new Date(end);
  while (d <= e) { dates.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return dates;
}

const DATES = dateRange('2026-01-01', '2026-03-31'); // Q1 2026 = 90 days
const DEVICES_GOOGLE = ['MOBILE', 'DESKTOP', 'TABLET'];
const DEVICES_META = ['MOBILE', 'DESKTOP'];
const DEVICES_BING = ['MOBILE', 'DESKTOP'];
const COUNTRIES = ['ES', 'FR', 'DE', 'IT', 'PT'];

// ====== GOOGLE ADS DATA ======
const GOOGLE_CAMPAIGNS = [
  { id: 5001, name: 'ES_Search_Brand', channel: 'SEARCH', budget: 80, bidding: 'TARGET_CPA', geo: 'ES', baseImpressions: 1200, baseCtr: 0.12, baseCpc: 0.80, baseConvRate: 0.08 },
  { id: 5002, name: 'ES_Search_Generic_Electronics', channel: 'SEARCH', budget: 200, bidding: 'MAXIMIZE_CONVERSIONS', geo: 'ES', baseImpressions: 3000, baseCtr: 0.035, baseCpc: 1.80, baseConvRate: 0.03 },
  { id: 5003, name: 'ES_Search_Competitors', channel: 'SEARCH', budget: 60, bidding: 'MANUAL_CPC', geo: 'ES', baseImpressions: 800, baseCtr: 0.02, baseCpc: 3.50, baseConvRate: 0.015 },
  { id: 5004, name: 'EU_Search_Brand', channel: 'SEARCH', budget: 120, bidding: 'TARGET_CPA', geo: 'EU', baseImpressions: 2000, baseCtr: 0.10, baseCpc: 0.90, baseConvRate: 0.07 },
  { id: 5005, name: 'EU_Search_Generic_Tech', channel: 'SEARCH', budget: 300, bidding: 'MAXIMIZE_CONVERSIONS', geo: 'EU', baseImpressions: 4500, baseCtr: 0.03, baseCpc: 2.10, baseConvRate: 0.025 },
  { id: 5006, name: 'ES_Shopping_Catalog', channel: 'SHOPPING', budget: 150, bidding: 'TARGET_ROAS', geo: 'ES', baseImpressions: 5000, baseCtr: 0.018, baseCpc: 0.45, baseConvRate: 0.04 },
  { id: 5007, name: 'EU_Shopping_Catalog', channel: 'SHOPPING', budget: 250, bidding: 'TARGET_ROAS', geo: 'EU', baseImpressions: 8000, baseCtr: 0.015, baseCpc: 0.50, baseConvRate: 0.035 },
  { id: 5008, name: 'ES_Display_Retargeting', channel: 'DISPLAY', budget: 50, bidding: 'TARGET_CPA', geo: 'ES', baseImpressions: 15000, baseCtr: 0.005, baseCpc: 0.35, baseConvRate: 0.035 },
  { id: 5009, name: 'ES_Display_Prospecting', channel: 'DISPLAY', budget: 80, bidding: 'MAXIMIZE_CLICKS', geo: 'ES', baseImpressions: 25000, baseCtr: 0.002, baseCpc: 0.15, baseConvRate: 0.008 },
  { id: 5010, name: 'ES_PMax_AllProducts', channel: 'PERFORMANCE_MAX', budget: 180, bidding: 'MAXIMIZE_CONVERSION_VALUE', geo: 'ES', baseImpressions: 6000, baseCtr: 0.025, baseCpc: 1.20, baseConvRate: 0.04 },
  { id: 5011, name: 'ES_Video_Brand_YT', channel: 'VIDEO', budget: 40, bidding: 'TARGET_CPV', geo: 'ES', baseImpressions: 20000, baseCtr: 0.008, baseCpc: 0.06, baseConvRate: 0.003 },
  { id: 5012, name: 'EU_Video_Awareness', channel: 'VIDEO', budget: 60, bidding: 'TARGET_CPV', geo: 'EU', baseImpressions: 30000, baseCtr: 0.006, baseCpc: 0.05, baseConvRate: 0.002 },
];

const GOOGLE_AD_GROUPS = [];
const GOOGLE_ADS = [];
const GOOGLE_KEYWORDS = [];
let agId = 6001, adId = 7001, kwId = 8001;

const AD_GROUP_TEMPLATES = {
  SEARCH: ['Brand_Exact', 'Brand_Phrase', 'Generic_Broad', 'Generic_Exact'],
  SHOPPING: ['Top_Products', 'Clearance', 'New_Arrivals'],
  DISPLAY: ['Interest_Tech', 'Custom_Audience', 'Remarketing_Cart'],
  PERFORMANCE_MAX: ['Asset_Group_Main', 'Asset_Group_Secondary'],
  VIDEO: ['Skippable_15s', 'Bumper_6s'],
};

const KW_TEMPLATES = {
  Brand_Exact: ['[tienda electronica]', '[comprar electronica online]', '[marca electronica]'],
  Brand_Phrase: ['"tienda electronica"', '"electronica online"'],
  Generic_Broad: ['comprar portatil', 'mejor movil 2026', 'ofertas electronica'],
  Generic_Exact: ['[comprar portatil barato]', '[mejor smartphone]'],
  Top_Products: ['laptop gaming', 'auriculares bluetooth'],
  Clearance: ['ofertas electronica', 'outlet tecnologia'],
  New_Arrivals: ['nuevo iphone', 'samsung galaxy nuevo'],
};

for (const c of GOOGLE_CAMPAIGNS) {
  const templates = AD_GROUP_TEMPLATES[c.channel] || ['Default'];
  for (const tpl of templates) {
    const ag = { id: agId++, name: `${c.name}_${tpl}`, campaignId: c.id, status: 'ENABLED', maxCpc: noise(c.baseCpc, 0.2).toFixed(2), type: 'STANDARD' };
    GOOGLE_AD_GROUPS.push(ag);
    // Ads
    GOOGLE_ADS.push({ id: adId++, agId: ag.id, type: c.channel === 'SHOPPING' ? 'SHOPPING_AD' : 'RESPONSIVE_SEARCH_AD', url: `https://tienda-electronica.es/${tpl.toLowerCase()}`, h1: `Compra ${tpl}`, h2: 'Envio Gratis', h3: 'Mejor Precio', d1: `Ofertas en ${tpl}`, d2: 'Compra ahora', status: 'ENABLED' });
    // Keywords (only for search/shopping)
    if (['SEARCH', 'SHOPPING'].includes(c.channel)) {
      const kws = KW_TEMPLATES[tpl] || ['generic keyword'];
      for (const kw of kws) {
        GOOGLE_KEYWORDS.push({ id: kwId++, agId: ag.id, keyword: kw, matchType: kw.startsWith('[') ? 'EXACT' : kw.startsWith('"') ? 'PHRASE' : 'BROAD', status: 'ENABLED', maxCpc: noise(c.baseCpc, 0.2).toFixed(2) });
      }
    }
  }
}

// ====== META ADS DATA ======
const META_CAMPAIGNS = [
  { id: 9001, name: 'ES_Conversions_Retargeting', obj: 'CONVERSIONS', budget: 60, geo: 'ES', baseImpressions: 8000, baseCtr: 0.02, baseCpc: 0.50, baseConvRate: 0.06 },
  { id: 9002, name: 'ES_Conversions_Lookalike', obj: 'CONVERSIONS', budget: 100, geo: 'ES', baseImpressions: 12000, baseCtr: 0.015, baseCpc: 0.80, baseConvRate: 0.025 },
  { id: 9003, name: 'ES_Traffic_Blog', obj: 'TRAFFIC', budget: 30, geo: 'ES', baseImpressions: 15000, baseCtr: 0.025, baseCpc: 0.15, baseConvRate: 0.005 },
  { id: 9004, name: 'ES_Leads_Newsletter', obj: 'LEAD_GENERATION', budget: 45, geo: 'ES', baseImpressions: 6000, baseCtr: 0.012, baseCpc: 1.50, baseConvRate: 0.04 },
  { id: 9005, name: 'ES_Awareness_BrandVideo', obj: 'BRAND_AWARENESS', budget: 50, geo: 'ES', baseImpressions: 40000, baseCtr: 0.005, baseCpc: 0.08, baseConvRate: 0.001 },
  { id: 9006, name: 'EU_Conversions_Retargeting', obj: 'CONVERSIONS', budget: 90, geo: 'EU', baseImpressions: 10000, baseCtr: 0.018, baseCpc: 0.55, baseConvRate: 0.05 },
  { id: 9007, name: 'EU_Conversions_Prospecting', obj: 'CONVERSIONS', budget: 120, geo: 'EU', baseImpressions: 15000, baseCtr: 0.012, baseCpc: 1.00, baseConvRate: 0.02 },
  { id: 9008, name: 'ES_Sales_DynamicCatalog', obj: 'CATALOG_SALES', budget: 80, geo: 'ES', baseImpressions: 10000, baseCtr: 0.018, baseCpc: 0.60, baseConvRate: 0.045 },
  { id: 9009, name: 'ES_Engagement_Social', obj: 'ENGAGEMENT', budget: 20, geo: 'ES', baseImpressions: 20000, baseCtr: 0.03, baseCpc: 0.05, baseConvRate: 0.002 },
  { id: 9010, name: 'EU_Awareness_ProductLaunch', obj: 'REACH', budget: 70, geo: 'EU', baseImpressions: 50000, baseCtr: 0.004, baseCpc: 0.06, baseConvRate: 0.001 },
];

const META_AD_SETS = [];
const META_ADS_LIST = [];
const META_CREATIVES = [];
let asId = 9101, maId = 9201, crId = 9301;

const PLACEMENTS = ['facebook_feed', 'instagram_feed', 'instagram_stories', 'audience_network', 'facebook_reels'];
const CTA_OPTIONS = ['SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'GET_OFFER', 'CONTACT_US'];

for (const c of META_CAMPAIGNS) {
  const numSets = randInt(2, 3);
  for (let i = 0; i < numSets; i++) {
    const as = {
      id: asId++, name: `${c.name}_Set${i + 1}`, campaignId: c.id,
      optGoal: c.obj === 'CONVERSIONS' ? 'OFFSITE_CONVERSIONS' : c.obj === 'TRAFFIC' ? 'LINK_CLICKS' : 'IMPRESSIONS',
      billing: 'IMPRESSIONS', status: 'ACTIVE', dailyBudget: (c.budget / numSets).toFixed(2),
      geo: c.geo === 'ES' ? 'Spain' : 'France,Germany,Italy,Portugal',
      ages: pick(['18-34', '25-44', '35-54', '18-65'])
    };
    META_AD_SETS.push(as);
    // 2 ads per ad set
    for (let j = 0; j < 2; j++) {
      const cr = { id: crId++, name: `Creative_${c.name}_${i + 1}_${j + 1}`, headline: `${c.obj === 'CONVERSIONS' ? 'Compra ahora' : 'Descubre'} - Oferta ${j + 1}`, body: `Los mejores productos de electronica con envio gratis`, cta: pick(CTA_OPTIONS), imageUrl: `https://cdn.tienda-electronica.es/ads/creative_${crId}.jpg`, videoUrl: c.obj === 'BRAND_AWARENESS' ? `https://cdn.tienda-electronica.es/ads/video_${crId}.mp4` : null, format: c.obj === 'BRAND_AWARENESS' ? 'VIDEO' : pick(['IMAGE', 'CAROUSEL']) };
      META_CREATIVES.push(cr);
      META_ADS_LIST.push({ id: maId++, name: `Ad_${c.name}_${i + 1}_${j + 1}`, adsetId: as.id, creativeId: cr.id, status: 'ACTIVE' });
    }
  }
}

// ====== BING ADS DATA ======
const BING_CAMPAIGNS = [
  { id: 3001, name: 'ES_Search_Brand', budget: 40, geo: 'ES', baseImpressions: 600, baseCtr: 0.10, baseCpc: 0.70, baseConvRate: 0.07 },
  { id: 3002, name: 'ES_Search_Generic', budget: 80, geo: 'ES', baseImpressions: 1200, baseCtr: 0.03, baseCpc: 1.50, baseConvRate: 0.025 },
  { id: 3003, name: 'EU_Search_Brand', budget: 50, geo: 'EU', baseImpressions: 800, baseCtr: 0.09, baseCpc: 0.75, baseConvRate: 0.065 },
  { id: 3004, name: 'EU_Search_Generic', budget: 100, geo: 'EU', baseImpressions: 1500, baseCtr: 0.028, baseCpc: 1.60, baseConvRate: 0.022 },
  { id: 3005, name: 'ES_Shopping', budget: 50, geo: 'ES', baseImpressions: 2000, baseCtr: 0.015, baseCpc: 0.40, baseConvRate: 0.035 },
  { id: 3006, name: 'EU_Shopping', budget: 70, geo: 'EU', baseImpressions: 3000, baseCtr: 0.012, baseCpc: 0.45, baseConvRate: 0.03 },
];

const BING_AD_GROUPS = [];
const BING_KEYWORDS = [];
let bagId = 3101, bkwId = 3201;
for (const c of BING_CAMPAIGNS) {
  for (let i = 0; i < 2; i++) {
    const ag = { id: bagId++, name: `${c.name}_Group${i + 1}`, campaignId: c.id, status: 'ENABLED', cpcBid: noise(c.baseCpc, 0.2).toFixed(2) };
    BING_AD_GROUPS.push(ag);
    if (c.name.includes('Search')) {
      BING_KEYWORDS.push({ id: bkwId++, agId: ag.id, keyword: `electronica ${c.geo.toLowerCase()}`, matchType: 'BROAD', bid: c.baseCpc.toFixed(2), status: 'ENABLED' });
      BING_KEYWORDS.push({ id: bkwId++, agId: ag.id, keyword: `[comprar electronica]`, matchType: 'EXACT', bid: (c.baseCpc * 1.2).toFixed(2), status: 'ENABLED' });
    }
  }
}

// ====== GA4 DATA ======
const GA4_SOURCES = [
  { source: 'google', medium: 'cpc', baseSessions: 300 },
  { source: 'google', medium: 'organic', baseSessions: 500 },
  { source: 'facebook', medium: 'cpc', baseSessions: 200 },
  { source: 'instagram', medium: 'cpc', baseSessions: 100 },
  { source: 'bing', medium: 'cpc', baseSessions: 80 },
  { source: 'direct', medium: '(none)', baseSessions: 400 },
  { source: 'newsletter', medium: 'email', baseSessions: 60 },
  { source: 'google', medium: 'referral', baseSessions: 50 },
];
const GA4_DEVICES = ['desktop', 'mobile', 'tablet'];
const GA4_COUNTRIES = ['Spain', 'France', 'Germany', 'Italy', 'Portugal'];
const GA4_EVENTS = ['session_start', 'page_view', 'add_to_cart', 'begin_checkout', 'purchase'];

// ====== GSC DATA ======
const GSC_QUERIES = [
  { query: 'tienda electronica online', baseClicks: 50, baseImpressions: 800, basePosition: 3.2 },
  { query: 'comprar portatil barato', baseClicks: 30, baseImpressions: 1200, basePosition: 5.1 },
  { query: 'mejor movil 2026', baseClicks: 25, baseImpressions: 2000, basePosition: 7.3 },
  { query: 'auriculares bluetooth', baseClicks: 40, baseImpressions: 1500, basePosition: 4.5 },
  { query: 'ofertas electronica', baseClicks: 35, baseImpressions: 900, basePosition: 4.0 },
  { query: 'tablet samsung precio', baseClicks: 20, baseImpressions: 600, basePosition: 6.2 },
  { query: 'smartwatch barato', baseClicks: 15, baseImpressions: 500, basePosition: 8.1 },
  { query: 'televisor 4k ofertas', baseClicks: 22, baseImpressions: 700, basePosition: 5.5 },
  { query: 'camara fotos digital', baseClicks: 12, baseImpressions: 400, basePosition: 9.0 },
  { query: 'altavoz inteligente', baseClicks: 18, baseImpressions: 550, basePosition: 6.8 },
  { query: 'consola videojuegos', baseClicks: 28, baseImpressions: 1100, basePosition: 5.8 },
  { query: 'cargador inalambrico', baseClicks: 10, baseImpressions: 350, basePosition: 7.5 },
  { query: 'monitor gaming', baseClicks: 20, baseImpressions: 800, basePosition: 6.0 },
  { query: 'teclado mecanico', baseClicks: 15, baseImpressions: 450, basePosition: 5.3 },
  { query: 'robot aspirador', baseClicks: 25, baseImpressions: 900, basePosition: 4.8 },
];

// ====== CRM DATA ======
const INDUSTRIES = ['Technology', 'Retail', 'Healthcare', 'Finance', 'Manufacturing', 'Education', 'Media'];
const STAGES = ['Prospecting', 'Qualification', 'Needs Analysis', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const LEAD_SOURCES_CRM = ['Google Ads', 'Meta Ads', 'Organic Search', 'Direct', 'Referral', 'Email Campaign', 'Bing Ads'];

// ====== MAIN SEED FUNCTION ======
async function run() {
  const conn = getConnection();
  await connect(conn);
  console.log('Connected. Seeding Bronze data...\n');

  // --- Google Ads Campaigns ---
  console.log('Seeding Google Ads...');
  await batchInsert(conn, 'BRONZE_V2.GOOGLE_ADS_CAMPAIGNS',
    ['CAMPAIGN_ID', 'CAMPAIGN_NAME', 'STATUS', 'CHANNEL_TYPE', 'BUDGET', 'BUDGET_TYPE', 'BIDDING_STRATEGY', 'START_DATE', 'END_DATE', 'TARGET_GEO'],
    GOOGLE_CAMPAIGNS.map(c => [c.id, c.name, 'ENABLED', c.channel, c.budget, 'DAILY', c.bidding, '2026-01-01', null, c.geo])
  );

  await batchInsert(conn, 'BRONZE_V2.GOOGLE_ADS_AD_GROUPS',
    ['AD_GROUP_ID', 'AD_GROUP_NAME', 'CAMPAIGN_ID', 'STATUS', 'MAX_CPC', 'AD_GROUP_TYPE'],
    GOOGLE_AD_GROUPS.map(ag => [ag.id, ag.name, ag.campaignId, ag.status, ag.maxCpc, ag.type])
  );

  await batchInsert(conn, 'BRONZE_V2.GOOGLE_ADS_ADS',
    ['AD_ID', 'AD_GROUP_ID', 'AD_TYPE', 'FINAL_URL', 'HEADLINE_1', 'HEADLINE_2', 'HEADLINE_3', 'DESCRIPTION_1', 'DESCRIPTION_2', 'STATUS'],
    GOOGLE_ADS.map(a => [a.id, a.agId, a.type, a.url, a.h1, a.h2, a.h3, a.d1, a.d2, a.status])
  );

  await batchInsert(conn, 'BRONZE_V2.GOOGLE_ADS_KEYWORDS',
    ['KEYWORD_ID', 'AD_GROUP_ID', 'KEYWORD', 'MATCH_TYPE', 'STATUS', 'MAX_CPC'],
    GOOGLE_KEYWORDS.map(k => [k.id, k.agId, k.keyword, k.matchType, k.status, k.maxCpc])
  );

  // Google Ads Performance (daily × campaign × device)
  const gPerfRows = [];
  for (const date of DATES) {
    const dow = dowFactor(date);
    const mt = monthTrend(date);
    for (const c of GOOGLE_CAMPAIGNS) {
      for (const device of DEVICES_GOOGLE) {
        const devFactor = device === 'MOBILE' ? 0.5 : device === 'DESKTOP' ? 0.4 : 0.1;
        const impressions = Math.round(noise(c.baseImpressions * devFactor * dow * mt));
        const clicks = Math.round(impressions * noise(c.baseCtr, 0.1));
        const cost = parseFloat((clicks * noise(c.baseCpc, 0.1)).toFixed(2));
        const conversions = Math.round(clicks * noise(c.baseConvRate, 0.15));
        const convValue = parseFloat((conversions * noise(65, 0.3)).toFixed(2)); // avg order ~65€
        const firstAg = GOOGLE_AD_GROUPS.find(ag => ag.campaignId === c.id);
        const firstKw = GOOGLE_KEYWORDS.find(k => k.agId === (firstAg ? firstAg.id : 0));
        gPerfRows.push([dateStr(date), c.id, firstAg ? firstAg.id : null, firstKw ? firstKw.id : null, device, impressions, clicks, cost, conversions, convValue]);
      }
    }
  }
  await batchInsert(conn, 'BRONZE_V2.GOOGLE_ADS_PERFORMANCE',
    ['DATE', 'CAMPAIGN_ID', 'AD_GROUP_ID', 'KEYWORD_ID', 'DEVICE', 'IMPRESSIONS', 'CLICKS', 'COST', 'CONVERSIONS', 'CONVERSION_VALUE'],
    gPerfRows
  );

  // Google Ads Change History
  const gChangeRows = [];
  const changeTypes = ['UPDATE', 'CREATE', 'UPDATE', 'UPDATE'];
  const changedFields = ['budget', 'bid', 'status', 'targeting', 'ad_text'];
  const emails = ['maria@tienda-electronica.es', 'carlos@tienda-electronica.es', 'ana@agencia-marketing.es'];
  for (let i = 0; i < 80; i++) {
    const d = pick(DATES);
    const c = pick(GOOGLE_CAMPAIGNS);
    const ts = `${dateStr(d)} ${randInt(8, 18)}:${String(randInt(0, 59)).padStart(2, '0')}:00`;
    gChangeRows.push([ts, pick(emails), 'CAMPAIGN', pick(changeTypes), c.id, c.id, null, pick(changedFields), String(randInt(10, 100)), String(randInt(10, 100))]);
  }
  await batchInsert(conn, 'BRONZE_V2.GOOGLE_ADS_CHANGE_HISTORY',
    ['CHANGE_DATETIME', 'USER_EMAIL', 'RESOURCE_TYPE', 'CHANGE_TYPE', 'RESOURCE_ID', 'CAMPAIGN_ID', 'AD_GROUP_ID', 'CHANGED_FIELD', 'OLD_VALUE', 'NEW_VALUE'],
    gChangeRows
  );

  // --- Meta Ads ---
  console.log('Seeding Meta Ads...');
  await batchInsert(conn, 'BRONZE_V2.META_ADS_CAMPAIGNS',
    ['CAMPAIGN_ID', 'CAMPAIGN_NAME', 'OBJECTIVE', 'STATUS', 'DAILY_BUDGET', 'LIFETIME_BUDGET', 'START_DATE', 'STOP_DATE'],
    META_CAMPAIGNS.map(c => [c.id, c.name, c.obj, 'ACTIVE', c.budget, null, '2026-01-01', '2026-03-31'])
  );

  await batchInsert(conn, 'BRONZE_V2.META_ADS_AD_SETS',
    ['ADSET_ID', 'ADSET_NAME', 'CAMPAIGN_ID', 'OPTIMIZATION_GOAL', 'BILLING_EVENT', 'STATUS', 'DAILY_BUDGET', 'TARGETING_GEO', 'TARGETING_AGES'],
    META_AD_SETS.map(as => [as.id, as.name, as.campaignId, as.optGoal, as.billing, as.status, as.dailyBudget, as.geo, as.ages])
  );

  await batchInsert(conn, 'BRONZE_V2.META_ADS_ADS',
    ['AD_ID', 'AD_NAME', 'ADSET_ID', 'CREATIVE_ID', 'STATUS'],
    META_ADS_LIST.map(a => [a.id, a.name, a.adsetId, a.creativeId, a.status])
  );

  await batchInsert(conn, 'BRONZE_V2.META_ADS_CREATIVES',
    ['CREATIVE_ID', 'CREATIVE_NAME', 'HEADLINE', 'BODY_TEXT', 'CALL_TO_ACTION', 'IMAGE_URL', 'VIDEO_URL', 'FORMAT'],
    META_CREATIVES.map(cr => [cr.id, cr.name, cr.headline, cr.body, cr.cta, cr.imageUrl, cr.videoUrl, cr.format])
  );

  // Meta Performance (daily × campaign × device_platform × publisher)
  const mPerfRows = [];
  const PUBLISHERS = ['FACEBOOK', 'INSTAGRAM'];
  const META_PLACEMENTS = { FACEBOOK: ['facebook_feed', 'facebook_reels'], INSTAGRAM: ['instagram_feed', 'instagram_stories'] };
  for (const date of DATES) {
    const dow = dowFactor(date);
    const mt = monthTrend(date);
    for (const c of META_CAMPAIGNS) {
      for (const device of DEVICES_META) {
        const devFactor = device === 'MOBILE' ? 0.7 : 0.3;
        for (const pub of PUBLISHERS) {
          const pubFactor = pub === 'INSTAGRAM' ? 0.55 : 0.45;
          const placement = pick(META_PLACEMENTS[pub]);
          const impressions = Math.round(noise(c.baseImpressions * devFactor * pubFactor * dow * mt * 0.25)); // /4 for the splits
          const clicks = Math.round(impressions * noise(c.baseCtr, 0.1));
          const spend = parseFloat((clicks > 0 ? clicks * noise(c.baseCpc, 0.1) : impressions * noise(0.005, 0.1)).toFixed(2));
          const conversions = Math.round(clicks * noise(c.baseConvRate, 0.15));
          const convValue = parseFloat((conversions * noise(55, 0.3)).toFixed(2));
          const reach = Math.round(impressions * noise(0.85, 0.05));
          const freq = parseFloat((impressions / Math.max(reach, 1)).toFixed(2));
          const firstAs = META_AD_SETS.find(as => as.campaignId === c.id);
          const firstAd = META_ADS_LIST.find(a => a.adsetId === (firstAs ? firstAs.id : 0));
          mPerfRows.push([dateStr(date), c.id, firstAs ? firstAs.id : null, firstAd ? firstAd.id : null, device, pub, placement, impressions, clicks, spend, conversions, convValue, reach, freq]);
        }
      }
    }
  }
  await batchInsert(conn, 'BRONZE_V2.META_ADS_PERFORMANCE',
    ['DATE', 'CAMPAIGN_ID', 'ADSET_ID', 'AD_ID', 'DEVICE_PLATFORM', 'PUBLISHER_PLATFORM', 'PLACEMENT', 'IMPRESSIONS', 'CLICKS', 'SPEND', 'CONVERSIONS', 'CONVERSION_VALUE', 'REACH', 'FREQUENCY'],
    mPerfRows
  );

  // Meta Change Logs
  const mChangeRows = [];
  for (let i = 0; i < 60; i++) {
    const d = pick(DATES);
    const c = pick(META_CAMPAIGNS);
    const ts = `${dateStr(d)} ${randInt(8, 18)}:${String(randInt(0, 59)).padStart(2, '0')}:00`;
    mChangeRows.push([ts, pick(emails), 'CAMPAIGN', pick(changeTypes), c.id, c.id, null, pick(changedFields), String(randInt(10, 100)), String(randInt(10, 100))]);
  }
  await batchInsert(conn, 'BRONZE_V2.META_ADS_CHANGE_LOGS',
    ['CHANGE_DATETIME', 'USER_EMAIL', 'RESOURCE_TYPE', 'CHANGE_TYPE', 'RESOURCE_ID', 'CAMPAIGN_ID', 'ADSET_ID', 'CHANGED_FIELD', 'OLD_VALUE', 'NEW_VALUE'],
    mChangeRows
  );

  // --- Bing Ads ---
  console.log('Seeding Bing Ads...');
  await batchInsert(conn, 'BRONZE_V2.BING_ADS_CAMPAIGNS',
    ['CAMPAIGN_ID', 'CAMPAIGN_NAME', 'STATUS', 'BUDGET', 'BUDGET_TYPE', 'TIMEZONE', 'CREATED_DATE'],
    BING_CAMPAIGNS.map(c => [c.id, c.name, 'ENABLED', c.budget, 'DAILY', 'Europe/Madrid', '2026-01-01'])
  );

  await batchInsert(conn, 'BRONZE_V2.BING_ADS_AD_GROUPS',
    ['AD_GROUP_ID', 'AD_GROUP_NAME', 'CAMPAIGN_ID', 'STATUS', 'CPC_BID'],
    BING_AD_GROUPS.map(ag => [ag.id, ag.name, ag.campaignId, ag.status, ag.cpcBid])
  );

  await batchInsert(conn, 'BRONZE_V2.BING_ADS_KEYWORDS',
    ['KEYWORD_ID', 'AD_GROUP_ID', 'KEYWORD', 'MATCH_TYPE', 'BID', 'STATUS'],
    BING_KEYWORDS.map(k => [k.id, k.agId, k.keyword, k.matchType, k.bid, k.status])
  );

  // Bing Performance
  const bPerfRows = [];
  for (const date of DATES) {
    const dow = dowFactor(date);
    const mt = monthTrend(date);
    for (const c of BING_CAMPAIGNS) {
      for (const device of DEVICES_BING) {
        const devFactor = device === 'MOBILE' ? 0.45 : 0.55;
        const impressions = Math.round(noise(c.baseImpressions * devFactor * dow * mt));
        const clicks = Math.round(impressions * noise(c.baseCtr, 0.1));
        const cost = parseFloat((clicks * noise(c.baseCpc, 0.1)).toFixed(2));
        const conversions = Math.round(clicks * noise(c.baseConvRate, 0.15));
        const convValue = parseFloat((conversions * noise(60, 0.3)).toFixed(2));
        const firstAg = BING_AD_GROUPS.find(ag => ag.campaignId === c.id);
        const firstKw = BING_KEYWORDS.find(k => k.agId === (firstAg ? firstAg.id : 0));
        bPerfRows.push([dateStr(date), c.id, firstAg ? firstAg.id : null, firstKw ? firstKw.id : null, device, impressions, clicks, cost, conversions, convValue]);
      }
    }
  }
  await batchInsert(conn, 'BRONZE_V2.BING_ADS_PERFORMANCE',
    ['DATE', 'CAMPAIGN_ID', 'AD_GROUP_ID', 'KEYWORD_ID', 'DEVICE', 'IMPRESSIONS', 'CLICKS', 'SPEND', 'CONVERSIONS', 'CONVERSION_VALUE'],
    bPerfRows
  );

  // --- GA4 ---
  console.log('Seeding GA4...');
  const ga4Rows = [];
  for (const date of DATES) {
    const dow = dowFactor(date);
    const mt = monthTrend(date);
    for (const src of GA4_SOURCES) {
      for (const device of GA4_DEVICES) {
        const devFactor = device === 'mobile' ? 0.5 : device === 'desktop' ? 0.4 : 0.1;
        const country = pick(GA4_COUNTRIES);
        const campaign = src.medium === 'cpc' ? pick(GOOGLE_CAMPAIGNS.slice(0, 5)).name : '(not set)';
        const event = pick(GA4_EVENTS);
        const sessions = Math.round(noise(src.baseSessions * devFactor * dow * mt * 0.5));
        const activeUsers = Math.round(sessions * noise(0.8, 0.1));
        const engagedSessions = Math.round(sessions * noise(0.55, 0.1));
        const eventCount = Math.round(sessions * noise(3.5, 0.2));
        const conversions = Math.round(sessions * noise(0.03, 0.2));
        const revenue = parseFloat((conversions * noise(55, 0.3)).toFixed(2));
        const engRate = parseFloat((engagedSessions / Math.max(sessions, 1)).toFixed(4));
        const avgDuration = parseFloat(noise(120, 0.3).toFixed(1));
        ga4Rows.push([dateStr(date), country, device, src.source, src.medium, campaign, event, activeUsers, sessions, engagedSessions, eventCount, conversions, revenue, engRate, avgDuration]);
      }
    }
  }
  await batchInsert(conn, 'BRONZE_V2.GA4_EVENTS',
    ['DATE', 'COUNTRY', 'DEVICE_CATEGORY', 'SESSION_SOURCE', 'SESSION_MEDIUM', 'CAMPAIGN_NAME', 'EVENT_NAME', 'ACTIVE_USERS', 'SESSIONS', 'ENGAGED_SESSIONS', 'EVENT_COUNT', 'CONVERSIONS', 'TOTAL_REVENUE', 'ENGAGEMENT_RATE', 'AVG_SESSION_DURATION'],
    ga4Rows
  );

  // --- GSC ---
  console.log('Seeding GSC...');
  const gscRows = [];
  const GSC_PAGES = ['/', '/portatiles', '/moviles', '/auriculares', '/ofertas', '/tablets', '/tv', '/accesorios'];
  for (const date of DATES) {
    const dow = dowFactor(date);
    const mt = monthTrend(date);
    for (const q of GSC_QUERIES) {
      const country = pick(['ESP', 'FRA', 'DEU', 'ITA', 'PRT']);
      const device = pick(['DESKTOP', 'MOBILE', 'TABLET']);
      const page = `https://tienda-electronica.es${pick(GSC_PAGES)}`;
      const impressions = Math.round(noise(q.baseImpressions * dow * mt * 0.3));
      const clicks = Math.round(noise(q.baseClicks * dow * mt * 0.3));
      const ctr = parseFloat((clicks / Math.max(impressions, 1)).toFixed(4));
      const position = parseFloat(noise(q.basePosition, 0.1).toFixed(1));
      gscRows.push([dateStr(date), q.query, page, country, device, clicks, impressions, ctr, position]);
    }
  }
  await batchInsert(conn, 'BRONZE_V2.GSC_PERFORMANCE',
    ['DATE', 'QUERY', 'PAGE', 'COUNTRY', 'DEVICE', 'CLICKS', 'IMPRESSIONS', 'CTR', 'POSITION'],
    gscRows
  );

  // --- CRM ---
  console.log('Seeding CRM...');
  const accountRows = [];
  for (let i = 1; i <= 25; i++) {
    accountRows.push([`ACC-${String(i).padStart(3, '0')}`, `Empresa ${pick(['Tech', 'Digital', 'Solutions', 'Group', 'Labs'])} ${i}`, pick(INDUSTRIES), `https://empresa${i}.com`, pick(['Spain', 'France', 'Germany', 'Italy']), pick(['Madrid', 'Barcelona', 'Paris', 'Berlin', 'Milan']), randInt(100000, 5000000), randInt(10, 500), `2025-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`]);
  }
  await batchInsert(conn, 'BRONZE_V2.CRM_ACCOUNTS',
    ['ACCOUNT_ID', 'ACCOUNT_NAME', 'INDUSTRY', 'WEBSITE', 'COUNTRY', 'CITY', 'ANNUAL_REVENUE', 'EMPLOYEE_COUNT', 'CREATED_DATE'],
    accountRows
  );

  const contactRows = [];
  const firstNames = ['Maria', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofia', 'David', 'Elena', 'Jorge'];
  const lastNames = ['Garcia', 'Martinez', 'Lopez', 'Rodriguez', 'Sanchez', 'Fernandez', 'Gonzalez', 'Diaz', 'Moreno', 'Ruiz'];
  for (let i = 1; i <= 40; i++) {
    const fn = pick(firstNames), ln = pick(lastNames);
    contactRows.push([`CON-${String(i).padStart(3, '0')}`, fn, ln, `${fn.toLowerCase()}.${ln.toLowerCase()}@empresa${randInt(1, 25)}.com`, `+34 6${randInt(10000000, 99999999)}`, `ACC-${String(randInt(1, 25)).padStart(3, '0')}`, pick(['CEO', 'CMO', 'CTO', 'Marketing Manager', 'Director', 'VP Sales']), `2025-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`]);
  }
  await batchInsert(conn, 'BRONZE_V2.CRM_CONTACTS',
    ['CONTACT_ID', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'ACCOUNT_ID', 'JOB_TITLE', 'CREATED_DATE'],
    contactRows
  );

  const leadRows = [];
  for (let i = 1; i <= 60; i++) {
    const fn = pick(firstNames), ln = pick(lastNames);
    const status = pick(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted']);
    const convertedDate = status === 'Converted' ? `2026-${String(randInt(1, 3)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}` : null;
    leadRows.push([`LEAD-${String(i).padStart(3, '0')}`, fn, ln, `Empresa ${pick(['Digital', 'Tech', 'Solutions'])} ${randInt(1, 50)}`, `${fn.toLowerCase()}@lead${i}.com`, pick(LEAD_SOURCES_CRM), status, pick(INDUSTRIES), pick(['Spain', 'France', 'Germany']), `2026-${String(randInt(1, 3)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`, convertedDate]);
  }
  await batchInsert(conn, 'BRONZE_V2.CRM_LEADS',
    ['LEAD_ID', 'FIRST_NAME', 'LAST_NAME', 'COMPANY', 'EMAIL', 'LEAD_SOURCE', 'STATUS', 'INDUSTRY', 'COUNTRY', 'CREATED_DATE', 'CONVERTED_DATE'],
    leadRows
  );

  const oppRows = [];
  for (let i = 1; i <= 35; i++) {
    const stage = pick(STAGES);
    const prob = stage === 'Closed Won' ? 100 : stage === 'Closed Lost' ? 0 : randInt(10, 80);
    const amount = randInt(5000, 150000);
    oppRows.push([`OPP-${String(i).padStart(3, '0')}`, `Oportunidad ${pick(['Implementacion', 'Consultoria', 'Licencias', 'Proyecto', 'Expansion'])} ${i}`, `ACC-${String(randInt(1, 25)).padStart(3, '0')}`, stage, amount, `2026-${String(randInt(2, 6)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`, prob, pick(LEAD_SOURCES_CRM), `2026-${String(randInt(1, 2)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`, `2026-03-${String(randInt(1, 6)).padStart(2, '0')}`, `OWNER-${String(randInt(1, 5)).padStart(3, '0')}`]);
  }
  await batchInsert(conn, 'BRONZE_V2.CRM_OPPORTUNITIES',
    ['OPPORTUNITY_ID', 'OPPORTUNITY_NAME', 'ACCOUNT_ID', 'STAGE', 'AMOUNT', 'CLOSE_DATE', 'PROBABILITY', 'LEAD_SOURCE', 'CREATED_DATE', 'LAST_MODIFIED_DATE', 'OWNER_ID'],
    oppRows
  );

  conn.destroy();
  console.log('\nAll Bronze data seeded!');
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
