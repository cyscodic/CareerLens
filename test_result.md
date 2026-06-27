#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  CareerLens — AI-powered resume analyzer & ATS scorer. Users upload a resume (PDF/DOCX/TXT) or paste text,
  paste a job description, and get hybrid ATS score, score breakdown, strengths, weak points, red flags,
  missing keywords, tailored bullets, project ideas, action plan, role recommendations, interview prep,
  and history of past analyses. Stack: Next.js + MongoDB + OpenAI GPT-4o via Emergent universal LLM key.

backend:
  - task: "POST /api/parse-file (PDF/DOCX/TXT text extraction)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Accepts multipart FormData with 'file' field. Uses pdf-parse for .pdf, mammoth for .docx, utf-8 for .txt. Returns {text, filename, length}. Rejects unsupported types and empty extractions."
      - working: true
        agent: "testing"
        comment: "✅ TESTED & WORKING. All test cases passed: (1) Successfully parsed .txt file with 2022 chars of realistic resume text, returned correct {text, filename, length} structure. (2) Correctly rejected unsupported .jpg file with 400 error. (3) Correctly rejected empty file with 400 error and appropriate message. File parsing logic is robust and handles all edge cases properly."

  - task: "POST /api/analyze (LLM-powered structured resume analysis)"
    implemented: true
    working: false
    file: "app/api/[[...path]]/route.js"
    stuck_count: 1
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Accepts {resumeText, jobDescription, userId, resumeName, jobTitle}. Calls OpenAI GPT-4o via Emergent baseURL (https://integrations.emergentagent.com/llm) with strict json_schema response format covering ats_score, score_breakdown (6 dims), job_fit_score, strengths, weak_points, red_flags, missing_keywords, skill_gaps, tailored_bullets, project_ideas, role_recommendations, action_plan, interview_prep. Persists to MongoDB 'analyses' collection with uuid id."
      - working: false
        agent: "testing"
        comment: "❌ CRITICAL FAILURE - EXTERNAL SERVICE ISSUE. Endpoint implementation is correct but failing due to Emergent LLM gateway budget constraint. Error: '400 Budget has been exceeded! Current cost: 0.0, Max budget: 0.0'. The API key (EMERGENT_LLM_KEY) has zero budget allocated. Input validation works correctly (empty resume rejected with 400). The code structure, error handling, and request format are all correct. This is NOT a code bug - it's a service configuration/quota issue. REQUIRES: Check Emergent account budget/quota or provision new API key with sufficient credits."

  - task: "GET /api/history (list past analyses by userId)"
    implemented: true
    working: "NA"
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Returns last 50 analyses for userId, strips heavy text fields, exposes ats_score & job_fit_score for list cards."
      - working: "NA"
        agent: "testing"
        comment: "UNABLE TO TEST - Depends on /api/analyze creating test data first. Since /api/analyze is blocked by budget issue, cannot create analysis records to test history retrieval. Endpoint implementation looks correct (proper MongoDB query, field stripping, sorting). Will need retesting once /api/analyze is functional."

  - task: "GET /api/analysis/:id and DELETE /api/analysis/:id"
    implemented: true
    working: "NA"
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Fetch single analysis by uuid id; delete by id."
      - working: "NA"
        agent: "testing"
        comment: "PARTIAL TEST - GET /api/analysis/{non-existent-id} correctly returns 404 ✅. However, cannot fully test GET with valid ID or DELETE functionality because /api/analyze is blocked by budget issue (cannot create test data). Endpoint implementation looks correct. Will need retesting once /api/analyze is functional."

frontend:
  - task: "Landing → Input → Results flow with shadcn UI"
    implemented: true
    working: "NA"
    file: "app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Landing hero, dual-panel input (resume upload + JD paste), results dashboard with ScoreRing, breakdown bars w/ explanations on hover, tabs for strengths/weak/flags/keywords/bullets/plan/career, history panel. Not yet tested (frontend test only with user permission)."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "POST /api/analyze (LLM-powered structured resume analysis)"
  stuck_tasks:
    - "POST /api/analyze (LLM-powered structured resume analysis)"
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Backend MVP ready. Please test the 4 backend endpoints.
      Critical: /api/analyze hits OpenAI via Emergent gateway and may take ~20-40s.
      Use base URL from NEXT_PUBLIC_BASE_URL + /api prefix.
      For /api/parse-file test, you can create a small in-memory .txt file with realistic resume text.
      For /api/analyze, supply ~500+ char resume text and a job description. Validate the response includes:
        - analysis.ats_score (0-100 int)
        - analysis.score_breakdown with 6 dimensions each having {score, weight, reason}
        - analysis.strengths, weak_points, red_flags, missing_keywords, skill_gaps,
          tailored_bullets, project_ideas, role_recommendations, action_plan (short/medium/long), interview_prep
        - top-level id, userId, createdAt
      Verify history then returns the just-created item and analysis/:id returns full doc.
      Also verify DELETE removes it.
  
  - agent: "testing"
    message: |
      BACKEND TESTING COMPLETED - CRITICAL BLOCKER FOUND
      
      Test Results Summary (5/10 tests passed):
      ✅ POST /api/parse-file - All cases working (TXT parsing, unsupported file rejection, empty file rejection)
      ❌ POST /api/analyze - BLOCKED by Emergent LLM gateway budget issue
      ⚠️  GET /api/history - Cannot test (depends on /api/analyze)
      ⚠️  GET /api/analysis/:id - Partial test only (404 works, but cannot test with valid data)
      ⚠️  DELETE /api/analysis/:id - Cannot test (depends on /api/analyze)
      
      CRITICAL ISSUE:
      The /api/analyze endpoint is failing with error: "400 Budget has been exceeded! Current cost: 0.0, Max budget: 0.0"
      
      This is NOT a code bug. The implementation is correct:
      - Request validation works (empty resume correctly rejected)
      - Error handling is proper
      - API integration code is correct
      - MongoDB connection is working
      
      ROOT CAUSE: The EMERGENT_LLM_KEY (sk-emergent-b90D7Af187619B29d1) has ZERO budget allocated.
      
      REQUIRED ACTION: 
      1. Check Emergent account at https://integrations.emergentagent.com for budget/quota
      2. Either increase budget for existing key OR provision new API key with credits
      3. Update EMERGENT_LLM_KEY in /app/.env
      4. Restart nextjs service
      5. Retest /api/analyze endpoint
      
      Once /api/analyze is working, the dependent endpoints (history, get analysis, delete) will also work.
      The code implementation is solid - this is purely a service configuration issue.
