#!/usr/bin/env python3
"""
Test different API endpoints and authentication methods for Memento Database
"""

import os
import requests
from dotenv import load_dotenv

# Load environment
load_dotenv()
api_key = os.getenv("MEMENTO_API_KEY")

print(f"🔑 Testing with API key: {'*' * 20}...{api_key[-4:]}")
print()

# Test different base URLs and endpoints
base_urls = [
    "https://mementoserver-hrd.appspot.com/v1",
    "https://mementoserver-hrd.appspot.com",
    "https://api.mementodatabase.com/v1",
    "https://api.mementodatabase.com",
    "https://mementodatabase.appspot.com/v1",
    "https://mementodatabase.appspot.com"
]

endpoints = [
    "/libraries",
    "/api/libraries",
    "/v1/libraries",
    "/database/libraries"
]

auth_methods = [
    {"Authorization": f"Bearer {api_key}"},
    {"Authorization": f"Token {api_key}"},
    {"X-API-Key": api_key},
    {"api_key": api_key},
    {"key": api_key}
]

def test_endpoint(base_url, endpoint, auth_headers):
    """Test a single endpoint with given authentication"""
    url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"

    try:
        response = requests.get(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "MementoAPITest/1.0",
                **auth_headers
            },
            timeout=10
        )

        return {
            "status_code": response.status_code,
            "success": response.status_code < 400,
            "content_type": response.headers.get("content-type", ""),
            "body_preview": response.text[:200] if response.text else ""
        }

    except Exception as e:
        return {
            "status_code": None,
            "success": False,
            "error": str(e)
        }

print("🔍 Testing API endpoints...")
print("=" * 80)

successful_combinations = []

for base_url in base_urls:
    print(f"\n📡 Testing base URL: {base_url}")

    for endpoint in endpoints:
        print(f"  📂 Endpoint: {endpoint}")

        for i, auth_headers in enumerate(auth_methods):
            auth_name = list(auth_headers.keys())[0]
            result = test_endpoint(base_url, endpoint, auth_headers)

            status_icon = "✅" if result["success"] else "❌"
            status_code = result.get("status_code", "ERROR")

            print(f"    {status_icon} {auth_name}: {status_code}")

            if result["success"]:
                successful_combinations.append({
                    "base_url": base_url,
                    "endpoint": endpoint,
                    "auth": auth_headers,
                    "auth_name": auth_name,
                    "result": result
                })
                print(f"       Content-Type: {result['content_type']}")
                print(f"       Preview: {result['body_preview']}")
            elif result.get("error"):
                print(f"       Error: {result['error']}")

print("\n" + "=" * 80)
print("📊 SUMMARY")
print("=" * 80)

if successful_combinations:
    print(f"✅ Found {len(successful_combinations)} working combination(s):")

    for i, combo in enumerate(successful_combinations, 1):
        print(f"\n{i}. {combo['base_url']}{combo['endpoint']}")
        print(f"   Auth: {combo['auth_name']}")
        print(f"   Status: {combo['result']['status_code']}")
        print(f"   Content: {combo['result']['content_type']}")

        # Save first successful combination to .env
        if i == 1:
            print(f"\n💾 Updating .env with working configuration...")

            # Read current .env
            with open('.env', 'r') as f:
                lines = f.readlines()

            # Update base URL
            for j, line in enumerate(lines):
                if line.startswith('MEMENTO_BASE_URL='):
                    lines[j] = f"MEMENTO_BASE_URL={combo['base_url']}{combo['endpoint']}\n"
                    break

            # Write back
            with open('.env', 'w') as f:
                f.writelines(lines)

            print(f"✅ Updated MEMENTO_BASE_URL to: {combo['base_url']}{combo['endpoint']}")
            print(f"✅ Working auth method: {combo['auth_name']}")
else:
    print("❌ No working combinations found")
    print("\nPossible issues:")
    print("- API key is invalid or expired")
    print("- API is not yet available in beta")
    print("- Different authentication method required")
    print("- API endpoint URLs have changed")

print(f"\n🏁 Testing completed!")