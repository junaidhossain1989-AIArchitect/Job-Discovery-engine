import express from 'express';
import type { Request, Response } from 'express';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

interface PortalConfig {
  id: string;
  name: string;
  searchUrlTemplate: string;
  selectors: {
    cardContainer: string;
    title: string;
    company: string;
    location: string;
    link: string;
    description: string;
  };
}

export interface ScrapedJob {
  portal: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
}
export async function runScrapers(): Promise<ScrapedJob[]> {
  // Your scraping logic or aggregator here
  return [
    {
      portal: 'LinkedIn Jobs',
      title: 'Senior Cloud Solution Architect',
      company: 'TechCorp Solutions',
      location: 'Perth WA',
      url: 'https://www.linkedin.com/jobs/view/123456',
      description: 'Requirements: 8+ years experience, deep expertise in AWS, Docker, Microservices, and solution design.'
    }
  ];
}
// Load portal configurations
const loadPortalConfigs = (): PortalConfig[] => {
  const configPath = path.resolve('./portalConfig.json');
  const rawData = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(rawData);
};

app.post('/scrape', async (req: Request, res: Response) => {
  const { keyword, location, portalId } = req.body;

  if (!keyword || !location) {
    return res.status(400).json({ error: 'Missing "keyword" or "location" in request body.' });
  }

  const allConfigs = loadPortalConfigs();
  // If specific portalId requested, filter by it; otherwise, scrape all enabled portals in config
  const activeConfigs = portalId 
    ? allConfigs.filter(p => p.id === portalId)
    : allConfigs;

  if (activeConfigs.length === 0) {
    return res.status(400).json({ error: `Portal configuration for '${portalId}' not found.` });
  }

  console.log(`[Scraper API] Starting scan across ${activeConfigs.length} portal(s) for "${keyword}" in "${location}"...`);

  let browser;
  const aggregatedJobs: ScrapedJob[] = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 }
    });

    for (const portal of activeConfigs) {
      console.log(`\n[Scraper API] ---> Scraping Portal: ${portal.name}`);
      const searchUrl = portal.searchUrlTemplate
        .replace('{keyword}', encodeURIComponent(keyword))
        .replace('{location}', encodeURIComponent(location));

      const page = await context.newPage();
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const foundCards = await page.evaluate(({ portalConfig }: { portalConfig: PortalConfig }) => {
          const cards = Array.from(document.querySelectorAll(portalConfig.selectors.cardContainer));
          const results: { title: string; company: string; location: string; url: string }[] = [];

          for (const card of cards) {
            const titleEl = card.querySelector(portalConfig.selectors.title);
            const companyEl = card.querySelector(portalConfig.selectors.company);
            const locEl = card.querySelector(portalConfig.selectors.location);
            const anchorEl = (card.querySelector(portalConfig.selectors.link) || card.closest('a')) as HTMLAnchorElement;

            const title = titleEl?.textContent?.trim() || '';
            const company = companyEl?.textContent?.trim() || 'Unknown Company';
            const loc = locEl?.textContent?.trim() || 'Not Specified';
            let url = anchorEl?.href || '';

            if (url.includes('?')) {
              url = url.split('?')[0] ?? url;
            }

            if (title && url) {
              results.push({ title, company, location: loc, url });
            }

            if (results.length >= 3) break; // Limit 3 top jobs per portal for testing speed
          }
          return results;
        }, { portalConfig: portal });

        console.log(`[${portal.name}] Found ${foundCards.length} matching job cards.`);

        for (const item of foundCards) {
          try {
            const jobPage = await context.newPage();
            await jobPage.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

            const description = await jobPage.evaluate((descSelector: string) => {
              const el = document.querySelector(descSelector) || document.body;
              return (el as HTMLElement).innerText.replace(/\s+/g, ' ').substring(0, 3000);
            }, portal.selectors.description);

            aggregatedJobs.push({
              portal: portal.name,
              title: item.title,
              company: item.company,
              location: item.location,
              url: item.url,
              description
            });

            await jobPage.close();
          } catch (err: any) {
            console.error(`[${portal.name}] Error scraping job page ${item.url}:`, err.message);
          }
        }

      } catch (err: any) {
        console.error(`[${portal.name}] Failed loading search index:`, err.message);
      } finally {
        await page.close();
      }
    }

    await browser.close();
    return res.json({ success: true, count: aggregatedJobs.length, jobs: aggregatedJobs });

  } catch (error: any) {
    if (browser) await browser.close();
    console.error('[Scraper API Exception]:', error);
    return res.status(500).json({ error: error.message || 'Multi-portal scraping failed.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Config-driven Scraper API listening on http://localhost:${PORT}`);
});