#!/usr/bin/env python3
"""
Backend API Test Suite for CareerLens
Tests all backend endpoints with realistic data
"""

import requests
import json
import time
import io
import sys
from typing import Dict, Any

# Base URL from .env
BASE_URL = "https://ee630681-45b7-47cc-b278-9a67c495e3e8.preview.emergentagent.com/api"

# Realistic test data
REALISTIC_RESUME = """
SARAH CHEN
Senior Software Engineer
Email: sarah.chen@email.com | Phone: (555) 123-4567 | LinkedIn: linkedin.com/in/sarahchen

PROFESSIONAL SUMMARY
Results-driven Senior Software Engineer with 6+ years of experience building scalable web applications and cloud infrastructure. 
Expertise in Python, JavaScript, React, Node.js, AWS, and distributed systems. Proven track record of leading cross-functional 
teams and delivering high-impact features that improve user experience and system performance.

TECHNICAL SKILLS
• Languages: Python, JavaScript, TypeScript, SQL, Go
• Frontend: React, Next.js, Vue.js, HTML5, CSS3, Tailwind CSS
• Backend: Node.js, Express, FastAPI, Django, REST APIs, GraphQL
• Databases: PostgreSQL, MongoDB, Redis, DynamoDB
• Cloud & DevOps: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, CI/CD, Terraform
• Tools: Git, GitHub Actions, Jest, Pytest, Webpack

PROFESSIONAL EXPERIENCE

Senior Software Engineer | TechCorp Inc. | San Francisco, CA | Jan 2021 - Present
• Led development of microservices architecture serving 2M+ daily active users, reducing API latency by 40%
• Architected and implemented real-time analytics dashboard using React, Node.js, and WebSockets
• Mentored team of 4 junior engineers, conducting code reviews and establishing best practices
• Migrated legacy monolith to containerized services on AWS EKS, improving deployment frequency by 300%
• Implemented comprehensive test coverage (85%+) using Jest and Pytest

Software Engineer | StartupXYZ | Austin, TX | Jun 2018 - Dec 2020
• Built customer-facing web application using React and Django serving 500K+ users
• Designed and implemented RESTful APIs with 99.9% uptime SLA
• Optimized database queries reducing page load times by 60%
• Collaborated with product and design teams in Agile environment

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley | 2018
GPA: 3.8/4.0

CERTIFICATIONS
• AWS Certified Solutions Architect - Associate
• Certified Kubernetes Administrator (CKA)
"""

REALISTIC_JOB_DESCRIPTION = """
Senior Software Engineer - Cloud Infrastructure

We are seeking an experienced Senior Software Engineer to join our Cloud Infrastructure team. 
The ideal candidate will have strong expertise in distributed systems, cloud architecture, and modern DevOps practices.

Required Skills:
• 5+ years of software engineering experience
• Strong proficiency in Python and Go
• Experience with Kubernetes and container orchestration
• Deep understanding of AWS services (EC2, S3, Lambda, EKS, RDS)
• Experience building and maintaining microservices architectures
• Strong knowledge of CI/CD pipelines and infrastructure as code (Terraform, CloudFormation)
• Experience with monitoring and observability tools (Prometheus, Grafana, DataDog)

Nice to Have:
• Experience with service mesh technologies (Istio, Linkerd)
• Knowledge of security best practices and compliance standards
• Experience with multi-cloud environments (AWS, GCP, Azure)
• Contributions to open-source projects

Responsibilities:
• Design and implement scalable cloud infrastructure solutions
• Lead technical initiatives and mentor junior engineers
• Collaborate with cross-functional teams to deliver high-quality software
• Participate in on-call rotation and incident response
"""

def print_test_header(test_name: str):
    """Print formatted test header"""
    print("\n" + "="*80)
    print(f"TEST: {test_name}")
    print("="*80)

def print_success(message: str):
    """Print success message"""
    print(f"✅ SUCCESS: {message}")

def print_error(message: str):
    """Print error message"""
    print(f"❌ FAILURE: {message}")

def print_info(message: str):
    """Print info message"""
    print(f"ℹ️  INFO: {message}")

def validate_analysis_response(data: Dict[str, Any]) -> bool:
    """Validate the structure of /api/analyze response"""
    required_top_level = ['id', 'userId', 'resumeName', 'jobTitle', 'createdAt', 'analysis']
    
    for field in required_top_level:
        if field not in data:
            print_error(f"Missing top-level field: {field}")
            return False
    
    analysis = data.get('analysis', {})
    required_analysis_fields = [
        'summary', 'ats_score', 'score_breakdown', 'job_fit_score',
        'strengths', 'weak_points', 'red_flags', 'missing_keywords',
        'skill_gaps', 'tailored_bullets', 'project_ideas', 
        'role_recommendations', 'action_plan', 'interview_prep'
    ]
    
    for field in required_analysis_fields:
        if field not in analysis:
            print_error(f"Missing analysis field: {field}")
            return False
    
    # Validate score_breakdown has 6 dimensions
    score_breakdown = analysis.get('score_breakdown', {})
    required_dimensions = [
        'keyword_match', 'semantic_similarity', 'structure_readability',
        'role_fit', 'skill_coverage', 'experience_fit'
    ]
    
    for dim in required_dimensions:
        if dim not in score_breakdown:
            print_error(f"Missing score_breakdown dimension: {dim}")
            return False
        
        dim_data = score_breakdown[dim]
        if not all(k in dim_data for k in ['score', 'weight', 'reason']):
            print_error(f"Dimension {dim} missing required fields (score, weight, reason)")
            return False
    
    # Validate ats_score is 0-100
    ats_score = analysis.get('ats_score')
    if not isinstance(ats_score, int) or not (0 <= ats_score <= 100):
        print_error(f"Invalid ats_score: {ats_score} (must be integer 0-100)")
        return False
    
    # Validate job_fit_score is 0-100
    job_fit_score = analysis.get('job_fit_score')
    if not isinstance(job_fit_score, int) or not (0 <= job_fit_score <= 100):
        print_error(f"Invalid job_fit_score: {job_fit_score} (must be integer 0-100)")
        return False
    
    # Validate action_plan structure
    action_plan = analysis.get('action_plan', {})
    if not all(k in action_plan for k in ['short_term', 'medium_term', 'long_term']):
        print_error("action_plan missing required fields (short_term, medium_term, long_term)")
        return False
    
    print_success("Response structure validation passed")
    return True

def test_parse_file_txt():
    """Test POST /api/parse-file with .txt file"""
    print_test_header("POST /api/parse-file - TXT file (success case)")
    
    try:
        # Create a realistic resume text file
        file_content = REALISTIC_RESUME.encode('utf-8')
        files = {'file': ('resume.txt', io.BytesIO(file_content), 'text/plain')}
        
        print_info(f"Sending request to {BASE_URL}/parse-file")
        response = requests.post(f"{BASE_URL}/parse-file", files=files, timeout=30)
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response keys: {list(data.keys())}")
            
            # Validate response structure
            if 'text' in data and 'filename' in data and 'length' in data:
                print_success(f"Parsed file: {data['filename']}, length: {data['length']} chars")
                
                if data['length'] > 500:
                    print_success("Text extraction successful with meaningful content")
                    return True, data
                else:
                    print_error(f"Extracted text too short: {data['length']} chars")
                    return False, None
            else:
                print_error(f"Missing required fields in response: {data}")
                return False, None
        else:
            print_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_parse_file_unsupported():
    """Test POST /api/parse-file with unsupported file type"""
    print_test_header("POST /api/parse-file - Unsupported file type (error case)")
    
    try:
        # Create a fake .jpg file
        file_content = b'\xFF\xD8\xFF\xE0'  # JPEG header
        files = {'file': ('image.jpg', io.BytesIO(file_content), 'image/jpeg')}
        
        print_info(f"Sending request to {BASE_URL}/parse-file with .jpg file")
        response = requests.post(f"{BASE_URL}/parse-file", files=files, timeout=30)
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print_success(f"Correctly rejected unsupported file type: {data.get('error')}")
            return True, None
        else:
            print_error(f"Expected 400, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_parse_file_empty():
    """Test POST /api/parse-file with empty file"""
    print_test_header("POST /api/parse-file - Empty file (error case)")
    
    try:
        # Create an empty .txt file
        file_content = b''
        files = {'file': ('empty.txt', io.BytesIO(file_content), 'text/plain')}
        
        print_info(f"Sending request to {BASE_URL}/parse-file with empty file")
        response = requests.post(f"{BASE_URL}/parse-file", files=files, timeout=30)
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print_success(f"Correctly rejected empty file: {data.get('error')}")
            return True, None
        else:
            print_error(f"Expected 400, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_analyze_success():
    """Test POST /api/analyze with valid data"""
    print_test_header("POST /api/analyze - Valid analysis (CRITICAL TEST)")
    
    try:
        payload = {
            "resumeText": REALISTIC_RESUME,
            "jobDescription": REALISTIC_JOB_DESCRIPTION,
            "userId": "test_user_sarah_chen_001",
            "resumeName": "Sarah_Chen_Resume.pdf",
            "jobTitle": "Senior Software Engineer - Cloud Infrastructure"
        }
        
        print_info(f"Sending request to {BASE_URL}/analyze")
        print_info(f"Resume length: {len(REALISTIC_RESUME)} chars")
        print_info(f"Job description length: {len(REALISTIC_JOB_DESCRIPTION)} chars")
        print_info("⏳ This may take 15-45 seconds (calling OpenAI GPT-4o)...")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/analyze",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=120  # 2 minute timeout for LLM call
        )
        elapsed = time.time() - start_time
        
        print_info(f"Status code: {response.status_code}")
        print_info(f"Response time: {elapsed:.2f} seconds")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response top-level keys: {list(data.keys())}")
            
            # Validate response structure
            if validate_analysis_response(data):
                analysis = data['analysis']
                print_success(f"Analysis ID: {data['id']}")
                print_success(f"ATS Score: {analysis['ats_score']}/100")
                print_success(f"Job Fit Score: {analysis['job_fit_score']}/100")
                print_success(f"Strengths count: {len(analysis['strengths'])}")
                print_success(f"Weak points count: {len(analysis['weak_points'])}")
                print_success(f"Missing keywords count: {len(analysis['missing_keywords'])}")
                print_success(f"Tailored bullets count: {len(analysis['tailored_bullets'])}")
                print_success(f"Project ideas count: {len(analysis['project_ideas'])}")
                
                return True, data
            else:
                print_error("Response structure validation failed")
                return False, None
        else:
            print_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False, None
            
    except requests.exceptions.Timeout:
        print_error("Request timed out after 120 seconds")
        return False, None
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_analyze_empty_resume():
    """Test POST /api/analyze with empty resume text"""
    print_test_header("POST /api/analyze - Empty resume (error case)")
    
    try:
        payload = {
            "resumeText": "",
            "jobDescription": REALISTIC_JOB_DESCRIPTION,
            "userId": "test_user_002",
            "resumeName": "Empty_Resume.txt",
            "jobTitle": "Test Job"
        }
        
        print_info(f"Sending request to {BASE_URL}/analyze with empty resumeText")
        response = requests.post(
            f"{BASE_URL}/analyze",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print_success(f"Correctly rejected empty resume: {data.get('error')}")
            return True, None
        else:
            print_error(f"Expected 400, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_history(user_id: str):
    """Test GET /api/history"""
    print_test_header("GET /api/history - Retrieve user's analysis history")
    
    try:
        print_info(f"Sending request to {BASE_URL}/history?userId={user_id}")
        response = requests.get(f"{BASE_URL}/history?userId={user_id}", timeout=30)
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response type: {type(data)}")
            
            if isinstance(data, list):
                print_success(f"Retrieved {len(data)} history items")
                
                if len(data) > 0:
                    first_item = data[0]
                    print_info(f"First item keys: {list(first_item.keys())}")
                    
                    # Verify resumeText is NOT in history (should be stripped)
                    if 'resumeText' in first_item:
                        print_error("resumeText should not be in history response (should be stripped)")
                        return False, None
                    
                    # Verify required fields are present
                    required_fields = ['id', 'userId', 'resumeName', 'ats_score', 'job_fit_score', 'createdAt']
                    missing = [f for f in required_fields if f not in first_item]
                    
                    if missing:
                        print_error(f"Missing fields in history item: {missing}")
                        return False, None
                    
                    print_success(f"History item structure valid")
                    print_success(f"Sample: {first_item['resumeName']} - ATS: {first_item['ats_score']}, Fit: {first_item['job_fit_score']}")
                    return True, data
                else:
                    print_error("Expected at least 1 history item, got 0")
                    return False, None
            else:
                print_error(f"Expected array, got {type(data)}")
                return False, None
        else:
            print_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_get_analysis(analysis_id: str):
    """Test GET /api/analysis/{id}"""
    print_test_header("GET /api/analysis/{id} - Retrieve single analysis")
    
    try:
        print_info(f"Sending request to {BASE_URL}/analysis/{analysis_id}")
        response = requests.get(f"{BASE_URL}/analysis/{analysis_id}", timeout=30)
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response keys: {list(data.keys())}")
            
            # Verify it has the full analysis object
            if 'analysis' in data and 'id' in data:
                if data['id'] == analysis_id:
                    print_success(f"Retrieved analysis {analysis_id}")
                    print_success(f"Analysis contains full data including analysis object")
                    return True, data
                else:
                    print_error(f"ID mismatch: expected {analysis_id}, got {data['id']}")
                    return False, None
            else:
                print_error("Missing 'analysis' or 'id' field in response")
                return False, None
        else:
            print_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_get_analysis_not_found():
    """Test GET /api/analysis/{id} with non-existent ID"""
    print_test_header("GET /api/analysis/{id} - Non-existent ID (error case)")
    
    try:
        fake_id = "00000000-0000-0000-0000-000000000000"
        print_info(f"Sending request to {BASE_URL}/analysis/{fake_id}")
        response = requests.get(f"{BASE_URL}/analysis/{fake_id}", timeout=30)
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 404:
            print_success("Correctly returned 404 for non-existent analysis")
            return True, None
        else:
            print_error(f"Expected 404, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_delete_analysis(analysis_id: str):
    """Test DELETE /api/analysis/{id}"""
    print_test_header("DELETE /api/analysis/{id} - Delete analysis")
    
    try:
        print_info(f"Sending DELETE request to {BASE_URL}/analysis/{analysis_id}")
        response = requests.delete(f"{BASE_URL}/analysis/{analysis_id}", timeout=30)
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok') == True:
                print_success(f"Successfully deleted analysis {analysis_id}")
                return True, None
            else:
                print_error(f"Unexpected response: {data}")
                return False, None
        else:
            print_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def test_verify_deletion(analysis_id: str):
    """Verify analysis was deleted by trying to GET it"""
    print_test_header("Verify deletion - GET deleted analysis should return 404")
    
    try:
        print_info(f"Sending request to {BASE_URL}/analysis/{analysis_id}")
        response = requests.get(f"{BASE_URL}/analysis/{analysis_id}", timeout=30)
        
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 404:
            print_success("Deletion verified - analysis no longer exists")
            return True, None
        else:
            print_error(f"Expected 404, got {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Exception occurred: {str(e)}")
        return False, None

def main():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("CAREERLENS BACKEND API TEST SUITE")
    print("="*80)
    print_info(f"Base URL: {BASE_URL}")
    print_info(f"Starting tests at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {}
    analysis_id = None
    user_id = None
    
    # Test 1: Parse file - TXT success
    success, _ = test_parse_file_txt()
    results['parse_file_txt'] = success
    
    # Test 2: Parse file - Unsupported type
    success, _ = test_parse_file_unsupported()
    results['parse_file_unsupported'] = success
    
    # Test 3: Parse file - Empty file
    success, _ = test_parse_file_empty()
    results['parse_file_empty'] = success
    
    # Test 4: Analyze - Empty resume error
    success, _ = test_analyze_empty_resume()
    results['analyze_empty_resume'] = success
    
    # Test 5: Analyze - Success (CRITICAL)
    success, analysis_data = test_analyze_success()
    results['analyze_success'] = success
    
    if success and analysis_data:
        analysis_id = analysis_data.get('id')
        user_id = analysis_data.get('userId')
        print_info(f"Captured analysis_id: {analysis_id}")
        print_info(f"Captured user_id: {user_id}")
    
    # Test 6: History
    if user_id:
        success, _ = test_history(user_id)
        results['history'] = success
    else:
        print_error("Skipping history test - no user_id available")
        results['history'] = False
    
    # Test 7: Get analysis by ID
    if analysis_id:
        success, _ = test_get_analysis(analysis_id)
        results['get_analysis'] = success
    else:
        print_error("Skipping get_analysis test - no analysis_id available")
        results['get_analysis'] = False
    
    # Test 8: Get non-existent analysis
    success, _ = test_get_analysis_not_found()
    results['get_analysis_not_found'] = success
    
    # Test 9: Delete analysis
    if analysis_id:
        success, _ = test_delete_analysis(analysis_id)
        results['delete_analysis'] = success
    else:
        print_error("Skipping delete_analysis test - no analysis_id available")
        results['delete_analysis'] = False
    
    # Test 10: Verify deletion
    if analysis_id:
        success, _ = test_verify_deletion(analysis_id)
        results['verify_deletion'] = success
    else:
        print_error("Skipping verify_deletion test - no analysis_id available")
        results['verify_deletion'] = False
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print("\n" + "-"*80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("="*80)
    
    # Exit with appropriate code
    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
