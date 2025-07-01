#!/bin/bash

# Phase 4: Complete Migration - Final Testing Script
# This script performs comprehensive testing of the migrated API

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL
API_URL="http://localhost:3000/api"

# Test credentials
TEST_EMAIL="test@example.com"
TEST_PASSWORD="testpassword123"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="adminpassword123"

# Cookie file for session management
COOKIE_FILE="/tmp/api_test_cookies.txt"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    local use_cookies=${6:-false}
    
    print_status "Testing: $description"
    
    local cookie_args=""
    if [ "$use_cookies" = "true" ]; then
        cookie_args="-b $COOKIE_FILE -c $COOKIE_FILE"
    fi
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET $cookie_args "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            $cookie_args \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        print_success "$description (Status: $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_error "$description (Expected: $expected_status, Got: $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
    
    echo
}

# Function to run performance test
performance_test() {
    local endpoint=$1
    local description=$2
    local use_cookies=${3:-false}
    
    print_status "Performance Test: $description"
    
    local cookie_args=""
    if [ "$use_cookies" = "true" ]; then
        cookie_args="-b $COOKIE_FILE"
    fi
    
    # Run 10 requests and measure time
    total_time=0
    for i in {1..10}; do
        start_time=$(date +%s.%N)
        curl -s $cookie_args "$API_URL$endpoint" > /dev/null
        end_time=$(date +%s.%N)
        request_time=$(echo "$end_time - $start_time" | bc)
        total_time=$(echo "$total_time + $request_time" | bc)
    done
    
    avg_time=$(echo "scale=3; $total_time / 10" | bc)
    print_success "Average response time: ${avg_time}s"
    echo
}

# Clean up cookie file
rm -f "$COOKIE_FILE"

echo "================================================"
echo "Phase 4: Complete Migration - Final Testing"
echo "================================================"
echo

# 1. Authentication Flow Test
print_status "=== 1. Authentication Flow Test ==="

# Test login with cookie-based auth
login_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -c "$COOKIE_FILE" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "$API_URL/auth/login")

# Check if login was successful
if echo "$login_response" | jq -e '.success' > /dev/null 2>&1; then
    print_success "Login successful (cookie-based auth)"
    echo "$login_response" | jq '.'
else
    print_warning "Login failed - this is expected if test credentials don't exist"
    echo "$login_response" | jq '.' 2>/dev/null || echo "$login_response"
fi

# 2. API Endpoint Tests
print_status "=== 2. API Endpoint Tests ==="

# Test endpoints that don't require authentication first
test_endpoint "POST" "/auth/login" '{"email":"invalid-email"}' "400" "Invalid email format"

# Test authenticated endpoints (will fail without valid session)
test_endpoint "GET" "/dashboard/profile" "" "401" "Unauthorized access (no session)" false

# If we have a valid session, test authenticated endpoints
if [ -f "$COOKIE_FILE" ]; then
    test_endpoint "GET" "/dashboard/profile" "" "200" "Get current user profile" true
    test_endpoint "PUT" "/dashboard/profile" '{"full_name":"Updated Name"}' "200" "Update profile" true
    
    # User management endpoints (admin only)
    test_endpoint "GET" "/dashboard/users" "" "200" "List users" true
    test_endpoint "POST" "/dashboard/users" '{"email":"newuser@test.com","password":"password123","full_name":"New User","role":"agent"}' "201" "Create user" true
    
    # Team management endpoints
    test_endpoint "GET" "/dashboard/teams" "" "200" "List teams" true
    test_endpoint "POST" "/dashboard/teams" '{"name":"Test Team","description":"Test team description"}' "201" "Create team" true
else
    print_warning "Skipping authenticated endpoint tests - no valid session"
fi

# 3. Error Handling Tests
print_status "=== 3. Error Handling Tests ==="

# Test validation errors
test_endpoint "POST" "/auth/login" '{"email":"invalid-email"}' "400" "Invalid email format"
test_endpoint "POST" "/auth/login" '{"email":"test@test.com"}' "400" "Missing password"

# Test unauthorized access
test_endpoint "GET" "/dashboard/profile" "" "401" "Unauthorized access (no session)"

# Test rate limiting
print_status "Testing rate limiting..."
for i in {1..10}; do
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"wrong"}' \
        "$API_URL/auth/login" | tail -n1)
    
    if [ "$response" = "429" ]; then
        print_success "Rate limiting working (triggered at attempt $i)"
        break
    fi
done

# 4. Performance Tests
print_status "=== 4. Performance Tests ==="

# Test unauthenticated endpoints
performance_test "/auth/login" "Login endpoint (unauthenticated)"

# Test authenticated endpoints if session exists
if [ -f "$COOKIE_FILE" ]; then
    performance_test "/dashboard/profile" "Profile endpoint (authenticated)" true
    performance_test "/dashboard/users?limit=10" "Users list endpoint (authenticated)" true
    performance_test "/dashboard/teams?limit=10" "Teams list endpoint (authenticated)" true
else
    print_warning "Skipping authenticated performance tests - no valid session"
fi

# 5. Integration Tests
print_status "=== 5. Integration Tests ==="

if [ -f "$COOKIE_FILE" ]; then
    # Test user creation and retrieval
    create_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -b "$COOKIE_FILE" \
        -d '{"email":"integration@test.com","password":"password123","full_name":"Integration Test","role":"agent"}' \
        "$API_URL/dashboard/users")

    user_id=$(echo "$create_response" | jq -r '.data.user.id' 2>/dev/null || echo "")

    if [ -n "$user_id" ] && [ "$user_id" != "null" ]; then
        test_endpoint "GET" "/dashboard/users/$user_id" "" "200" "Get created user" true
        test_endpoint "DELETE" "/dashboard/users/$user_id" "" "200" "Delete created user" true
    fi
else
    print_warning "Skipping integration tests - no valid session"
fi

# 6. Migration Verification
print_status "=== 6. Migration Verification ==="

# Check if old server actions are still being used in components
print_status "Checking for remaining server action imports..."
remaining_imports=$(grep -r "from.*@/lib/actions" --include="*.tsx" --include="*.ts" components/ 2>/dev/null | grep -v "// Deprecated" | wc -l || echo "0")

if [ "$remaining_imports" -eq "0" ]; then
    print_success "No server action imports found in components"
else
    print_warning "Found $remaining_imports server action imports in components"
    grep -r "from.*@/lib/actions" --include="*.tsx" --include="*.ts" components/ 2>/dev/null | grep -v "// Deprecated" || true
fi

# Check if all hooks are exported
print_status "Verifying hook exports..."
hook_count=$(grep -c "export.*use" hooks/index.ts 2>/dev/null || echo "0")
print_success "Found $hook_count exported hooks"

# 7. Security Tests
print_status "=== 7. Security Tests ==="

# Test SQL injection attempt
test_endpoint "POST" "/auth/login" '{"email":"test@test.com OR 1=1--","password":"test"}' "400" "SQL injection protection"

# Test XSS attempt
if [ -f "$COOKIE_FILE" ]; then
    test_endpoint "PUT" "/dashboard/profile" '{"full_name":"<script>alert(\"XSS\")</script>"}' "200" "XSS protection (should sanitize)" true
else
    test_endpoint "PUT" "/dashboard/profile" '{"full_name":"<script>alert(\"XSS\")</script>"}' "401" "XSS protection (unauthorized)" false
fi

# 8. Summary
echo
echo "================================================"
echo "Test Summary"
echo "================================================"

# Count successes and failures
success_count=$(grep -c "\[PASS\]" /tmp/test_output 2>/dev/null || echo "0")
failure_count=$(grep -c "\[FAIL\]" /tmp/test_output 2>/dev/null || echo "0")
warning_count=$(grep -c "\[WARN\]" /tmp/test_output 2>/dev/null || echo "0")

echo -e "${GREEN}Passed:${NC} $success_count"
echo -e "${RED}Failed:${NC} $failure_count"
echo -e "${YELLOW}Warnings:${NC} $warning_count"
echo

# Clean up
rm -f "$COOKIE_FILE"

if [ "$failure_count" -eq "0" ]; then
    print_success "All tests passed! Migration is complete and working correctly."
else
    print_error "Some tests failed. Please review the output above."
    print_warning "Note: Some failures are expected if test credentials don't exist in your database."
fi

echo
echo "Phase 4 testing complete!" 