// Heuristic ATS Analyzer — no AI, runs locally, free forever.
// Returns the SAME schema as the LLM version so the UI works unchanged.

const STOPWORDS = new Set(('a about above after again against all am an and any are as at be because been before being below between both but by could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such t than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with you your yours yourself yourselves we\'re i\'m you\'ll they\'ll he\'ll she\'ll role roles work working position positions strong proven excellent good great able candidate candidates ideal looking seeking required preferred plus bonus must should responsibilities responsibility experience experienced including include includes etc team teams company year years month months day days time times new high low best top very many much also one two three four five six seven eight nine ten').split(/\s+/))

// Curated technical / role / soft skill dictionary — these get higher weight when matched
const TECH_TERMS = new Set([
  // languages
  'javascript','typescript','python','java','c++','c#','go','golang','rust','ruby','php','swift','kotlin','scala','r','sql','nosql','bash','shell','html','css','sass','less',
  // frontend
  'react','reactjs','next.js','nextjs','vue','vuejs','angular','svelte','redux','tailwind','tailwindcss','bootstrap','material-ui','mui','shadcn','jquery','webpack','vite','rollup','babel',
  // backend
  'node.js','nodejs','express','fastify','nestjs','django','flask','fastapi','spring','spring-boot','rails','laravel','symfony','asp.net','dotnet','graphql','rest','restful','grpc','websocket','microservices','soa','mvc',
  // databases
  'postgresql','postgres','mysql','mariadb','sqlite','mongodb','dynamodb','cassandra','redis','elasticsearch','snowflake','bigquery','databricks','redshift','clickhouse','neo4j','firebase','firestore','supabase',
  // cloud / devops
  'aws','azure','gcp','google-cloud','docker','kubernetes','k8s','terraform','ansible','jenkins','circleci','github-actions','gitlab-ci','helm','istio','prometheus','grafana','datadog','sentry','newrelic','lambda','s3','ec2','rds','cloudfront','cloudfunctions','cloudrun','vercel','netlify','heroku','digitalocean','linode',
  // data / ml / ai
  'pytorch','tensorflow','keras','scikit-learn','sklearn','pandas','numpy','scipy','matplotlib','seaborn','plotly','jupyter','spark','hadoop','kafka','airflow','dbt','llm','llms','openai','anthropic','huggingface','transformers','bert','gpt','rag','embeddings','vector','pinecone','chromadb','weaviate','langchain','llamaindex',
  // testing
  'jest','mocha','chai','cypress','playwright','selenium','pytest','unittest','junit','rspec','testing-library',
  // tools / misc
  'git','github','gitlab','bitbucket','jira','confluence','slack','figma','sketch','adobe','linux','unix','macos','windows','agile','scrum','kanban','tdd','bdd','ci/cd','cicd','devops','sre','observability','monitoring','security','oauth','jwt','saml','sso','ldap','encryption','tls','ssl','https','api','sdk','cli','npm','yarn','pnpm','pip','poetry','maven','gradle',
  // soft skills / role
  'leadership','mentoring','communication','collaboration','problem-solving','analytical','stakeholder','cross-functional','architecture','design','scalability','performance','optimization','refactoring','code-review','documentation',
])

function normalize(text) {
  return (text || '').toLowerCase().replace(/[\u2018\u2019\u201C\u201D]/g, "'").replace(/[\r\n]+/g, '\n')
}

function tokenize(text) {
  // keep dotted/hyphenated tech terms intact (next.js, c++, ci/cd, etc.)
  const matches = normalize(text).match(/[a-z0-9][a-z0-9+#./-]*[a-z0-9+#]|[a-z]/g) || []
  return matches.filter(t => t.length >= 2 && !STOPWORDS.has(t))
}

function extractKeywords(jdText, max = 30) {
  const tokens = tokenize(jdText)
  const freq = new Map()
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1)
  // boost tech terms
  const scored = [...freq.entries()].map(([term, count]) => {
    let score = count
    if (TECH_TERMS.has(term)) score *= 3
    if (/[A-Z]/.test(term)) score *= 1.2
    if (term.includes('.') || term.includes('-') || term.includes('+')) score *= 1.5
    return { term, count, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max)
}

function detectSections(resume) {
  const t = resume.toLowerCase()
  return {
    has_contact: /@[\w.-]+\.\w+|\+?\d[\d\s().-]{7,}/.test(resume),
    has_email: /[\w.-]+@[\w.-]+\.\w+/.test(resume),
    has_phone: /\+?\d[\d\s().-]{7,}/.test(resume),
    has_linkedin: /linkedin\.com\/in\//.test(t),
    has_github: /github\.com\//.test(t),
    has_summary: /\b(summary|profile|objective|about me)\b/.test(t),
    has_experience: /\b(experience|employment|work history|professional experience)\b/.test(t),
    has_education: /\b(education|degree|university|college|b\.?sc|m\.?sc|bachelor|master|phd)\b/.test(t),
    has_skills: /\b(skills|technical skills|technologies|tech stack)\b/.test(t),
    has_projects: /\b(projects|portfolio|side projects)\b/.test(t),
    has_certifications: /\b(certifications?|certified|certificate)\b/.test(t),
    has_dates: /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)[\s,]*\d{2,4}|\b(19|20)\d{2}\s*[-–to]+\s*(19|20)?\d{0,4}|present|current/i.test(resume),
    has_metrics: /\d+\s*(%|percent|x|users|customers|requests|million|thousand|k\b|users|hours)/i.test(resume),
    bullet_count: (resume.match(/^[\s]*[•*\-▪◦]\s/gm) || []).length,
  }
}

function estimateExperienceYears(resume) {
  const yearPattern = /\b(19[5-9]\d|20[0-3]\d)\b/g
  const years = [...resume.matchAll(yearPattern)].map(m => parseInt(m[1]))
  if (years.length < 2) return 0
  const min = Math.min(...years), max = Math.max(...years)
  const nowYear = new Date().getFullYear()
  const cap = Math.min(max, nowYear)
  return Math.max(0, cap - min)
}

function clamp(n, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, Math.round(n))) }

export function analyzeHeuristic(resumeText, jobDescription = '') {
  const resume = resumeText || ''
  const jd = jobDescription || ''
  const sections = detectSections(resume)
  const resumeTokens = new Set(tokenize(resume))
  const expYears = estimateExperienceYears(resume)

  // Keyword extraction from JD
  const jdKeywords = extractKeywords(jd, 40)
  const matched = jdKeywords.filter(k => resumeTokens.has(k.term))
  const missing = jdKeywords.filter(k => !resumeTokens.has(k.term))
  const matchRatio = jdKeywords.length ? matched.length / jdKeywords.length : 0.5

  // Score dimensions
  const keyword_match = {
    score: clamp(matchRatio * 100),
    weight: 25,
    reason: jd ? `${matched.length} of ${jdKeywords.length} top JD keywords found in resume (${Math.round(matchRatio*100)}%).` : 'No JD provided — neutral score.'
  }
  // semantic similarity ~ Jaccard
  const jdTokens = new Set(tokenize(jd))
  const inter = [...jdTokens].filter(t => resumeTokens.has(t)).length
  const union = new Set([...jdTokens, ...resumeTokens]).size || 1
  const jaccard = inter / union
  const semantic_similarity = {
    score: clamp(jaccard * 100 * 4), // amplify since Jaccard tends to be small
    weight: 15,
    reason: jd ? `Token-set overlap (Jaccard ${(jaccard*100).toFixed(1)}%) between resume and JD.` : 'No JD provided.'
  }
  // structure
  const structureBits = [
    sections.has_contact, sections.has_summary, sections.has_experience,
    sections.has_education, sections.has_skills, sections.has_dates,
    sections.bullet_count >= 5
  ]
  const structureScore = (structureBits.filter(Boolean).length / structureBits.length) * 100
  const structure_readability = {
    score: clamp(structureScore),
    weight: 15,
    reason: `Detected: ${[sections.has_contact && 'contact', sections.has_summary && 'summary', sections.has_experience && 'experience', sections.has_education && 'education', sections.has_skills && 'skills', sections.has_dates && 'dates', sections.bullet_count >= 5 && 'bullets'].filter(Boolean).join(', ') || 'few sections'}. ${sections.bullet_count} bullets.`
  }
  // role fit — based on overlap of high-value tech terms with JD
  const techInResume = [...resumeTokens].filter(t => TECH_TERMS.has(t))
  const techInJd = [...jdTokens].filter(t => TECH_TERMS.has(t))
  const techOverlap = techInJd.length ? techInJd.filter(t => resumeTokens.has(t)).length / techInJd.length : 0.5
  const role_fit = {
    score: clamp(techOverlap * 100),
    weight: 15,
    reason: jd ? `${Math.round(techOverlap*100)}% of high-value technical terms from JD are present in resume.` : 'No JD provided — based on tech breadth alone.'
  }
  // skill coverage
  const skill_coverage = {
    score: clamp((techInResume.length / 15) * 100),
    weight: 15,
    reason: `${techInResume.length} recognized technical skills found in resume.`
  }
  // experience fit
  const experience_fit = {
    score: clamp(expYears >= 5 ? 90 : expYears >= 3 ? 75 : expYears >= 1 ? 60 : 45),
    weight: 15,
    reason: expYears > 0 ? `Approx ${expYears} years of experience inferred from dates.` : 'Could not infer years of experience from dates.'
  }

  // Weighted overall
  const dims = [keyword_match, semantic_similarity, structure_readability, role_fit, skill_coverage, experience_fit]
  const weightSum = dims.reduce((s, d) => s + d.weight, 0)
  const ats_score = clamp(dims.reduce((s, d) => s + d.score * d.weight, 0) / weightSum)
  const job_fit_score = clamp((keyword_match.score * 0.5) + (role_fit.score * 0.3) + (semantic_similarity.score * 0.2))

  // Strengths
  const strengths = []
  if (techInResume.length >= 10) strengths.push({ title: 'Strong technical breadth', detail: `${techInResume.length} recognized technologies: ${techInResume.slice(0, 8).join(', ')}.` })
  if (sections.has_metrics) strengths.push({ title: 'Uses quantified impact', detail: 'Resume includes numbers/metrics (%, x, users, etc.), which recruiters love.' })
  if (sections.has_github || sections.has_linkedin) strengths.push({ title: 'Public profile linked', detail: `${[sections.has_github && 'GitHub', sections.has_linkedin && 'LinkedIn'].filter(Boolean).join(' & ')} present — easy to verify.` })
  if (sections.has_projects) strengths.push({ title: 'Projects section present', detail: 'Demonstrates hands-on, beyond-job work — strong signal for engineering roles.' })
  if (expYears >= 3) strengths.push({ title: `${expYears} years of experience`, detail: 'Solid track record inferred from dated entries.' })
  if (matched.length >= 5) strengths.push({ title: 'Good keyword alignment', detail: `Already matches: ${matched.slice(0, 6).map(k => k.term).join(', ')}.` })
  if (strengths.length === 0) strengths.push({ title: 'Resume submitted', detail: 'Content extracted successfully. Improve with the suggestions below.' })

  // Weak points
  const weak_points = []
  if (!sections.has_summary) weak_points.push({ title: 'No professional summary', detail: 'Add a 2–3 line summary at the top tailored to the target role.', severity: 'medium' })
  if (!sections.has_metrics) weak_points.push({ title: 'No quantified achievements', detail: 'Bullets lack numbers. Add metrics (e.g., "reduced latency by 40%", "served 10K users").', severity: 'high' })
  if (!sections.has_skills) weak_points.push({ title: 'No dedicated Skills section', detail: 'Recruiters and ATS scan for a Skills block. Add one with grouped tech.', severity: 'medium' })
  if (sections.bullet_count < 5) weak_points.push({ title: 'Too few bullet points', detail: `Only ${sections.bullet_count} bullets detected. Use 3–5 bullets per role.`, severity: 'medium' })
  if (!sections.has_projects && techInResume.length < 8) weak_points.push({ title: 'No Projects section', detail: 'Add 1–2 personal/side projects to showcase skills.', severity: 'low' })
  if (matched.length < 5 && jd) weak_points.push({ title: 'Low keyword match with JD', detail: `Only ${matched.length} JD keywords found. See Missing Keywords tab.`, severity: 'high' })

  // Red flags
  const red_flags = []
  if (!sections.has_email) red_flags.push({ title: 'No email detected', detail: 'Critical — recruiters can\'t contact you. Add an email at the top.' })
  if (!sections.has_dates) red_flags.push({ title: 'No dates on experience', detail: 'Missing dates raises questions about timeline. Add month/year ranges.' })
  if (resume.length < 800) red_flags.push({ title: 'Resume is very short', detail: 'Under 800 characters — likely incomplete. Expand experience and skills.' })
  if (resume.length > 12000) red_flags.push({ title: 'Resume is very long', detail: 'Over 12K characters — most recruiters skim. Trim to 1–2 pages.' })

  // Missing keywords
  const missing_keywords = missing.slice(0, 20).map(k => ({
    keyword: k.term,
    importance: (k.score >= 4 || TECH_TERMS.has(k.term)) ? 'must-have' : 'nice-to-have',
    where_to_add: TECH_TERMS.has(k.term) ? 'Add to Skills section if you have real experience with it.' : 'Mention naturally in Experience bullets or Summary if relevant.',
  }))

  // Skill gaps
  const skill_gaps = missing.filter(k => TECH_TERMS.has(k.term)).slice(0, 8).map(k => ({
    skill: k.term,
    why_it_matters: `Mentioned in JD ${k.count} time(s) — likely required.`,
    how_to_learn: `Build a small project using ${k.term} or take a focused course (e.g., on YouTube, freeCodeCamp, or Coursera). Add it to resume only after real hands-on use.`,
  }))

  // Tailored bullets — generic templates grounded by detected tech
  const topTech = techInResume.slice(0, 5)
  const tailored_bullets = topTech.map(t => ({
    section: 'Experience',
    original: '(your existing bullet involving ' + t + ')',
    rewritten: `Built / shipped <feature> using ${t}, resulting in <metric> (e.g., 30% faster load, 2x user retention).`,
    rationale: `Lead with action verb + tech (${t}) + measurable outcome. ATS and recruiters scan for this pattern.`,
  }))
  if (tailored_bullets.length === 0) {
    tailored_bullets.push({
      section: 'Experience',
      original: '(generic bullet)',
      rewritten: 'Led <project>, increasing <metric> by <number> through <specific approach>.',
      rationale: 'Always: action verb → context → measurable result. Avoid vague verbs like "helped" or "worked on".',
    })
  }

  // Project ideas — based on missing tech skills
  const project_ideas = (missing.filter(k => TECH_TERMS.has(k.term)).slice(0, 3)).map(k => ({
    title: `Mini-project: ${k.term} starter`,
    description: `Build a small but real app using ${k.term} (e.g., a CRUD app, a dashboard, or a tool you'd actually use). Push it to GitHub with a clean README.`,
    skills_practiced: [k.term, 'git', 'documentation'],
    effort_hours: 12,
  }))
  if (project_ideas.length === 0) {
    project_ideas.push({
      title: 'Portfolio site',
      description: 'A clean personal site showcasing your top 3 projects, with short write-ups on architecture and decisions.',
      skills_practiced: ['frontend', 'deployment', 'writing'],
      effort_hours: 8,
    })
  }

  // Role recommendations
  const role_recommendations = []
  const hasFE = techInResume.some(t => ['react','vue','angular','next.js','svelte','tailwind'].includes(t))
  const hasBE = techInResume.some(t => ['node.js','python','django','flask','fastapi','spring','express','rails','go','rust'].includes(t))
  const hasData = techInResume.some(t => ['pandas','numpy','spark','sql','pytorch','tensorflow','sklearn','pytorch'].includes(t))
  const hasDevops = techInResume.some(t => ['docker','kubernetes','aws','gcp','azure','terraform'].includes(t))
  if (hasFE && hasBE) role_recommendations.push({ role: 'Full-Stack Engineer', fit_score: 85, why: 'Strong FE + BE coverage in resume.' })
  if (hasFE) role_recommendations.push({ role: 'Frontend Engineer', fit_score: 80, why: 'Modern FE frameworks detected.' })
  if (hasBE) role_recommendations.push({ role: 'Backend Engineer', fit_score: 80, why: 'Server-side stack present.' })
  if (hasData) role_recommendations.push({ role: 'Data / ML Engineer', fit_score: 78, why: 'Data and ML tools present in resume.' })
  if (hasDevops) role_recommendations.push({ role: 'DevOps / SRE', fit_score: 75, why: 'Cloud & infra tooling detected.' })
  if (role_recommendations.length === 0) role_recommendations.push({ role: 'Software Engineer (Generalist)', fit_score: 60, why: 'Add more specific technologies to narrow role fit.' })

  // Action plan
  const action_plan = {
    short_term: [
      { step: 'Add metrics to every experience bullet (numbers, %, scale)', impact: 'Biggest single ATS & recruiter impact.' },
      { step: 'Add a Skills section with top 10–15 technologies you actually use', impact: 'Improves keyword match instantly.' },
      ...(jd ? [{ step: `Naturally integrate top missing keywords: ${missing.slice(0,5).map(k=>k.term).join(', ')}`, impact: 'Higher ATS match for this specific JD.' }] : []),
    ],
    medium_term: [
      { step: 'Build 1 project in your weakest required area (see Skill Gaps)', impact: 'Lets you honestly claim the skill on resume.' },
      { step: 'Get 2-3 LinkedIn recommendations from past managers/peers', impact: 'Social proof for recruiters.' },
      { step: 'Tailor resume per application — adjust summary & bullet order', impact: '+15-25% interview rate from same applications.' },
    ],
    long_term: [
      { step: 'Publish 2-3 technical blog posts or talks in your specialty', impact: 'Establishes authority, attracts inbound recruiter interest.' },
      { step: 'Contribute to one well-known open-source project', impact: 'Public proof of code quality.' },
      { step: 'Pursue a relevant certification (cloud, security, ML) if applicable', impact: 'Helps with HR filters at larger companies.' },
    ],
  }

  // Interview prep
  const interview_prep = []
  topTech.slice(0, 3).forEach(t => interview_prep.push({
    topic: t,
    question: `Walk me through a project where you used ${t}. What were the trade-offs and what would you do differently?`,
    why: `You listed ${t} on your resume — expect deep-dive questions.`,
  }))
  if (jd) {
    interview_prep.push({
      topic: 'Role fit',
      question: 'Why this role / this company specifically, and how do your past experiences map to the JD?',
      why: 'Universal opener — prepare a 60-second story tying your background to the JD\'s 2-3 key requirements.',
    })
  }
  interview_prep.push({
    topic: 'Behavioral',
    question: 'Tell me about a time you disagreed with a teammate or manager — how did you handle it?',
    why: 'Tests collaboration and communication — use STAR format (Situation, Task, Action, Result).',
  })

  // Summary
  const summary = `Candidate with ${expYears || 'unknown'} years of experience and ${techInResume.length} recognized technical skills. Resume ${sections.has_metrics ? 'includes' : 'lacks'} quantified achievements and ${sections.has_skills ? 'has' : 'is missing'} a dedicated Skills section. ${jd ? `Matches ${matched.length}/${jdKeywords.length} top JD keywords.` : 'No JD provided — general ATS analysis only.'}`

  return {
    summary,
    ats_score,
    score_breakdown: { keyword_match, semantic_similarity, structure_readability, role_fit, skill_coverage, experience_fit },
    job_fit_score,
    strengths,
    weak_points,
    red_flags,
    missing_keywords,
    skill_gaps,
    tailored_bullets,
    project_ideas,
    role_recommendations,
    action_plan,
    interview_prep,
  }
}
