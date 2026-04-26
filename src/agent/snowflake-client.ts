import snowflake from 'snowflake-sdk';
import * as fs from 'fs';
import * as path from 'path';

snowflake.configure({ logLevel: 'OFF' });

let connection: snowflake.Connection | null = null;

function createConnection(): snowflake.Connection {
  const account = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USERNAME;
  const database = process.env.SNOWFLAKE_DATABASE;
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE;

  if (!account || !username || !database || !warehouse) {
    throw new Error('Missing Snowflake environment variables');
  }

  const schema = process.env.SNOWFLAKE_DEFAULT_SCHEMA || 'GOLD';
  const opts: snowflake.ConnectionOptions = { account, username, database, warehouse, schema };

  // Prefer key-pair auth (no MFA, reliable reconnects). Fall back to password+TOTP if no key configured.
  // Production (Railway): use SNOWFLAKE_PRIVATE_KEY env var with raw key content.
  // Local dev: use SNOWFLAKE_PRIVATE_KEY_PATH pointing to a .p8 file.
  const rawKey = process.env.SNOWFLAKE_PRIVATE_KEY;
  const keyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
  if (rawKey || keyPath) {
    let pk: string;
    if (rawKey) {
      // Allow stripping surrounding quotes and unescaping literal \n that some env stores require
      pk = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    } else {
      const resolved = path.isAbsolute(keyPath!) ? keyPath! : path.resolve(process.cwd(), keyPath!);
      pk = fs.readFileSync(resolved, 'utf8');
    }
    (opts as snowflake.ConnectionOptions & { authenticator?: string; privateKey?: string }).authenticator = 'SNOWFLAKE_JWT';
    (opts as snowflake.ConnectionOptions & { authenticator?: string; privateKey?: string }).privateKey = pk;
  } else {
    const password = process.env.SNOWFLAKE_PASSWORD;
    if (!password) throw new Error('Missing SNOWFLAKE_PASSWORD or SNOWFLAKE_PRIVATE_KEY_PATH');
    (opts as snowflake.ConnectionOptions & { password?: string }).password = password;
    if (process.env.SNOWFLAKE_PASSCODE) {
      (opts as snowflake.ConnectionOptions & { passcode?: string }).passcode = process.env.SNOWFLAKE_PASSCODE;
    }
  }
  return snowflake.createConnection(opts);
}

async function connectNew(): Promise<snowflake.Connection> {
  const conn = createConnection();
  return new Promise((resolve, reject) => {
    conn.connect((err) => {
      if (err) reject(new Error(`Snowflake connection failed: ${err.message}`));
      else resolve(conn);
    });
  });
}

export async function connectSnowflake(): Promise<void> {
  connection = await connectNew();
}

async function getActiveConnection(): Promise<snowflake.Connection> {
  if (!connection || !connection.isUp()) {
    console.log('[Snowflake] Connection lost — reconnecting...');
    try {
      connection = await connectNew();
      console.log('[Snowflake] Reconnected.');
    } catch (err) {
      connection = null;
      throw err;
    }
  }
  return connection;
}

export async function executeQuery(sql: string): Promise<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number }> {
  const conn = await getActiveConnection();

  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      complete: async (err, stmt, rows) => {
        if (err) {
          // If the connection was terminated, reconnect and retry once
          if (err.message?.includes('terminated') || err.message?.includes('closed') || err.message?.includes('lost')) {
            console.log('[Snowflake] Query failed with connection error — retrying after reconnect...');
            try {
              connection = null;
              const freshConn = await getActiveConnection();
              freshConn.execute({
                sqlText: sql,
                complete: (err2, stmt2, rows2) => {
                  if (err2) {
                    reject(new Error(`SQL Error: ${err2.message}\nQuery: ${sql}`));
                    return;
                  }
                  const columns = (stmt2?.getColumns() ?? []).map((c: { getName: () => string }) => c.getName());
                  resolve({ columns, rows: (rows2 || []) as Record<string, unknown>[], rowCount: rows2?.length || 0 });
                },
              });
            } catch (reconnErr) {
              reject(new Error(`SQL Error: ${err.message}\nQuery: ${sql}`));
            }
            return;
          }
          reject(new Error(`SQL Error: ${err.message}\nQuery: ${sql}`));
          return;
        }
        const columns = (stmt?.getColumns() ?? []).map((c: { getName: () => string }) => c.getName());
        resolve({ columns, rows: (rows || []) as Record<string, unknown>[], rowCount: rows?.length || 0 });
      },
    });
  });
}

export async function getTableSchema(tableName: string, schema?: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const db = process.env.SNOWFLAKE_DATABASE || 'CAA_DB';
  const s = schema || process.env.SNOWFLAKE_DEFAULT_SCHEMA || 'GOLD';
  const result = await executeQuery(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
     FROM ${db}.INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = '${s}' AND TABLE_NAME = '${tableName.toUpperCase()}'
     ORDER BY ORDINAL_POSITION`
  );
  return result;
}

export async function listGoldTables(schema?: string): Promise<string[]> {
  const db = process.env.SNOWFLAKE_DATABASE || 'CAA_DB';
  const s = schema || process.env.SNOWFLAKE_DEFAULT_SCHEMA || 'GOLD';
  const result = await executeQuery(
    `SELECT TABLE_NAME, ROW_COUNT
     FROM ${db}.INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = '${s}' AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`
  );
  return result.rows.map((r) => `${r.TABLE_NAME} (${r.ROW_COUNT} rows)`);
}

export function disconnectSnowflake(): void {
  if (connection) {
    connection.destroy(() => {});
    connection = null;
  }
}
