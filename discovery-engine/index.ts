import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { runScrapers, type ScrapedJob } from './scraperService.js';
import { evaluateJobFit, type JobEvaluation } from './aiEvaluator.js';
import { sendJobDigestEmail } from './emailService.js';
import { getProcessedUrls, markUrlsAsProcessed } from './cacheService.js';
import pg from 'pg';

// Initialize dotenv first so environment variables are available
dotenv.config();

const { Client } = pg;

async function executePipeline() {
  console.log('==================================================');
  console.log('🚀 Executing Job Discovery & AI Evaluation Engine');
  console.log('==================================================\n');

  const profilePath = path.resolve(process.cwd(), 'discovery-engine', 'candidateProfile.json');
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile configuration file missing at ${profilePath}`);
  }
  const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

  // Initialize Postgres Client
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    // 1. Run your scrapers to get jobs
    const rawJobs = await runScrapers();
    
    // 2. Loop through evaluated/matching jobs and insert into Postgres
    for (const job of rawJobs) {
      // Evaluate job logic here...
      const fitScore = 80; // Example fit score from your AI evaluation logic

      await client.query(
        `INSERT INTO jobs (title, company, fit_score, url) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (url) DO NOTHING`,
        [job.title, job.company, fitScore, job.url]
      );
    }
  } finally {
    // Always close the database connection when done
    await client.end();
  }
}

executePipeline().catch(console.error);