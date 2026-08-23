import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';

console.log('⏰ Job Discovery Scheduler started. Waiting for schedule trigger...');

// Run every day at 8:00 AM (0 8 * * *)
cron.schedule('0 8 * * *', () => {
  console.log(`\n[${new Date().toISOString()}] Triggering scheduled pipeline run...`);
  
  const scriptPath = path.resolve(process.cwd(), 'discovery-engine', 'index.ts');
  exec(`npx tsx "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Execution error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Standard Error Output: ${stderr}`);
    }
    console.log(`\n${stdout}`);
    console.log(`[${new Date().toISOString()}] Scheduled run completed.`);
  });
});