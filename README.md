# CareerLens

**AI-powered resume analyzer & ATS scorer.** Upload PDF/DOCX/TXT or paste text, paste a job description, and get instant explainable feedback — ATS score, strengths, weak points, red flags, missing keywords, tailored bullets, project ideas, action plan + AI resume rewriting, cover letter generation, and job matching.


## Features

### Core analysis (MVP)
- Upload PDF / DOCX / TXT resume (parsed via `pdf-parse` + `mammoth`) or paste text
- **6-dimensional ATS score** — keyword match, semantic similarity, structure & readability, role fit, skill coverage, experience fit — each fully explained
- Job fit score against a specific JD
- Strengths, weak points (with severity), red flags
- Missing keywords with importance + where-to-add hints
- Skill gaps with how-to-learn suggestions
- Tailored bullet rewrites (faithful — never invented)
- Project ideas to close skill gaps
- Role recommendations with fit scores
- Short / medium / long-term action plan
- Interview prep questions tailored to the resume

### Phase 2 (AI-powered)
- **Rewrite Resume** — full resume rewrite tailored to a target JD, with change summary
- **Generate Cover Letter** — 250-350 word personalized letter with company-specific hook, tone selector (confident / warm / direct / storytelling)
- **Find Matching Jobs** — 6 realistic job openings with company, salary range, fit score, match reasons, and where to apply

### Other
- History of past analyses per user (anonymous user ID in localStorage)
- Heuristic fallback engine when AI is unavailable (so the app always works)

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **UI:** Tailwind CSS + shadcn/ui + lucide-react icons + sonner toasts
- **DB:** MongoDB
- **Parsing:** `pdf-parse`, `mammoth`
- **AI:** Google Gemini 2.5 Flash via `@google/generative-ai` (structured JSON output)
- **Fallback analyzer:** pure JS heuristic engine in `/lib/heuristic_analyzer.js`

## Run locally

```bash
git clone <your-repo>
cd careerlens
yarn install

# Create .env in the project root (do not commit)
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=careerlens
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CORS_ORIGINS=*
GEMINI_API_KEY=AIza...         # from https://aistudio.google.com/app/apikey
GEMINI_MODEL=gemini-2.5-flash
EOF

# Start MongoDB locally (brew services start mongodb-community)
# OR use Atlas — paste the URI into MONGO_URL

yarn dev
# Open http://localhost:3000
```

## Project layout

```
/app
  page.js                  # Frontend SPA (landing / input / results views, modals)
  layout.js                # Root layout
  api/[[...path]]/route.js # All backend routes (analyze, rewrite, cover-letter, job-alerts, history, parse-file)
/lib
  heuristic_analyzer.js    # Pure-JS ATS analyzer (fallback)
  gemini_client.js         # Gemini 2.5 Flash integration (analyze + rewrite + cover-letter + match-jobs)
/components/ui             # shadcn/ui components
.env                       # Secrets (gitignored)
DEPLOY.md                  # Production deployment guide
```

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/parse-file` | Multipart upload → extract text from PDF/DOCX/TXT |
| `POST` | `/api/analyze` | Full hybrid ATS analysis (Gemini → heuristic fallback) |
| `POST` | `/api/rewrite` | AI-rewrite resume tailored to JD |
| `POST` | `/api/cover-letter` | Generate personalized cover letter |
| `POST` | `/api/job-alerts` | Generate matching job openings + save as alert |
| `GET` | `/api/history?userId=...` | List past analyses for a user |
| `GET` | `/api/job-alerts?userId=...` | List saved job alerts |
| `GET` / `DELETE` | `/api/analysis/:id` | Fetch / delete single analysis |
| `DELETE` | `/api/job-alerts/:id` | Delete a saved job alert |

## Engine fallback logic

```
POST /api/analyze
  ↓
  if GEMINI_API_KEY set → try geminiAnalyze()
                      ↓
                      on success → return { engine: "gemini", analysis }
                      on failure → fall back to heuristic
  else → use heuristic
```

This makes the app resilient: Gemini quota, network, or parsing errors never break the user experience.
