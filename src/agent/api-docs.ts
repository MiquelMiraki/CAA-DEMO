import { Router, Request, Response } from 'express';

const router = Router();

const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'CAA Analytics API',
    description: 'Public API for accessing cross-channel advertising analytics data. Authenticate with an API key via the `X-API-Key` header.',
    version: '1.0.0',
    contact: { name: 'Miraki AI', url: 'https://miraki.ai' },
  },
  servers: [
    { url: '/api/v1', description: 'Production' },
  ],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          data: { description: 'Response payload' },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              schema: { type: 'string' },
              count: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
            },
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    parameters: {
      client: { name: 'client', in: 'query', schema: { type: 'string', default: 'GOLD' }, description: 'Client schema (e.g. GOLD, GOLD_ACME)' },
      from: { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start date (YYYY-MM-DD)' },
      to: { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'End date (YYYY-MM-DD)' },
      limit: { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 }, description: 'Max rows to return' },
      offset: { name: 'offset', in: 'query', schema: { type: 'integer', default: 0, minimum: 0 }, description: 'Number of rows to skip' },
      channel: { name: 'channel', in: 'query', schema: { type: 'string', enum: ['Google Ads', 'Meta Ads', 'Microsoft Ads'] }, description: 'Filter by channel' },
    },
  },
  paths: {
    '/kpi': {
      get: {
        tags: ['Overview'],
        summary: 'Executive KPIs',
        description: 'Aggregated spend, conversions, revenue, and ROAS. Pass date range to recompute from daily data.',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
        ],
        responses: {
          200: { description: 'KPI data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/channels/daily': {
      get: {
        tags: ['Channels'],
        summary: 'Daily channel metrics',
        description: 'Daily spend, clicks, impressions, conversions by channel.',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/channels/monthly': {
      get: {
        tags: ['Channels'],
        summary: 'Monthly channel summary',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/channels/weekly': {
      get: {
        tags: ['Channels'],
        summary: 'Weekly channel trends',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/campaigns': {
      get: {
        tags: ['Campaigns'],
        summary: 'Campaign rankings',
        description: 'Top campaigns by ROAS with optional channel and date filters.',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/channel' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/campaigns/daily': {
      get: {
        tags: ['Campaigns'],
        summary: 'Daily campaign metrics',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/channel' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/devices': {
      get: {
        tags: ['Performance'],
        summary: 'Device breakdown',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/placements': {
      get: {
        tags: ['Performance'],
        summary: 'Placement breakdown (Meta)',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/creatives': {
      get: {
        tags: ['Performance'],
        summary: 'Creative performance',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/keywords': {
      get: {
        tags: ['Performance'],
        summary: 'Keyword performance',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/budget-pacing': {
      get: {
        tags: ['Budget'],
        summary: 'Budget pacing by channel',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/funnel': {
      get: {
        tags: ['Conversion'],
        summary: 'Conversion funnel',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/change-audit': {
      get: {
        tags: ['Activity'],
        summary: 'Change audit log',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/analytics/overview': {
      get: {
        tags: ['Web Analytics'],
        summary: 'GA4 overview metrics',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/analytics/daily': {
      get: {
        tags: ['Web Analytics'],
        summary: 'GA4 daily metrics',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/seo': {
      get: {
        tags: ['SEO'],
        summary: 'SEO performance by page',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/seo/daily': {
      get: {
        tags: ['SEO'],
        summary: 'SEO daily metrics',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/crm/pipeline': {
      get: {
        tags: ['CRM'],
        summary: 'CRM pipeline stages',
        parameters: [{ $ref: '#/components/parameters/client' }],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/crm/leads': {
      get: {
        tags: ['CRM'],
        summary: 'CRM lead funnel',
        parameters: [{ $ref: '#/components/parameters/client' }],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/attribution': {
      get: {
        tags: ['Attribution'],
        summary: 'Attribution by model',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/channel-overlap': {
      get: {
        tags: ['Attribution'],
        summary: 'Channel overlap matrix',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/alerts': {
      get: {
        tags: ['Monitoring'],
        summary: 'Alerts and anomalies',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/forecast': {
      get: {
        tags: ['Monitoring'],
        summary: 'Forecast projections',
        parameters: [
          { $ref: '#/components/parameters/client' },
          { $ref: '#/components/parameters/from' },
          { $ref: '#/components/parameters/to' },
          { $ref: '#/components/parameters/limit' },
          { $ref: '#/components/parameters/offset' },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/keys': {
      get: {
        tags: ['Admin'],
        summary: 'List API keys',
        description: 'Requires admin scope.',
        responses: { 200: { description: 'Success' }, 403: { description: 'Forbidden' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create API key',
        description: 'Requires admin scope.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', description: 'Human-readable key name' },
                  client_schema: { type: 'string', default: 'GOLD', description: 'Schema this key can access (* for all)' },
                  scopes: { type: 'array', items: { type: 'string', enum: ['read', 'write', 'admin'] }, default: ['read'] },
                  rate_limit: { type: 'integer', default: 60, description: 'Requests per minute' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Key created' }, 403: { description: 'Forbidden' } },
      },
    },
    '/keys/{id}': {
      delete: {
        tags: ['Admin'],
        summary: 'Revoke API key',
        description: 'Requires admin scope.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Key revoked' }, 404: { description: 'Not found' } },
      },
    },
  },
};

// GET /api/docs — OpenAPI JSON spec
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(OPENAPI_SPEC);
});

// GET /api/docs — Swagger UI HTML page
router.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CAA Analytics API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #0a0a0a; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { max-width: 1200px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;
  res.type('html').send(html);
});

export default router;
