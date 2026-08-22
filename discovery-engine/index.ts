import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { runScrapers, type ScrapedJob } from './scraperService';
import { evaluateJobFit, type JobEvaluation } from './aiEvaluator';
import { sendJobDigestEmail } from './emailService';

dotenv.config();

async function executePipeline() {
  console.log('==================================================');
  console.log('🚀 Executing Job Discovery & AI Evaluation Engine');
  console.log('==================================================\n');

  // Resolve config file path from process execution root
  const profilePath = path.resolve(process.cwd(), 'discovery-engine', 'candidateProfile.json');
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile configuration file missing at ${profilePath}`);
  }
  const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

  // Step 1: Run Web Scrapers
  console.log('[Pipeline] Step 1: Scraping target job portals...');
  const scrapedJobs: ScrapedJob[] = await runScrapers();
  console.log(`[Pipeline] Retrieved ${scrapedJobs.length} raw listings.\n`);

  // Step 2: Run AI Evaluations
  console.log('[Pipeline] Step 2: Evaluating matches via Gemini AI...');
  const evaluations: JobEvaluation[] = [];

  for (const job of scrapedJobs) {
    const result = await evaluateJobFit(job, profileData.candidate.masterResume);
    evaluations.push(result);
  }

  console.log(`[Pipeline] Completed ${evaluations.length} job evaluations.\n`);

  // Step 3: Dispatch Digest Email
  console.log('[Pipeline] Step 3: Triggering email service...');
  await sendJobDigestEmail(evaluations);

  console.log('\n==================================================');
  console.log('✅ End-to-end pipeline run completed.');
  console.log('==================================================');
}

executePipeline().catch((err) => {
  console.error('❌ Pipeline failed:', err);
});