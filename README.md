# CareerLens

> AI-powered resume analyzer & ATS scorer — upload your resume, paste a job description, get instant actionable feedback.

🔗 **Live:** [career-lens-codic.vercel.app](https://career-lens-codic.vercel.app)

---

## Features

### Core Analysis
- Upload **PDF / DOCX / TXT** or paste resume text
- **6-dimensional ATS score** — keyword match, semantic similarity, structure & readability, role fit, skill coverage, experience fit
- Job fit score against a specific JD
- Strengths, weak points (with severity), red flags
- Missing keywords with importance + where-to-add hints
- Skill gaps with how-to-learn suggestions
- Tailored bullet rewrites (faithful — never invented)
- Project ideas to close skill gaps
- Role recommendations with fit scores
- Short / medium / long-term action plan
- Interview prep questions tailored to the resume

### AI-Powered (Phase 2)
- **Rewrite Resume** — full rewrite tailored to a target JD, with change summary
- **Generate Cover Letter** — 250–350 word personalized letter with tone selector (confident / warm / direct / storytelling)
- **Find Matching Jobs** — 6 curated openings with company, salary range, fit score, and where to apply

### Other
- Per-user analysis history (anonymous ID via localStorage)
- Heuristic fallback engine — app works even without AI

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| UI | Tailwind CSS + shadcn/ui + lucide-react + sonner |
| Database | MongoDB |
| Parsing | pdf-parse, mammoth |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| Fallback | Pure JS heuristic engine |

---

## Run Locally

```bash
git clone https://github.com/cyscodic/CareerLens.git
cd CareerLens
yarn install
```

Create a `.env` file in the root:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=careerlens
NEXT_PUBLIC_BASE_URL=http://localhost:3000
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```

```bash
yarn dev
# Open http://localhost:3000
```

> Use MongoDB Atlas URI in `MONGO_URL` if you don't have MongoDB running locally.

---

## Project Structure

```
/app
  page.js                     # Frontend SPA
  layout.js                   # Root layout
  api/[[...path]]/route.js    # All API routes
/lib
  gemini_client.js            # Gemini 2.5 Flash integration
  heuristic_analyzer.js       # Fallback ATS analyzer
/components/ui                # shadcn/ui components
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/parse-file` | Extract text from PDF/DOCX/TXT |
| `POST` | `/api/analyze` | Full ATS analysis (Gemini + fallback) |
| `POST` | `/api/rewrite` | AI resume rewrite |
| `POST` | `/api/cover-letter` | Generate cover letter |
| `POST` | `/api/job-alerts` | Find matching jobs + save alert |
| `GET` | `/api/history?userId=...` | Past analyses for a user |
| `GET` | `/api/job-alerts?userId=...` | Saved job alerts |
| `GET/DELETE` | `/api/analysis/:id` | Fetch or delete analysis |
| `DELETE` | `/api/job-alerts/:id` | Delete job alert |

---

## Fallback Logic

```
POST /api/analyze
  ↓
  Gemini available? → geminiAnalyze()
    ✓ success  →  { engine: "gemini", analysis }
    ✗ failure  →  heuristic fallback
  No API key?  → heuristic fallback
```

Gemini quota errors or network issues never break the user experience.

---

## Deploy

See [DEPLOY.md](./DEPLOY.md) for a 15-minute guide (Vercel + MongoDB Atlas + Gemini, all free tiers).
