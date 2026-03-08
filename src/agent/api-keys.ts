import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from './snowflake-client';

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  client_schema: string;
  scopes: string[];
  rate_limit: number;    // requests per minute
  created_at: string;
  last_used_at: string | null;
  active: boolean;
}

// In-memory store — persisted to Snowflake when available, falls back to memory
const apiKeys = new Map<string, ApiKey>();
let initialized = false;

/** Generate a new API key with prefix `caa_` */
export function generateApiKey(): string {
  return `caa_${uuidv4().replace(/-/g, '')}`;
}

/** Try to load API keys from Snowflake GOLD.API_KEYS table */
export async function initApiKeys(): Promise<void> {
  if (initialized) return;
  try {
    const result = await executeQuery(`SELECT * FROM GOLD.API_KEYS WHERE ACTIVE = TRUE`);
    for (const row of result.rows as any[]) {
      const key: ApiKey = {
        id: row.ID,
        key: row.API_KEY,
        name: row.NAME,
        client_schema: row.CLIENT_SCHEMA || 'GOLD',
        scopes: (row.SCOPES || 'read').split(','),
        rate_limit: row.RATE_LIMIT || 60,
        created_at: row.CREATED_AT,
        last_used_at: row.LAST_USED_AT,
        active: true,
      };
      apiKeys.set(key.key, key);
    }
    initialized = true;
    console.log(`Loaded ${apiKeys.size} API key(s) from Snowflake.`);
  } catch {
    // Table doesn't exist yet — use env-based master key
    initialized = true;
    const masterKey = process.env.CAA_API_MASTER_KEY;
    if (masterKey) {
      apiKeys.set(masterKey, {
        id: 'master',
        key: masterKey,
        name: 'Master Key',
        client_schema: '*',
        scopes: ['read', 'write', 'admin'],
        rate_limit: 120,
        created_at: new Date().toISOString(),
        last_used_at: null,
        active: true,
      });
      console.log('Using master API key from CAA_API_MASTER_KEY env var.');
    } else {
      // Auto-generate a master key for first-time setup
      const autoKey = generateApiKey();
      apiKeys.set(autoKey, {
        id: 'auto',
        key: autoKey,
        name: 'Auto-generated Master Key',
        client_schema: '*',
        scopes: ['read', 'write', 'admin'],
        rate_limit: 120,
        created_at: new Date().toISOString(),
        last_used_at: null,
        active: true,
      });
      console.log(`\n⚠️  No CAA_API_MASTER_KEY set. Auto-generated key for Public API:`);
      console.log(`   ${autoKey}`);
      console.log(`   Add CAA_API_MASTER_KEY=${autoKey} to .env to persist it.\n`);
    }
  }
}

/** Validate an API key and return its record */
export function validateApiKey(key: string): ApiKey | null {
  const record = apiKeys.get(key);
  if (!record || !record.active) return null;
  record.last_used_at = new Date().toISOString();
  return record;
}

/** Check if a key has access to a specific schema */
export function hasSchemaAccess(apiKey: ApiKey, schema: string): boolean {
  if (apiKey.client_schema === '*') return true;
  return apiKey.client_schema.toUpperCase() === schema.toUpperCase();
}

/** Check if a key has a required scope */
export function hasScope(apiKey: ApiKey, scope: string): boolean {
  return apiKey.scopes.includes(scope) || apiKey.scopes.includes('admin');
}

/** List all active keys (admin only) */
export function listApiKeys(): Omit<ApiKey, 'key'>[] {
  return Array.from(apiKeys.values())
    .filter(k => k.active)
    .map(({ key, ...rest }) => ({ ...rest, key: key.slice(0, 8) + '...' }));
}

/** Create a new API key */
export function createApiKey(name: string, clientSchema: string, scopes: string[] = ['read'], rateLimit = 60): ApiKey {
  const newKey: ApiKey = {
    id: uuidv4(),
    key: generateApiKey(),
    name,
    client_schema: clientSchema,
    scopes,
    rate_limit: rateLimit,
    created_at: new Date().toISOString(),
    last_used_at: null,
    active: true,
  };
  apiKeys.set(newKey.key, newKey);
  return newKey;
}

/** Revoke an API key by ID */
export function revokeApiKey(id: string): boolean {
  for (const [key, record] of apiKeys) {
    if (record.id === id) {
      record.active = false;
      apiKeys.delete(key);
      return true;
    }
  }
  return false;
}
