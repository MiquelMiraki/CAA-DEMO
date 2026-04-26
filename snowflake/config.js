const snowflake = require('snowflake-sdk');
snowflake.configure({ logLevel: 'OFF' });

function getConnection() {
  const path = require('path');
  const fs = require('fs');
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

  const config = {
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    database: process.env.SNOWFLAKE_DATABASE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  };

  // Prefer key-pair auth (no MFA, no codes). Fall back to password+TOTP if no key.
  // Production: SNOWFLAKE_PRIVATE_KEY (raw content env var). Local dev: SNOWFLAKE_PRIVATE_KEY_PATH.
  const rawKey = process.env.SNOWFLAKE_PRIVATE_KEY;
  const keyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
  if (rawKey || keyPath) {
    let pk;
    if (rawKey) {
      pk = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    } else {
      const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(__dirname, '..', keyPath);
      pk = fs.readFileSync(resolvedPath, 'utf8');
    }
    config.authenticator = 'SNOWFLAKE_JWT';
    config.privateKey = pk;
  } else {
    config.password = process.env.SNOWFLAKE_PASSWORD;
    if (process.env.SNOWFLAKE_PASSCODE) config.passcode = process.env.SNOWFLAKE_PASSCODE;
  }
  return snowflake.createConnection(config);
}

function connect(conn) {
  return new Promise((resolve, reject) => {
    conn.connect((err, c) => err ? reject(err) : resolve(c));
  });
}

function query(conn, sql) {
  return new Promise((resolve, reject) => {
    conn.execute({ sqlText: sql, complete: (err, stmt, rows) => err ? reject(err) : resolve(rows) });
  });
}

async function batchInsert(conn, table, columns, rows, batchSize = 500) {
  const colStr = columns.join(', ');
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.map(r => `(${r.map(v => v === null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ')})`).join(',\n');
    await query(conn, `INSERT INTO ${table} (${colStr}) VALUES ${values}`);
    process.stdout.write(`  ${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length} rows\r`);
  }
  console.log(`  ${table}: ${rows.length} rows inserted`);
}

module.exports = { getConnection, connect, query, batchInsert };
