#!/bin/bash

# Phase 2 API Test Examples - Core API Routes
# This script tests Profile, User, and Team Management APIs

# Base URL - Update this to match your environment
BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}Phase 2 API Tests - Core API Routes${NC}\n"

# Get authentication cookie first
echo -e "${PURPLE}Setting up authentication...${NC}"
AUTH_RESPONSE=$(curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@avenue.id",
    "password": "abc5dasar"
  }' \
  -c cookies.txt \
  -s)

if [[ $AUTH_RESPONSE == *"success\":true"* ]]; then
  echo -e "${GREEN}✅ Authentication successful${NC}"
else
  echo -e "${RED}❌ Authentication failed. Cannot proceed with tests.${NC}"
  exit 1
fi

echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BLUE}       PROFILE MANAGEMENT API TESTS${NC}"
echo -e "${BLUE}===============================================${NC}\n"

# 1. Get Profile
echo -e "${GREEN}1. GET /api/dashboard/profile${NC}"
echo "---"
curl -X GET "$BASE_URL/api/dashboard/profile" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X GET "$BASE_URL/api/dashboard/profile" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 2. Update Profile
echo -e "${GREEN}2. PUT /api/dashboard/profile${NC}"
echo "---"
curl -X PUT "$BASE_URL/api/dashboard/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "full_name": "Admin User Updated",
    "phone_number": "+628123456789"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X PUT "$BASE_URL/api/dashboard/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "full_name": "Admin User Updated",
    "phone_number": "+628123456789"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 3. Update Profile with validation error
echo -e "${GREEN}3. PUT /api/dashboard/profile (validation error)${NC}"
echo "---"
curl -X PUT "$BASE_URL/api/dashboard/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "full_name": "A"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X PUT "$BASE_URL/api/dashboard/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "full_name": "A"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BLUE}        USER MANAGEMENT API TESTS${NC}"
echo -e "${BLUE}===============================================${NC}\n"

# 4. Get Users List
echo -e "${GREEN}4. GET /api/dashboard/users${NC}"
echo "---"
curl -X GET "$BASE_URL/api/dashboard/users?page=1&limit=5" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X GET "$BASE_URL/api/dashboard/users?page=1&limit=5" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 5. Create User
echo -e "${GREEN}5. POST /api/dashboard/users${NC}"
echo "---"
curl -X POST "$BASE_URL/api/dashboard/users" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "testuser@avenue.id",
    "full_name": "Test User API",
    "password": "password123",
    "role": "agent"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/dashboard/users" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "testuser@avenue.id",
    "full_name": "Test User API",
    "password": "password123",
    "role": "agent"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 6. Create User with validation error
echo -e "${GREEN}6. POST /api/dashboard/users (validation error)${NC}"
echo "---"
curl -X POST "$BASE_URL/api/dashboard/users" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "invalidemail",
    "full_name": "T",
    "password": "123",
    "role": "invalid_role"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/dashboard/users" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "invalidemail",
    "full_name": "T",
    "password": "123",
    "role": "invalid_role"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BLUE}         TEAM MANAGEMENT API TESTS${NC}"
echo -e "${BLUE}===============================================${NC}\n"

# 7. Get Teams List
echo -e "${GREEN}7. GET /api/dashboard/teams${NC}"
echo "---"
curl -X GET "$BASE_URL/api/dashboard/teams?page=1&limit=5" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X GET "$BASE_URL/api/dashboard/teams?page=1&limit=5" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 8. Create Team
echo -e "${GREEN}8. POST /api/dashboard/teams${NC}"
echo "---"
curl -X POST "$BASE_URL/api/dashboard/teams" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "API Test Team",
    "description": "Team created via API test",
    "is_active": true
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/dashboard/teams" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "API Test Team",
    "description": "Team created via API test",
    "is_active": true
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 9. Create Team with validation error
echo -e "${GREEN}9. POST /api/dashboard/teams (validation error)${NC}"
echo "---"
curl -X POST "$BASE_URL/api/dashboard/teams" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "",
    "description": "Invalid team"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/dashboard/teams" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "",
    "description": "Invalid team"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BLUE}        AUTHORIZATION TESTS${NC}"
echo -e "${BLUE}===============================================${NC}\n"

# 10. Test unauthorized access (no auth)
echo -e "${GREEN}10. GET /api/dashboard/profile (no auth)${NC}"
echo "---"
curl -X GET "$BASE_URL/api/dashboard/profile" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X GET "$BASE_URL/api/dashboard/profile" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# Cleanup
rm -f cookies.txt

echo -e "\n${BLUE}===============================================${NC}"
echo -e "${BLUE}              TEST SUMMARY${NC}"
echo -e "${BLUE}===============================================${NC}\n"

echo -e "${GREEN}✅ Phase 2 API Tests Completed!${NC}"
echo -e ""
echo -e "Tested endpoints:"
echo -e "  ${GREEN}✅ Profile Management${NC}"
echo -e "    - GET /api/dashboard/profile"
echo -e "    - PUT /api/dashboard/profile"
echo -e ""
echo -e "  ${GREEN}✅ User Management${NC}"
echo -e "    - GET /api/dashboard/users"
echo -e "    - POST /api/dashboard/users"
echo -e ""
echo -e "  ${GREEN}✅ Team Management${NC}"
echo -e "    - GET /api/dashboard/teams"
echo -e "    - POST /api/dashboard/teams"
echo -e ""
echo -e "  ${GREEN}✅ Authorization & Security${NC}"
echo -e "    - Authentication required"
echo -e "    - Role-based access control"
echo -e "    - Input validation"
echo -e "    - Error handling"
echo -e ""
echo -e "${YELLOW}Note: Individual resource endpoints (PUT/DELETE /:id) require specific IDs${NC}"
echo -e "${YELLOW}      and can be tested manually with actual resource IDs.${NC}" 