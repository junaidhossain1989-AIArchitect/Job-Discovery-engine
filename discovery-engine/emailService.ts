import { Resend } from 'resend';
import path from 'path';
import dotenv from 'dotenv';
import type { JobEvaluation } from './aiEvaluator.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'discovery-engine', '.env') });

export async function sendJobDigestEmail(evaluations: JobEvaluation[]): Promise<void> {
  const highFitJobs = evaluations.filter((item) => item.decision !== 'SKIP');

  if (highFitJobs.length === 0) {
    console.log('[Email Service] No high-match jobs found today. Skipping email dispatch.');
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing from environment variables.');
  }

  const resend = new Resend(apiKey);

  const jobCardsHtml = highFitJobs
    .map(
      (job) => `
    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 18px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f0f0f0; padding-bottom: 12px; margin-bottom: 12px;">
        <div>
          <h2 style="margin: 0 0 4px 0; font-size: 18px;">
            <a href="${job.jobUrl}" target="_blank" style="color: #1a73e8; text-decoration: none;">${job.jobTitle} ↗</a>
          </h2>
          <span style="color: #5f6368; font-size: 14px; font-weight: 600;">${job.company}</span>
        </div>
        <span style="background-color: ${job.fitScore >= 80 ? '#e6f4ea' : '#fef7e0'}; color: ${job.fitScore >= 80 ? '#137333' : '#b06000'}; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; text-align: center;">
          ${job.fitScore}% Match (${job.decision})
        </span>
      </div>
      
      <p style="color: #3c4043; line-height: 1.5; font-size: 14px; margin: 0 0 14px 0;">${job.summaryReason}</p>

      <div style="margin-bottom: 10px;">
        <strong style="color: #137333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Matching Skills</strong>
        <p style="margin: 4px 0 0 0; color: #202124; font-size: 14px;">${job.matchingSkills.join(', ') || 'None specified'}</p>
      </div>

      <div style="margin-bottom: 14px;">
        <strong style="color: #c5221f; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Skill Gaps</strong>
        <p style="margin: 4px 0 0 0; color: #202124; font-size: 14px;">${job.missingSkillsGaps.join(', ') || 'None identified'}</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1a73e8; margin-bottom: 14px;">
        <strong style="color: #1a73e8; font-size: 13px;">Application Strategy:</strong>
        <p style="margin: 4px 0 0 0; color: #3c4043; font-size: 13px; line-height: 1.4;">${job.recommendedAction}</p>
      </div>

      <div style="text-align: right;">
        <a href="${job.jobUrl}" target="_blank" style="display: inline-block; background-color: #1a73e8; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none;">
          Open Listing & Apply ➔
        </a>
      </div>
    </div>
  `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="background-color: #f4f6f8; margin: 0; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h1 style="color: #202124; margin: 0 0 8px 0; font-size: 22px; font-family: sans-serif;">🚀 Daily Job Discovery Digest</h1>
          <p style="color: #5f6368; margin: 0 0 20px 0; font-size: 14px; font-family: sans-serif;">
            Evaluated ${evaluations.length} total vacancies. Here are your top matched opportunities:
          </p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin-bottom: 24px;" />
          ${jobCardsHtml}
          <p style="text-align: center; color: #9aa0a6; font-size: 12px; margin-top: 32px; font-family: sans-serif;">
            Automated via Job Discovery Engine
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    const destination = process.env.ALERT_EMAIL_TO || 'your-email@example.com';
    console.log(`[Email Service] Dispatching digest to ${destination} via Resend API...`);

    const { data, error } = await resend.emails.send({
      from: 'Job Discovery <onboarding@resend.dev>',
      to: [destination],
      subject: `🎯 ${highFitJobs.length} New Job Match${highFitJobs.length > 1 ? 'es' : ''} Discovered`,
      html: htmlContent,
    });

    if (error) {
      console.error('[Email Service Error] Resend API rejected dispatch:', error);
      return;
    }

    console.log(`[Email Service] Digest successfully sent! Message ID: ${data?.id}`);
  } catch (err: any) {
    console.error('[Email Service Error] Unexpected error:', err.message);
  }
}