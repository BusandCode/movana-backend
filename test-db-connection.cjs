// Standalone connection test — bypasses Prisma entirely to isolate
// whether the problem is the raw pg connection or Prisma's adapter layer.
//
// Run with: node test-db-connection.js
// (run this from your movana-backend folder, where `pg` is already installed)

const { Client } = require('pg');

const config = {
  user: 'fac20af5a2a5e8f28211d7c5cf769210232dd09aee86319f01b4e8d8e7733db5',
  password: 'sk_iFZVxtKiDMdjqsKC2ZjvT',
  host: 'pooled.db.prisma.io',
  port: 5432,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

console.log('Attempting connection to', config.host, '...');

const client = new Client(config);

client
  .connect()
  .then(async () => {
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('✅ Query succeeded:', res.rows[0]);
    await client.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed.');
    console.error('  message:', err.message);
    console.error('  code:', err.code);
    console.error('  full error:', err);
    process.exit(1);
  });
