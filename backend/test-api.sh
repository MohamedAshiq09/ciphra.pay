#!/bin/bash

echo "🧪 CIPHRA.PAY BACKEND TEST SUITE"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_field=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
        echo "Response: $response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAIL++))
        echo "Response: $response"
    fi
    echo ""
}

echo "📡 Testing API Endpoints..."
echo ""

# Test 1: Health Check
test_endpoint "Health Check" "http://localhost:3000/bridge/health" "success"

# Test 2: Statistics
test_endpoint "Statistics" "http://localhost:3000/bridge/stats" "aztec"

# Test 3: Status
test_endpoint "Status" "http://localhost:3000/bridge/status" "connected"

# Test 4: Get All Swaps
test_endpoint "Get All Swaps" "http://localhost:3000/swap" "swaps"

# Test 5: Get Swap by ID (should fail gracefully)
echo -n "Testing Get Swap by ID (non-existent)... "
response=$(curl -s "http://localhost:3000/swap/999")
if echo "$response" | grep -q "not found"; then
    echo -e "${GREEN}✅ PASS${NC} (Expected failure)"
    ((PASS++))
else
    echo -e "${YELLOW}⚠️  UNEXPECTED${NC}"
fi
echo "Response: $response" | jq '.' 2>/dev/null || echo "$response"
echo ""

# Summary
echo "=================================="
echo "📊 TEST SUMMARY"
echo "=================================="
echo -e "Total Tests: $((PASS + FAIL))"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi
