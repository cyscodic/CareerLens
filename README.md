# CareerLens

AI-style resume analyzer & ATS scorer. Upload PDF/DOCX/TXT or paste text, paste a job description, get an instant explainable ATS report — strengths, weak points, red flags, missing keywords, tailored bullets, project ideas, and an action plan.

**Current mode:** Heuristic engine (no AI, free, fast). You can later swap in OpenAI / Gemini / Anthropic by adding a key.

## Features

- Upload PDF / DOCX / TXT resume (PDFs parsed via `pdf-parse`, DOCX via `mammoth`)
- Paste text resume + job description
- **6-dimensional ATS score** (keyword match, semantic similarity, structure & readability, role fit, skill coverage, experience fit) — each fully explained
- Job fit score
- Strengths, weak points (with severity), red flags
- Missing keywords with importance + where-to-add hints
- Skill gaps with how-to-learn suggestions
- Tailored bullet rewrites
- Project ideas to close skill gaps
- Role recommendations
- Short / medium / long-term action plan
- Interview prep questions
- History of past analyses (per user) stored in MongoDB

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **UI:** Tailwind CSS + shadcn/ui + lucide-react icons + sonner toasts
- **DB:** MongoDB
- **Parsing:** `pdf-parse`, `mammoth`
- **Analyzer:** Pure JS heuristic engine (`/lib/heuristic_analyzer.js`)

## Run locally

```bash
# 1. Clone & install
git clone <your-repo>
cd careerlens
yarn install

# 2. Set up env (.env in project root)
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=careerlens
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CORS_ORIGINS=*
EOF

# 3. Start MongoDB locally (or use Atlas)
# macOS:    brew services start mongodb-community
# Ubuntu:   sudo systemctl start mongod
# Or use MongoDB Atlas free tier: https://cloud.mongodb.com (paste the URI into MONGO_URL)

# 4. Run
yarn dev
# Open http://localhost:3000
```

## Deploy to Vercel (free)

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo.
3. Add environment variables in Vercel dashboard:
   - `MONGO_URL` = your MongoDB Atlas connection string (free M0 cluster works)
   - `DB_NAME` = `careerlens`
   - `NEXT_PUBLIC_BASE_URL` = your Vercel URL (e.g., `https://careerlens.vercel.app`)
   - `CORS_ORIGINS` = `*`
4. Click Deploy. Done.

## Adding AI (optional, later)

When you have an LLM key, the heuristic engine can be replaced or augmented with AI for richer analysis:

- Get a free Gemini key: https://aistudio.google.com/app/apikey (generous free tier)
- Get an OpenAI key: https://platform.openai.com/api-keys (pay-as-you-go)

Then drop the key into `.env` and swap the `runAnalysis` call in `/app/api/[[...path]]/route.js` to use the LLM client. The response schema is identical so the UI works unchanged.

## Project layout

```
/app
  page.js                 # Frontend (single-page UI with landing/input/results views)
  layout.js               # Root layout + metadata
  api/[[...path]]/route.js  # All backend API routes
/lib
  heuristic_analyzer.js   # The ATS analysis engine
/components/ui            # shadcn/ui components (Button, Card, Tabs, etc.)
.env                      # Env vars (MONGO_URL, DB_NAME)
```

## API reference

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/parse-file` | Multipart upload, returns extracted text |
| `POST` | `/api/analyze` | `{ resumeText, jobDescription, userId, resumeName, jobTitle }` → full analysis |
| `GET` | `/api/history?userId=...` | List past analyses for a user |
| `GET` | `/api/analysis/:id` | Full analysis by id |
| `DELETE` | `/api/analysis/:id` | Delete an analysis |
