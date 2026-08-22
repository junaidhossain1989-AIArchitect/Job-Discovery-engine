import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ScrapedJob } from './scraperService';

// Automatically loads .env from process.cwd()
dotenv.config();

export interface JobEvaluation {
  jobTitle: string;
  company: string;
  fitScore: number; // 0 to 100
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
    throw new Error('GEMINI_API_KEY is missing from environment variables. Check your .env file.');
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const prompt = `
You are an expert AI Career Strategist and Executive Recruiter.
Evaluate how well the candidate's profile matches the job posting.

=== CANDIDATE RESUME / PROFILE ===
${candidateResume}

=== JOB LISTING ===
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Platform: ${job.portal}
URL: ${job.url}

Description:
${job.description}

REQUIREMENTS:
Return JSON in this EXACT structure:
{
  "jobTitle": "${job.title}",
  "company": "${job.company}",
  "fitScore": number (0 to 100),
  "decision": "APPLY" | "CONSIDER" | "SKIP",
  "summaryReason": "1-2 concise sentences explaining the verdict",
  "matchingSkills": ["skill 1", "skill 2"],
  "missingSkillsGaps": ["gap 1", "gap 2"],
  "recommendedAction": "Actionable advice for tailoring candidate application"
}
`;

  try {
    console.log(`[AI Evaluator] Evaluating "${job.title}" at ${job.company}...`);
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    const parsedResult: JobEvaluation = JSON.parse(textResponse);
    return parsedResult;

  } catch (error: any) {
    console.error(`[AI Evaluator Error] Evaluation failed for ${job.title}:`, error.message);
    return {
      jobTitle: job.title,
      company: job.company,
      fitScore: 0,
      decision: 'SKIP',
      summaryReason: `Evaluation failed: ${error.message}`,
      matchingSkills: [],
      missingSkillsGaps: [],
      recommendedAction: 'Retry evaluation manually.'
    };
  }
}