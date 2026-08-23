import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Client } = pg;

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Bypasses self-signed certificate validation errors
    }
  });

  try {
    console.log('Connecting to AWS RDS PostgreSQL...');
    await client.connect();

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS jobs (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          company VARCHAR(255) NOT NULL,
          fit_score INT,
          url TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Creating "jobs" table if it does not exist...');
    await client.query(createTableQuery);
    console.log('✅ Table schema created successfully!');
  } catch (error) {
    console.error('❌ Failed to create table schema:', error);
  } finally {
    await client.end();
  }
}

setupDatabase();