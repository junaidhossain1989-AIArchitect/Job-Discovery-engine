// testInsert.ts
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  await client.connect();
  await client.query(
    `INSERT INTO jobs (title, company, fit_score, url) 
     VALUES ($1, $2, $3, $4) ON CONFLICT (url) DO NOTHING`,
    ['Test Engineer', 'Test Corp', 95, 'https://example.com/job/1']
  );
  console.log('✅ Manual insert complete');
  await client.end();
}

test();