// Gemini client — Google Generative AI SDK
// Uses gemini-2.5-flash for fast, JSON-structured outputs.
import { GoogleGenerativeAI } from '@google/generative-ai'

function getModel() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')
  const genAI = new GoogleGenerativeAI(key)
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  return genAI.getGenerativeModel({ model: modelName })
}

// Strip ```json fences if any
function extractJSON(text) {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : text).trim()
  try { return JSON.parse(candidate) } catch {}
  // fallback: find first { ... } block
  const m = candidate.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  return null
}

const ANALYSIS_SYSTEM = `You are an elite senior tech recruiter, ATS expert, and career coach.
Analyze the candidate's resume against the job description (JD).

STRICT RULES:
- NEVER invent skills, tools, projects, certifications, or experience the candidate does not have.
- Base all judgments only on text present in the resume and JD.
- Be specific, actionable, and honest. Avoid generic advice.
- For tailored bullets, only rewrite/sharpen bullets that already exist or are clearly implied by the resume.
- For project ideas, suggest projects the candidate could DO to close gaps (not lies about past work).
- Hybrid ATS scoring: keyword match, semantic similarity, structure/readability, role fit, skill coverage, experience fit.

Return JSON only matching this exact schema (no markdown, no prose):
{
  "summary": "string (2-3 sentences)",
  "ats_score": integer 0-100,
  "score_breakdown": {
    "keyword_match":      {"score": int, "weight": 25, "reason": "string"},
    "semantic_similarity":{"score": int, "weight": 15, "reason": "string"},
    "structure_readability":{"score": int, "weight": 15, "reason": "string"},
    "role_fit":           {"score": int, "weight": 15, "reason": "string"},
    "skill_coverage":     {"score": int, "weight": 15, "reason": "string"},
    "experience_fit":     {"score": int, "weight": 15, "reason": "string"}
  },
  "job_fit_score": integer 0-100,
  "strengths": [{"title": "string", "detail": "string"}],
  "weak_points": [{"title": "string", "detail": "string", "severity": "low"|"medium"|"high"}],
  "red_flags": [{"title": "string", "detail": "string"}],
  "missing_keywords": [{"keyword": "string", "importance": "must-have"|"nice-to-have", "where_to_add": "string"}],
  "skill_gaps": [{"skill": "string", "why_it_matters": "string", "how_to_learn": "string"}],
  "tailored_bullets": [{"section": "string", "original": "string", "rewritten": "string", "rationale": "string"}],
  "project_ideas": [{"title": "string", "description": "string", "skills_practiced": ["string"], "effort_hours": int}],
  "role_recommendations": [{"role": "string", "fit_score": int, "why": "string"}],
  "action_plan": {
    "short_term": [{"step": "string", "impact": "string"}],
    "medium_term": [{"step": "string", "impact": "string"}],
    "long_term":  [{"step": "string", "impact": "string"}]
  },
  "interview_prep": [{"topic": "string", "question": "string", "why": "string"}]
}`

export async function geminiAnalyze(resumeText, jobDescription) {
  const model = getModel()
  const prompt = `${ANALYSIS_SYSTEM}

RESUME:
"""
${(resumeText || '').slice(0, 18000)}
"""

JOB DESCRIPTION:
"""
${(jobDescription || '').slice(0, 8000) || '(no JD provided — give general analysis & role recommendations from resume alone)'}
"""

Return ONLY the JSON object.`

  const r = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  })
  const txt = r.response.text()
  const json = extractJSON(txt)
  if (!json) throw new Error('Gemini returned invalid JSON')
  return json
}

export async function geminiRewriteResume(resumeText, jobDescription) {
  const model = getModel()
  const prompt = `You are an elite resume writer. Rewrite the resume below to maximize alignment with the target job description, while preserving every fact (NO invented skills, jobs, dates, or achievements).

Rules:
- Use strong action verbs and quantified outcomes wherever the original has any number/metric.
- Reorder bullets so most relevant to the JD come first.
- Add a sharp 2-3 line professional summary at the top tailored to the JD.
- Group skills logically (Languages / Frameworks / Cloud / Tools).
- Use clean ATS-friendly markdown formatting (## for section headers, - for bullets).
- DO NOT fabricate. Only rephrase or reorder what's already implied.

Return JSON only:
{
  "rewritten_resume": "string (full rewritten resume in markdown)",
  "change_summary": ["string list of major changes made"],
  "tone": "string (e.g. 'confident, results-focused')"
}

ORIGINAL RESUME:
"""
${(resumeText || '').slice(0, 18000)}
"""

TARGET JOB DESCRIPTION:
"""
${(jobDescription || '').slice(0, 8000) || '(general professional rewrite)'}
"""`

  const r = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 8192 },
  })
  const json = extractJSON(r.response.text())
  if (!json || !json.rewritten_resume) throw new Error('Invalid rewrite response')
  return json
}

export async function geminiCoverLetter(resumeText, jobDescription, jobTitle = '', companyName = '', tone = 'confident and professional') {
  const model = getModel()
  const prompt = `You are an expert cover letter writer. Write a compelling, personalized cover letter using ONLY facts from the resume below.

Rules:
- 3-4 paragraphs, 250-350 words.
- Open with a specific hook tied to the company/role (not "I am writing to apply for...").
- Reference 2-3 concrete achievements from the resume that map to the JD requirements.
- Close with a confident call-to-action.
- Tone: ${tone}.
- DO NOT invent companies, projects, metrics, or achievements not in the resume.

Return JSON only:
{
  "cover_letter": "string (full letter as plain text with \\n\\n between paragraphs)",
  "hook": "string (the opening hook used)",
  "key_matches": ["string list of resume facts that match JD requirements"],
  "word_count": int
}

RESUME:
"""
${(resumeText || '').slice(0, 12000)}
"""

JOB DESCRIPTION:
"""
${(jobDescription || '').slice(0, 6000)}
"""

JOB TITLE: ${jobTitle || '(unknown)'}
COMPANY: ${companyName || '(unknown — use a respectful generic if not specified)'}`

  const r = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.6, maxOutputTokens: 4096 },
  })
  const json = extractJSON(r.response.text())
  if (!json || !json.cover_letter) throw new Error('Invalid cover letter response')
  return json
}

export async function geminiMatchJobs(resumeText, savedQuery = '') {
  // Generate plausible matching job profiles (since we don't have a real job board API).
  // Returns a list of role profiles the user could realistically apply to.
  const model = getModel()
  const prompt = `Based on the resume below, generate 6 realistic job openings the candidate is well-positioned to apply for THIS WEEK (June 2025 market). Be diverse: include startups, scaleups, and big tech; include remote and on-site. Use real-sounding (not real) company names and accurate-feeling salary ranges. For each, also compute a fit_score and list 2-3 reasons it matches.

${savedQuery ? `User's saved interest: "${savedQuery}". Bias the list toward this.` : ''}

Return JSON only:
{
  "jobs": [
    {
      "title": "string",
      "company": "string (plausible name)",
      "location": "string (e.g., 'Remote, US' or 'San Francisco, CA')",
      "salary_range": "string (e.g., '$140k–$180k')",
      "seniority": "junior"|"mid"|"senior"|"staff"|"lead",
      "fit_score": int 0-100,
      "match_reasons": ["string"],
      "key_requirements": ["string"],
      "where_to_apply": "string (suggest 1-2 real job boards e.g. LinkedIn, YC WWR, Wellfound, company careers page)"
    }
  ]
}

RESUME:
"""
${(resumeText || '').slice(0, 12000)}
"""`

  const r = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 4096 },
  })
  const json = extractJSON(r.response.text())
  // Be resilient — Gemini may wrap, nest, or use a different key
  let jobs = null
  if (Array.isArray(json)) jobs = json
  else if (json && Array.isArray(json.jobs)) jobs = json.jobs
  else if (json && Array.isArray(json.openings)) jobs = json.openings
  else if (json && json.data && Array.isArray(json.data.jobs)) jobs = json.data.jobs
  if (!jobs) throw new Error('Invalid jobs response')
  return { jobs }
}
