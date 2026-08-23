import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { runScrapers, type ScrapedJob } from './scraperService';
import { evaluateJobFit, type JobEvaluation } from './aiEvaluator';
import { sendJobDigestEmail } from './emailService';
import { getProcessedUrls, markUrlsAsProcessed } from './cacheService';

dotenv.config();

async function executePipeline() {
  console.log('==================================================');
  console.log('🚀 Executing Job Discovery & AI Evaluation Engine');
  console.log('==================================================\n');

  const profilePath = path.resolve(process.cwd(), 'discovery-engine', 'candidateProfile.json');
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile configuration file missing at ${profilePath}`);
  }
  const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

  // Step 1: Run Web Scrapers
  console.log('[Pipeline] Step 1: Scraping target job portals...');
  const scrapedJobs: ScrapedJob[] = await runScrapers();
  console.log(`[Pipeline] Retrieved ${scrapedJobs.length} raw listings.\n`);

  // Step 2: Deduplication Filter
  const processedUrls = getProcessedUrls();
  const newJobs = scrapedJobs.filter((job) => !processedUrls.includes(job.url));
  console.log(`[Pipeline] Deduplication: ${scrapedJobs.length - newJobs.length} skipped, ${newJobs.length} new listings to evaluate.\n`);

  if (newJobs.length === 0) {
    console.log('[Pipeline] No new job listings found. Pipeline execution complete.');
    return;
  }

  // Step 3: Run AI Evaluations
  console.log('[Pipeline] Step 3: Evaluating matches via Gemini AI...');
  const evaluations: JobEvaluation[] = [];

  for (const job of newJobs) {
    const result = await evaluateJobFit(job, profileData.candidate.masterResume);
    evaluations.push(result);
  }

  console.log(`[Pipeline] Completed ${evaluations.length} job evaluations.\n`);

  // Step 4: Dispatch Digest Email
  console.log('[Pipeline] Step 4: Triggering email service...');
  await sendJobDigestEmail(evaluations);

  // Step 5: Update Cache Store
  const evaluatedUrls = newJobs.map((job) => job.url);
  markUrlsAsProcessed(evaluatedUrls);
  console.log(`[Pipeline] Cached ${evaluatedUrls.length} newly processed job signatures.`);

  console.log('\n==================================================');
  console.log('✅ End-to-end pipeline run completed.');
  console.log('==================================================');
}

executePipeline().catch((err) => {
  console.error('❌ Pipeline failed:', err);
});