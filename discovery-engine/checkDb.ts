import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  await client.connect();
  const res = await client.query('SELECT * FROM jobs ORDER BY id DESC LIMIT 5;');
  console.log('Saved Jobs in DB:', res.rows);
  await client.end();
}

verify();