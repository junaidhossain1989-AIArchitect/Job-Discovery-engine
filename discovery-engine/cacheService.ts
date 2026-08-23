import fs from 'fs';
import path from 'path';

const CACHE_FILE_PATH = path.resolve(process.cwd(), 'discovery-engine', 'processedJobs.json');

interface CacheData {
  processedUrls: string[];
}

// Load processed URLs from local store
export function getProcessedUrls(): string[] {
  if (!fs.existsSync(CACHE_FILE_PATH)) {
    return [];
  }
  try {
    const rawData = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
    const parsed: CacheData = JSON.parse(rawData);
    return parsed.processedUrls || [];
  } catch {
    return [];
  }
}

// Record newly evaluated job URLs
export function markUrlsAsProcessed(urls: string[]): void {
  const existing = getProcessedUrls();
  const updatedSet = Array.from(new Set([...existing, ...urls]));
  
  const payload: CacheData = { processedUrls: updatedSet };
  fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}