import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ScrapedJob } from './scraperService';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'discovery-engine', '.env') });

export interface JobEvaluation {
  jobTitle: string;
  company: string;
  jobUrl: string;
  fitScore: number;
  decision: 'APPLY' | 'CONSIDER' | 'SKIP';
  summaryReason: string;
  matchingSkills: string[];
  missingSkillsGaps: string[];
  recommendedAction: string;
}

export async function evaluateJobFit(
  job: ScrapedJob,
  candidateResume: string
): Promise<JobEvaluation> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing from environment variables.');
  }

  // Load prompt template specified in .env (defaults to v1.txt)
  const promptVersion = process.env.PROMPT_VERSION || 'v1.txt';
  const promptPath = path.resolve(process.cwd(), 'discovery-engine', 'prompts', promptVersion);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt template file not found at ${promptPath}`);
  }

  let promptTemplate = fs.readFileSync(promptPath, 'utf-8');

  // Dynamically interpolate placeholders
  const filledPrompt = promptTemplate
    .replace(/{{CANDIDATE_RESUME}}/g, candidateResume)
    .replace(/{{JOB_TITLE}}/g, job.title)
    .replace(/{{JOB_COMPANY}}/g, job.company)
    .replace(/{{JOB_LOCATION}}/g, job.location)
    .replace(/{{JOB_PORTAL}}/g, job.portal)
    .replace(/{{JOB_URL}}/g, job.url)
    .replace(/{{JOB_DESCRIPTION}}/g, job.description);

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  try {
    console.log(`[AI Evaluator] Evaluating "${job.title}" at ${job.company} (Prompt: ${promptVersion})...`);
    const result = await model.generateContent(filledPrompt);
    const textResponse = result.response.text();
    const parsedResult: JobEvaluation = JSON.parse(textResponse);

    // Apply configurable minimum threshold fallback override
    const minThreshold = parseInt(process.env.FIT_SCORE_THRESHOLD || '70', 10);
    if (parsedResult.fitScore < minThreshold && parsedResult.decision !== 'SKIP') {
      console.log(`[AI Evaluator] Match score (${parsedResult.fitScore}%) below threshold (${minThreshold}%). Overriding decision to SKIP.`);
      parsedResult.decision = 'SKIP';
    }

    return parsedResult;

  } catch (error: any) {
    console.error(`[AI Evaluator Error] Evaluation failed for ${job.title}:`, error.message);
    return {
      jobTitle: job.title,
      company: job.company,
      jobUrl: job.url || '#',
      fitScore: 0,
      decision: 'SKIP',
      summaryReason: `Evaluation failed: ${error.message}`,
      matchingSkills: [],
      missingSkillsGaps: [],
      recommendedAction: 'Retry evaluation manually.'
    };
  }
}