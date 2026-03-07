require('dotenv').config();
const snowflake = require('snowflake-sdk');

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
});

function query(sql) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    });
  });
}

async function explore() {
  // Connect
  await new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
  console.log('Connected to Snowflake!\n');

  // List all schemas
  console.log('=== SCHEMAS ===');
  const schemas = await query('SHOW SCHEMAS IN DATABASE CAA_DB');
  schemas.forEach(s => console.log(`  - ${s.name}`));

  // List all tables per schema
  console.log('\n=== TABLES ===');
  const tables = await query(`SELECT TABLE_SCHEMA, TABLE_NAME, ROW_COUNT, BYTES
    FROM CAA_DB.INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_SCHEMA, TABLE_NAME`);
  tables.forEach(t => console.log(`  ${t.TABLE_SCHEMA}.${t.TABLE_NAME} — ${t.ROW_COUNT} rows, ${Math.round((t.BYTES||0)/1024)} KB`));

  // For each table, show columns
  console.log('\n=== COLUMN DETAILS ===');
  for (const t of tables) {
    console.log(`\n--- ${t.TABLE_SCHEMA}.${t.TABLE_NAME} ---`);
    const cols = await query(`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM CAA_DB.INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${t.TABLE_SCHEMA}' AND TABLE_NAME = '${t.TABLE_NAME}'
      ORDER BY ORDINAL_POSITION`);
    cols.forEach(c => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE}) ${c.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'}`));
  }

  // Sample data from each table (first 3 rows)
  console.log('\n=== SAMPLE DATA (3 rows per table) ===');
  for (const t of tables) {
    console.log(`\n--- ${t.TABLE_SCHEMA}.${t.TABLE_NAME} ---`);
    const sample = await query(`SELECT * FROM ${t.TABLE_SCHEMA}.${t.TABLE_NAME} LIMIT 3`);
    sample.forEach(row => console.log(`  ${JSON.stringify(row)}`));
  }

  connection.destroy();
  console.log('\nDone!');
}

explore().catch(err => {
  console.error('Error:', err.message);
  connection.destroy();
  process.exit(1);
});
