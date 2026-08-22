**What We Have Built & Fixed So Far**

1. **ES Module Migration & Path Resolution:**
* Removed standard Node.js CommonJS globals (`__dirname`, `__filename`) that broke in Node v24 Native ESM mode.
* Updated `dotenv` configuration across all service modules (`aiEvaluator.ts`, `emailService.ts`, `index.ts`) to resolve environment variables consistently regardless of execution path.


2. **AI Evaluation Service (`aiEvaluator.ts`):**
* Configured the **Gemini 3.6 Flash** model endpoint utilizing Structured JSON output mode.
* Formatted evaluations to evaluate matching skills, critical gaps, fit score percentages, and strategic application recommendations against a master candidate profile.


3. **Email Digest Pipeline (`emailService.ts`):**
* Integrated the **Resend API** to render and dispatch HTML email digests containing structured match cards.
* Modified the dataset pipeline to preserve original job URLs, enabling direct link navigation to application targets for browser extension workflows.


4. **Repository Hygiene (`.gitignore`):**
* Added root-level environment protection (`.env*`), Node build artifacts (`node_modules/`, `dist/`), and OS meta-files to prevent key leakage and repository bloat.



---

### Project Documentation (`README.md`)

Create a `README.md` file in your root folder (`Job-Discovery-engine/README.md`):

```markdown
# Job Discovery & AI Evaluation Engine

An automated pipeline that scrapes job postings across target portals, evaluates candidate-job compatibility using Gemini 3.6 Flash, and dispatches an actionable HTML summary digest via Resend.

---

## 🏗 Architecture Overview


```

[ Target Portals ] ──► [ Scraper Service ]
│
(Scraped Job JSON)
│
▼
[ AI Evaluator ] ◄── [ candidateProfile.json ]
(Gemini 3.6 Flash JSON)
│
▼
[ Email Service ] ──► [ Resend API ] ──► [ User Inbox ]

```

### Module Breakdown

* **`discovery-engine/index.ts`**: Main orchestrator. Controls execution flow, loads candidate configuration files, executes web scrapers, passes data to the AI model, and triggers email notifications.
* **`discovery-engine/scraperService.ts`**: Handles job collection from configured search targets and normalizes data into a standard JSON schema.
* **`discovery-engine/aiEvaluator.ts`**: Interfaces with the `@google/generative-ai` SDK (`gemini-3.6-flash`). Performs candidate-to-job matching and returns strict JSON output containing fit scores, gap analysis, and tailored application advice.
* **`discovery-engine/emailService.ts`**: Formats high-fit evaluations into responsive HTML components and dispatches email notifications using the Resend API.

---

## 🚀 Getting Started

### Prerequisites

* **Node.js**: v20+ or v24+
* **npm** or **pnpm**

### Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=re_your_resend_api_key
ALERT_EMAIL_TO=your.email@example.com

```

### Candidate Profile Setup

Populate `discovery-engine/candidateProfile.json` with candidate data:

```json
{
  "candidate": {
    "name": "Your Name",
    "masterResume": "Full plain text resume details go here..."
  }
}

```

---

## 🛠 Usage

Execute the pipeline manually from the workspace root:

```bash
npx tsx discovery-engine/index.ts

```

### Project File Structure

```
Job-Discovery-engine/
├── .env
├── .gitignore
├── README.md
├── package.json
└── discovery-engine/
    ├── aiEvaluator.ts
    ├── candidateProfile.json
    ├── emailService.ts
    ├── index.ts
    └── scraperService.ts
Here is your comprehensive production-readiness roadmap. Transforming this system into a production-grade, configurable product tomorrow requires decoupling code from configuration, securing infrastructure, and adding robust logging and error handling.

---

### Production-Readiness Action Items

#### 1. Configuration & Prompt Externalization

* **Externalize Candidate Profiles:** Move hardcoded profile paths into environment variables or a `/config` directory, allowing dynamic switching between multiple resumes/profiles (e.g., `candidateProfile.json`, `candidateProfile_dev.json`).
* **Prompt Versioning:** Extract the Gemini system prompt from `aiEvaluator.ts` into a standalone text/JSON template file (e.g., `discovery-engine/prompts/evaluationPrompt.v1.txt`). This allows prompt updates, tuning, and A/B testing without redeploying code.
* **Configurable Thresholds:** Move matching criteria—such as the minimum match score (e.g., `FIT_SCORE_THRESHOLD=80`) and email dispatch limits—to `.env` variables.

#### 2. Infrastructure & Scheduling

* **Automated Runner / Orchestration:** Replace manual terminal execution with a robust scheduler:
* **Option A (n8n):** Create an n8n workflow with a Cron Node that calls an HTTP Webhook or executes the Node process, capturing logs and triggering secondary notifications (Slack/Telegram).
* **Option B (PM2 / Cloud Cron):** Deploy via PM2 (`pm2 start ecosystem.config.js`) or set up a daily GitHub Actions workflow / AWS EventBridge rule.


* **Custom Domain Email Sending:** In Resend, verify your domain DNS records (`SPF`, `DKIM`) to switch from `onboarding@resend.dev` to `notifications@yourdomain.com` for high inbox deliverability.

#### 3. Error Handling, Resilience & Rate Limiting

* **API Rate Limiting & Backoff:** Wrap calls to the Gemini API and web scrapers with retry logic and exponential backoff to gracefully handle rate limits or network drops.
* **Database / State Persistence:** Add a lightweight database (e.g., SQLite or PostgreSQL) or local cache file to store scraped `jobUrl` hash signatures. This prevents evaluating or emailing duplicate job listings on subsequent runs.
* **Structured Logging:** Replace `console.log` statements with a production logging library like `pino` or `winston` to generate structured JSON logs, enabling seamless integration with monitoring tools (e.g., Datadog, Better Stack).

#### 4. Chrome Extension Integration & Security

* **CORS & API Security:** If your local scraper (`http://localhost:3001`) or orchestrator needs to communicate directly with your custom Chrome extension, set up proper CORS headers and token authentication (e.g., `x-api-key`).
* **Environment Secret Audit:** Ensure `.env` is fully ignored in git and prepare production deployment secrets in your host environment (e.g., Docker environment variables or GitHub Secrets).

---

### Tomorrow's Step-by-Step Execution Plan

**Phase 1: Config & Prompt Extraction**

1. Create `discovery-engine/prompts/v1.txt` and move the prompt template string out of `aiEvaluator.ts`.
2. Update `aiEvaluator.ts` to read the prompt template from file and interpolate variables dynamically.
3. Update `.env.example` with all new configurable parameters (`FIT_SCORE_THRESHOLD`, `PROMPT_VERSION`, `PORTAL_TIMEOUT`).

**Phase 2: Persistence & Deduplication**

1. Implement a simple JSON file or SQLite table (`processedJobs.json`) to record evaluated job IDs/URLs.
2. Filter out previously evaluated jobs *before* invoking the Gemini API to conserve API usage and avoid duplicate email alerts.

**Phase 3: Scheduling & Deployment**

1. Set up your runner mechanism (n8n workflow or PM2/GitHub Actions).
2. Configure domain DNS for Resend API sending.
3. Perform an end-to-end dry run to confirm execution, prompt reading, deduplication, and email delivery.

Are you planning to deploy this runner on a cloud server (e.g., AWS, Render, VPS) or keep it running on your local machine?
```

