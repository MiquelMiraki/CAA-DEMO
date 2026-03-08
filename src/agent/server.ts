import express from 'express';
import cors from 'cors';
import { connectSnowflake, disconnectSnowflake } from './snowflake-client';
import { chat, ChatMessage } from './agent';
import dataRoutes from './data-routes';
import publicApi from './public-api';
import apiDocs from './api-docs';
import { initApiKeys } from './api-keys';
import { seedMissingTables } from './seed-tables';

const app = express();
app.use(cors());
app.use(express.json());

// Internal data API routes (used by frontend — no auth required)
app.use('/api/data', dataRoutes);

// Public API v1 (requires X-API-Key authentication)
app.use('/api/v1', publicApi);

// API documentation (Swagger UI)
app.use('/api/docs', apiDocs);

// In-memory session store (simple demo — use Redis in production)
const sessions = new Map<string, ChatMessage[]>();

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default', client } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Missing "message" field' });
    return;
  }

  // Validate client schema if provided
  const schema = client && /^GOLD[A-Z0-9_]*$/i.test(client) ? client.toUpperCase() : undefined;

  try {
    const history = sessions.get(sessionId) || [];
    console.log(`\n[${sessionId}] User: ${message}${schema ? ` (schema: ${schema})` : ''}`);

    const startTime = Date.now();
    const result = await chat(message, history, schema);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Save updated history
    sessions.set(sessionId, result.history);

    console.log(`[${sessionId}] Agent responded in ${elapsed}s (${result.queriesExecuted} queries)`);

    res.json({
      response: result.response,
      queriesExecuted: result.queriesExecuted,
      sqlQueries: result.sqlQueries,
      elapsed: parseFloat(elapsed),
    });
  } catch (err) {
    console.error('Chat error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Reset conversation
app.post('/api/reset', (req, res) => {
  const { sessionId = 'default' } = req.body;
  sessions.delete(sessionId);
  res.json({ status: 'reset', sessionId });
});

// Start server
const PORT = parseInt(process.env.PORT || '3001');

async function start() {
  // Validate required env vars
  const required = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USERNAME', 'SNOWFLAKE_PASSWORD', 'SNOWFLAKE_DATABASE', 'SNOWFLAKE_WAREHOUSE', 'OPENAI_API_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in all values.');
    process.exit(1);
  }

  console.log('Connecting to Snowflake...');
  await connectSnowflake();
  console.log('Snowflake connected.');

  // Initialize API keys for public API
  await initApiKeys();

  // Seed any missing Snowflake tables with synthetic data
  seedMissingTables().catch((err) => console.warn('[Seed] Non-fatal error:', err.message));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\nAnalytical Agent API running at http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log(`  POST /api/chat    — { message: "...", sessionId?: "..." }`);
    console.log(`  POST /api/reset   — { sessionId?: "..." }`);
    console.log(`  GET  /api/health  — health check`);
    console.log(`  GET  /api/v1/*    — Public API (requires X-API-Key header)`);
    console.log(`  GET  /api/docs    — Swagger UI documentation\n`);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  disconnectSnowflake();
  process.exit(0);
});

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
