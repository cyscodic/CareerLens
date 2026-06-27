import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import mammoth from 'mammoth'

export const runtime = 'nodejs'
export const maxDuration = 120

// MongoDB connection (cached)
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// OpenAI client pointed at Emergent universal LLM gateway
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.EMERGENT_LLM_KEY,
    baseURL: 'https://integrations.emergentagent.com/llm',
  })
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// ---- File parsing ----
async function parsePdfBuffer(buf) {
  // pdf-parse exports its function via index.js but reads test file at top-level
  // import the lib directly to avoid that issue
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
  const data = await pdfParse(buf)
  return data.text || ''
}

async function parseDocxBuffer(buf) {
  const result = await mammoth.extractRawText({ buffer: buf })
  return result.value || ''
}

// ---- Analysis prompt + schema ----
const ANALYSIS_SYSTEM = `You are an elite senior tech recruiter, ATS expert, and career coach.
You will analyze a candidate's resume against a target job description (JD).

STRICT RULES:
- NEVER invent skills, tools, projects, certifications, or experience the candidate does not have.
- Base all judgments only on text present in the resume and JD.
- Be specific, actionable, and honest. Avoid generic advice.
- For tailored bullets, only rewrite or sharpen bullets that already exist or are clearly implied by the resume. Mark suggested_bullet with rationale grounded in actual experience.
- For project ideas, suggest projects the candidate could DO to close gaps (not lies about past work).
- Score with a hybrid approach: keyword match, semantic similarity, structure/readability, role fit, skill coverage, experience fit. Explain each.

Return JSON ONLY matching the provided schema. No prose, no markdown.`

function analysisSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string', description: '2-3 sentence neutral summary of the candidate based only on resume.' },
      ats_score: { type: 'integer', minimum: 0, maximum: 100 },
      score_breakdown: {
        type: 'object',
        additionalProperties: false,
        properties: {
          keyword_match: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer' }, weight: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'weight', 'reason'] },
          semantic_similarity: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer' }, weight: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'weight', 'reason'] },
          structure_readability: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer' }, weight: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'weight', 'reason'] },
          role_fit: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer' }, weight: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'weight', 'reason'] },
          skill_coverage: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer' }, weight: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'weight', 'reason'] },
          experience_fit: { type: 'object', additionalProperties: false, properties: { score: { type: 'integer' }, weight: { type: 'integer' }, reason: { type: 'string' } }, required: ['score', 'weight', 'reason'] },
        },
        required: ['keyword_match', 'semantic_similarity', 'structure_readability', 'role_fit', 'skill_coverage', 'experience_fit'],
      },
      job_fit_score: { type: 'integer', minimum: 0, maximum: 100, description: 'How well this resume matches the JD specifically.' },
      strengths: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, detail: { type: 'string' } }, required: ['title', 'detail'] } },
      weak_points: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, detail: { type: 'string' }, severity: { type: 'string', enum: ['low', 'medium', 'high'] } }, required: ['title', 'detail', 'severity'] } },
      red_flags: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, detail: { type: 'string'} }, required: ['title', 'detail'] } },
      missing_keywords: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { keyword: { type: 'string' }, importance: { type: 'string', enum: ['must-have', 'nice-to-have'] }, where_to_add: { type: 'string' } }, required: ['keyword', 'importance', 'where_to_add'] } },
      skill_gaps: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { skill: { type: 'string' }, why_it_matters: { type: 'string' }, how_to_learn: { type: 'string' } }, required: ['skill', 'why_it_matters', 'how_to_learn'] } },
      tailored_bullets: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { section: { type: 'string' }, original: { type: 'string' }, rewritten: { type: 'string' }, rationale: { type: 'string' } }, required: ['section', 'original', 'rewritten', 'rationale'] } },
      project_ideas: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, description: { type: 'string' }, skills_practiced: { type: 'array', items: { type: 'string' } }, effort_hours: { type: 'integer' } }, required: ['title', 'description', 'skills_practiced', 'effort_hours'] } },
      role_recommendations: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { role: { type: 'string' }, fit_score: { type: 'integer' }, why: { type: 'string' } }, required: ['role', 'fit_score', 'why'] } },
      action_plan: {
        type: 'object',
        additionalProperties: false,
        properties: {
          short_term: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { step: { type: 'string' }, impact: { type: 'string' } }, required: ['step', 'impact'] } },
          medium_term: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { step: { type: 'string' }, impact: { type: 'string' } }, required: ['step', 'impact'] } },
          long_term: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { step: { type: 'string' }, impact: { type: 'string' } }, required: ['step', 'impact'] } },
        },
        required: ['short_term', 'medium_term', 'long_term'],
      },
      interview_prep: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { topic: { type: 'string' }, question: { type: 'string' }, why: { type: 'string' } }, required: ['topic', 'question', 'why'] } },
    },
    required: ['summary', 'ats_score', 'score_breakdown', 'job_fit_score', 'strengths', 'weak_points', 'red_flags', 'missing_keywords', 'skill_gaps', 'tailored_bullets', 'project_ideas', 'role_recommendations', 'action_plan', 'interview_prep'],
  }
}

async function runAnalysis(resumeText, jobDescription, userId) {
  const openai = getOpenAI()
  const userMsg = `RESUME:\n"""\n${resumeText.slice(0, 18000)}\n"""\n\nJOB DESCRIPTION:\n"""\n${(jobDescription || '').slice(0, 8000) || '(No JD provided — give general ATS analysis and role recommendations from resume alone.)'}\n"""\n\nReturn structured JSON per the schema.`

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    user: userId || 'careerlens-user',
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'resume_analysis', strict: true, schema: analysisSchema() },
    },
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM },
      { role: 'user', content: userMsg },
    ],
    // LiteLLM proxy budget mapping — pass user metadata
    // @ts-ignore
    metadata: { user_id: userId || 'careerlens-user', app: 'careerlens' },
  }, {
    headers: {
      'x-user-id': userId || 'careerlens-user',
    },
  })
  const txt = resp.choices?.[0]?.message?.content || '{}'
  return JSON.parse(txt)
}

// ---- Route handlers ----
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'CareerLens API ready' }))
    }

    // ---- POST /api/parse-file (multipart) ----
    if (route === '/parse-file' && method === 'POST') {
      const formData = await request.formData()
      const file = formData.get('file')
      if (!file || typeof file === 'string') {
        return handleCORS(NextResponse.json({ error: 'No file provided' }, { status: 400 }))
      }
      const name = file.name || 'upload'
      const arrayBuf = await file.arrayBuffer()
      const buf = Buffer.from(arrayBuf)
      const lower = name.toLowerCase()
      let text = ''
      try {
        if (lower.endsWith('.pdf')) {
          text = await parsePdfBuffer(buf)
        } else if (lower.endsWith('.docx')) {
          text = await parseDocxBuffer(buf)
        } else if (lower.endsWith('.txt')) {
          text = buf.toString('utf-8')
        } else {
          return handleCORS(NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, or TXT.' }, { status: 400 }))
        }
      } catch (e) {
        console.error('Parse error:', e)
        return handleCORS(NextResponse.json({ error: 'Failed to parse file: ' + e.message }, { status: 500 }))
      }
      if (!text || text.trim().length < 30) {
        return handleCORS(NextResponse.json({ error: 'Could not extract meaningful text. If scanned PDF, paste text instead.' }, { status: 400 }))
      }
      return handleCORS(NextResponse.json({ text, filename: name, length: text.length }))
    }

    // ---- POST /api/analyze ----
    if (route === '/analyze' && method === 'POST') {
      const body = await request.json()
      const resumeText = (body.resumeText || '').trim()
      const jobDescription = (body.jobDescription || '').trim()
      const userId = body.userId || 'anonymous'
      const resumeName = body.resumeName || 'Untitled Resume'
      const jobTitle = body.jobTitle || ''

      if (!resumeText || resumeText.length < 30) {
        return handleCORS(NextResponse.json({ error: 'Resume text too short. Please paste a real resume.' }, { status: 400 }))
      }

      let analysis
      try {
        analysis = await runAnalysis(resumeText, jobDescription, userId)
      } catch (e) {
        console.error('LLM error:', e)
        return handleCORS(NextResponse.json({ error: 'AI analysis failed: ' + (e.message || 'unknown') }, { status: 500 }))
      }

      const doc = {
        id: uuidv4(),
        userId,
        resumeName,
        jobTitle,
        resumeText,
        jobDescription,
        analysis,
        createdAt: new Date().toISOString(),
      }
      await db.collection('analyses').insertOne(doc)
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }

    // ---- GET /api/history?userId=xxx ----
    if (route === '/history' && method === 'GET') {
      const url = new URL(request.url)
      const userId = url.searchParams.get('userId') || 'anonymous'
      const items = await db.collection('analyses')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
      const cleaned = items.map(({ _id, resumeText, jobDescription, ...rest }) => ({
        ...rest,
        ats_score: rest.analysis?.ats_score,
        job_fit_score: rest.analysis?.job_fit_score,
      }))
      return handleCORS(NextResponse.json(cleaned))
    }

    // ---- GET /api/analysis/[id] ----
    if (route.startsWith('/analysis/') && method === 'GET') {
      const id = route.split('/')[2]
      const doc = await db.collection('analyses').findOne({ id })
      if (!doc) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const { _id, ...clean } = doc
      return handleCORS(NextResponse.json(clean))
    }

    // ---- DELETE /api/analysis/[id] ----
    if (route.startsWith('/analysis/') && method === 'DELETE') {
      const id = route.split('/')[2]
      await db.collection('analyses').deleteOne({ id })
      return handleCORS(NextResponse.json({ ok: true }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
