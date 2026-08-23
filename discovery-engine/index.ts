import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { runScrapers, type ScrapedJob } from './scraperService.js';
import { evaluateJobFit, type JobEvaluation } from './aiEvaluator.js';
import { sendJobDigestEmail } from './emailService.js';
import { getProcessedUrls, markUrlsAsProcessed } from './cacheService.js';

dotenv.config();

const { Client } = pg;

async function executePipeline() {
  console.log('==================================================');
  console.log('🚀 Executing Job Discovery & AI Evaluation Engine');
  console.log('==================================================\n');

  // 1. Load Candidate Profile Configuration
  const profilePath = path.resolve(process.cwd(), 'discovery-engine', 'candidateProfile.json');
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile configuration file missing at ${profilePath}`);
  }
  const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

  // 2. Read Threshold from Environment Variables
  const fitThreshold = Number(process.env.FIT_SCORE_THRESHOLD) || 70;

  // 3. Connect to PostgreSQL
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to PostgreSQL database.\n');

  try {
    // 4. Fetch Raw Scraped Jobs
    console.log('🔍 Step 1: Running Scrapers...');
    const rawJobs: ScrapedJob[] = await runScrapers();
    console.log(`Found ${rawJobs.length} raw jobs.\n`);

    // 5. Filter Out Cached (Already Processed) Jobs
    const processedUrls = getProcessedUrls();
    const newJobs = rawJobs.filter((job) => !processedUrls.includes(job.url));
    console.log(`ℹ️ ${newJobs.length} new jobs to evaluate after cache filter.\n`);

    const qualifiedMatches: Array<{ job: ScrapedJob; evaluation: JobEvaluation }> = [];

    // 6. Evaluate Jobs & Save Matches to DB
    console.log('🤖 Step 2: Evaluating Jobs & Saving to Database...');
    for (const job of newJobs) {
      try {
        const evaluation = await evaluateJobFit(job, profileData.candidate.masterResume);
        console.log(`-> Job: "${job.title}" at ${job.company} | Score: ${evaluation.fitScore}/100`);

        if (evaluation.fitScore >= fitThreshold) {
          console.log(`   💾 Saving high-match job (${evaluation.fitScore} >= ${fitThreshold}) to DB...`);

          await client.query(
            `INSERT INTO jobs (title, company, fit_score, url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (url) DO NOTHING`,
            [job.title, job.company, evaluation.fitScore, job.url]
          );

          qualifiedMatches.push({ job, evaluation });
        }
      } catch (err) {
        console.error(`❌ Failed to evaluate job: ${job.title}`, err);
      }
    }

    // 7. Update Cache File
    markUrlsAsProcessed(newJobs.map((j) => j.url));
    console.log('\n💾 Updated processed jobs cache.');

    // 8. Send Email Digest for High-Match Jobs
    if (qualifiedMatches.length > 0) {
      console.log(`\n📧 Step 3: Sending email digest for ${qualifiedMatches.length} matching jobs...`);
      await sendJobDigestEmail(qualifiedMatches.map((m) => m.evaluation));
      console.log('✅ Digest email dispatched successfully.');
    } else {
      console.log('\nℹ️ No new jobs met the fit score threshold today. Email skipped.');
    }

  } finally {
    // 9. Close Database Connection
    await client.end();
    console.log('\n🔒 Database connection closed.');
    console.log('==================================================');
    console.log('🎉 Job Discovery Pipeline Complete');
    console.log('==================================================');
  }
}

executePipeline().catch(console.error);