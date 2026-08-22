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

```

