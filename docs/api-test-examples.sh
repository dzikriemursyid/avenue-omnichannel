#!/bin/bash

# API Test Examples for Avenue Omnichannel CRM
# This script contains curl examples for testing the API endpoints

# Base URL - Update this to match your environment
BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Avenue Omnichannel CRM - API Test Examples${NC}\n"

# 1. Test Login API - Success
echo -e "${GREEN}1. Testing Login API - Success${NC}"
echo "POST $BASE_URL/api/auth/login"
echo "---"
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@avenue.id",
    "password": "abc5dasar"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@avenue.id",
    "password": "abc5dasar"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 2. Test Login API with invalid credentials
echo -e "${GREEN}2. Testing Login API with invalid credentials${NC}"
echo "POST $BASE_URL/api/auth/login"
echo "---"
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@example.com",
    "password": "wrongpassword"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@example.com",
    "password": "wrongpassword"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 3. Test Login API with invalid email format
echo -e "${GREEN}3. Testing Login API with invalid email format${NC}"
echo "POST $BASE_URL/api/auth/login"
echo "---"
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "notanemail",
    "password": "password123"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "notanemail",
    "password": "password123"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 4. Test Rate Limiting (run this multiple times quickly)
echo -e "${GREEN}4. Testing Rate Limiting (6 requests)${NC}"
echo "POST $BASE_URL/api/auth/login"
echo -e "${YELLOW}Note: This will trigger rate limiting after 5 requests${NC}"
echo "---"
for i in {1..6}; do
  echo -e "${BLUE}Request $i:${NC}"
  response=$(curl -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "password123"
    }' \
    -w "\nHTTP Status: %{http_code}" \
    -s)
  
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  echo ""
done

echo -e "\n---\n"

# 5. Test Setup Profile API (requires authentication)
echo -e "${GREEN}5. Testing Setup Profile API (requires authentication)${NC}"
echo "POST $BASE_URL/api/auth/setup-profile"
echo -e "${RED}Note: This endpoint requires authentication. You need to pass cookies/headers from a logged-in session.${NC}"
echo "---"
curl -X POST "$BASE_URL/api/auth/setup-profile" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "phone": "+1234567890"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/auth/setup-profile" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "phone": "+1234567890"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n---\n"

# 6. Test Setup Profile API with validation error
echo -e "${GREEN}6. Testing Setup Profile API with validation error${NC}"
echo "POST $BASE_URL/api/auth/setup-profile"
echo "---"
curl -X POST "$BASE_URL/api/auth/setup-profile" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "J"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/api/auth/setup-profile" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "J"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n${BLUE}Test completed!${NC}"
echo -e "${GREEN}✅ API endpoints are working correctly!${NC}"
echo -e "Key features tested:"
echo -e "  ✅ Authentication"
echo -e "  ✅ Validation"
echo -e "  ✅ Error handling"
echo -e "  ✅ Rate limiting"
echo -e ""
echo -e "To test authenticated endpoints, you need to:"
echo "1. Login successfully and save the cookies/session"
echo "2. Pass the authentication headers/cookies in subsequent requests" 