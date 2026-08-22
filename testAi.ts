import fs from 'fs';
import path from 'path';
import { evaluateJobFit } from './discovery-engine/aiEvaluator';
import type { ScrapedJob } from './discovery-engine/scraperService';

// Resolve path to candidateProfile.json inside the discovery-engine folder
const profilePath = path.resolve(__dirname, 'discovery-engine', 'candidateProfile.json');

if (!fs.existsSync(profilePath)) {
  console.error(`❌ Config file not found at: ${profilePath}`);
  console.error('Please make sure candidateProfile.json is saved inside the discovery-engine folder.');
  process.exit(1);
}

const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

const sampleJob: ScrapedJob = {
  portal: 'LinkedIn Jobs',
  title: 'Senior Cloud Solution Architect',
  company: 'TechCorp Solutions',
  location: profileData.candidate.targetLocation,
  url: 'https://www.linkedin.com/jobs/view/123456',
  description: `
We are looking for a Senior Cloud Solution Architect in Perth. 
Requirements: 8+ years experience, deep expertise in AWS, Docker, Microservices, and solution design.
Nice to have: Azure experience and Terraform certification.
`
};

async function runTest() {
  console.log(`🤖 Loading candidate profile for "${profileData.candidate.name}"...`);
  const result = await evaluateJobFit(sampleJob, profileData.candidate.masterResume);
  console.log('\n--- AI Evaluation Result ---');
  console.log(JSON.stringify(result, null, 2));
}

runTest();