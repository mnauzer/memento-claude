#!/usr/bin/env python3
"""
Test various authentication methods based on common API patterns
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("MEMENTO_API_KEY")

print(f"🔍 Testing authentication variations based on Apiary documentation patterns...")
print(f"🔑 API Key: {'*' * 20}...{api_key[-4:]}")
print()

def test_auth_method(name, url, headers, params=None, data=None, method="GET"):
    """Test a specific authentication method"""
    print(f"🧪 Testing: {name}")
    print(f"   URL: {url}")
    print(f"   Method: {method}")
    print(f"   Headers: {headers}")
    if params:
        print(f"   Params: {params}")
    if data:
        print(f"   Data: {data}")

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            json=data if data else None,
            timeout=10
        )

        print(f"   📊 Status: {response.status_code} {response.reason}")

        if response.status_code == 200:
            print(f"   ✅ SUCCESS!")
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    data = response.json()
                    print(f"   📄 Response: {json.dumps(data, indent=2)[:300]}...")
                except:
                    print(f"   📄 Response: {response.text[:300]}...")
            return True
        elif response.status_code == 401:
            print(f"   ❌ Authentication failed")
            # Try to get error details
            try:
                if response.headers.get('content-type', '').startswith('application/json'):
                    error = response.json()
                    print(f"   💬 Error: {error.get('description', error)}")
            except:
                pass
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
            print(f"   📄 Response: {response.text[:200]}...")

    except Exception as e:
        print(f"   ❌ Request failed: {e}")

    print()
    return False

# Base configuration
base_url = "https://mementoserver-hrd.appspot.com/v1"
endpoints_to_test = ["/libraries", "/user", "/account", "/info", "/status"]

print("🔧 AUTHENTICATION METHOD TESTING")
print("=" * 60)

success_found = False

# Test 1: Query parameter authentication
for endpoint in endpoints_to_test:
    if test_auth_method(
        f"Query param: api_key - {endpoint}",
        f"{base_url}{endpoint}",
        {"Accept": "application/json", "User-Agent": "MementoTest/1.0"},
        params={"api_key": api_key}
    ):
        success_found = True
        break

# Test 2: Query parameter variations
for endpoint in endpoints_to_test[:2]:  # Test fewer endpoints
    for param_name in ["key", "token", "access_token", "auth_key"]:
        if test_auth_method(
            f"Query param: {param_name} - {endpoint}",
            f"{base_url}{endpoint}",
            {"Accept": "application/json", "User-Agent": "MementoTest/1.0"},
            params={param_name: api_key}
        ):
            success_found = True
            break
    if success_found:
        break

# Test 3: Header variations (already tested but with different combinations)
if not success_found:
    header_variations = [
        {"X-Auth-Token": api_key},
        {"X-Token": api_key},
        {"X-Access-Token": api_key},
        {"Authentication": api_key},
        {"Auth": api_key},
        {"Access-Token": api_key},
        {"Token": api_key}
    ]

    for endpoint in endpoints_to_test[:2]:
        for headers in header_variations:
            full_headers = {
                "Accept": "application/json",
                "User-Agent": "MementoTest/1.0",
                **headers
            }
            if test_auth_method(
                f"Header: {list(headers.keys())[0]} - {endpoint}",
                f"{base_url}{endpoint}",
                full_headers
            ):
                success_found = True
                break
        if success_found:
            break

# Test 4: POST with credentials in body
if not success_found:
    for endpoint in ["/auth", "/login", "/authenticate", "/token"]:
        auth_data_variations = [
            {"api_key": api_key},
            {"key": api_key},
            {"token": api_key},
            {"credentials": {"api_key": api_key}},
            {"auth": {"key": api_key}}
        ]

        for auth_data in auth_data_variations:
            if test_auth_method(
                f"POST body auth - {endpoint}",
                f"{base_url}{endpoint}",
                {"Accept": "application/json", "Content-Type": "application/json", "User-Agent": "MementoTest/1.0"},
                data=auth_data,
                method="POST"
            ):
                success_found = True
                break
        if success_found:
            break

# Test 5: Basic Authentication (base64 encoded)
if not success_found:
    import base64

    # Try different username:password combinations
    auth_combinations = [
        f"{api_key}:",
        f":{api_key}",
        f"api:{api_key}",
        f"user:{api_key}",
        f"key:{api_key}"
    ]

    for auth_combo in auth_combinations:
        encoded = base64.b64encode(auth_combo.encode()).decode()
        if test_auth_method(
            f"Basic Auth: {auth_combo.split(':')[0]}:[key]",
            f"{base_url}/libraries",
            {
                "Accept": "application/json",
                "Authorization": f"Basic {encoded}",
                "User-Agent": "MementoTest/1.0"
            }
        ):
            success_found = True
            break

print("=" * 60)
if success_found:
    print("🎉 SUCCESS: Found working authentication method!")
else:
    print("❌ No working authentication method found")
    print()
    print("📋 SUMMARY:")
    print("- All common authentication patterns tested")
    print("- API endpoints are reachable (server responds)")
    print("- API key format appears correct")
    print("- Beta API may require manual activation")
    print()
    print("🎯 NEXT STEPS:")
    print("1. Contact support@mementodatabase.com for beta access")
    print("2. Verify API key permissions in Memento Database app")
    print("3. Check if additional authentication flow is required")

print("\n🏁 Authentication testing completed!")