import snowflake from 'snowflake-sdk';

snowflake.configure({ logLevel: 'OFF' });

let connection: snowflake.Connection | null = null;

function getConnection(): snowflake.Connection {
  if (!connection) {
    const account = process.env.SNOWFLAKE_ACCOUNT;
    const username = process.env.SNOWFLAKE_USERNAME;
    const password = process.env.SNOWFLAKE_PASSWORD;
    const database = process.env.SNOWFLAKE_DATABASE;
    const warehouse = process.env.SNOWFLAKE_WAREHOUSE;

    if (!account || !username || !password || !database || !warehouse) {
      throw new Error('Missing Snowflake environment variables');
    }

    connection = snowflake.createConnection({ account, username, password, database, warehouse });
  }
  return connection;
}

export async function connectSnowflake(): Promise<void> {
  const conn = getConnection();
  return new Promise((resolve, reject) => {
    conn.connect((err) => {
      if (err) reject(new Error(`Snowflake connection failed: ${err.message}`));
      else resolve();
    });
  });
}

export async function executeQuery(sql: string): Promise<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number }> {
  const conn = getConnection();

  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) {
          reject(new Error(`SQL Error: ${err.message}\nQuery: ${sql}`));
          return;
        }
        const columns = (stmt?.getColumns() ?? []).map((c: { getName: () => string }) => c.getName());
        resolve({
          columns,
          rows: (rows || []) as Record<string, unknown>[],
          rowCount: rows?.length || 0,
        });
      },
    });
  });
}

export async function getTableSchema(tableName: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const result = await executeQuery(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
     FROM CAA_DB.INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'GOLD' AND TABLE_NAME = '${tableName.toUpperCase()}'
     ORDER BY ORDINAL_POSITION`
  );
  return result;
}

export async function listGoldTables(): Promise<string[]> {
  const result = await executeQuery(
    `SELECT TABLE_NAME, ROW_COUNT
     FROM CAA_DB.INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = 'GOLD' AND TABLE_TYPE = 'BASE TABLE'
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
