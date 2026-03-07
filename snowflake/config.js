const snowflake = require('snowflake-sdk');
snowflake.configure({ logLevel: 'OFF' });

function getConnection() {
  require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
  return snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,
    database: process.env.SNOWFLAKE_DATABASE,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  });
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
