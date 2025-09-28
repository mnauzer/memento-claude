#!/usr/bin/env python3
"""
Debug API responses to understand the authentication issue
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("MEMENTO_API_KEY")

print(f"🔍 Debugging API responses...")
print(f"🔑 API Key: {'*' * 20}...{api_key[-4:]}")
print()

def debug_request(url, headers, method="GET"):
    """Debug a single request to see detailed response"""
    print(f"📡 Testing: {method} {url}")
    print(f"📋 Headers: {headers}")

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            timeout=10
        )

        print(f"📊 Status: {response.status_code} {response.reason}")
        print(f"📄 Response Headers:")
        for key, value in response.headers.items():
            print(f"   {key}: {value}")

        print(f"📝 Response Body:")
        if response.text:
            print(f"   {response.text[:1000]}...")
        else:
            print("   (empty)")

        return response

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

    print("-" * 60)

# Test the main endpoint with different auth methods
base_url = "https://mementoserver-hrd.appspot.com/v1/libraries"

auth_methods = [
    {"Authorization": f"Bearer {api_key}"},
    {"Authorization": f"Token {api_key}"},
    {"X-API-Key": api_key},
    {"api_key": api_key},
    {"key": api_key}
]

print("🧪 DETAILED API DEBUGGING")
print("=" * 60)

for i, auth_headers in enumerate(auth_methods, 1):
    print(f"\n🔧 Test {i}/{len(auth_methods)}")

    headers = {
        "Accept": "application/json",
        "User-Agent": "MementoDebugClient/1.0",
        **auth_headers
    }

    response = debug_request(base_url, headers)

    if response and response.status_code == 401:
        print("🔍 401 Analysis:")
        if 'www-authenticate' in response.headers:
            print(f"   WWW-Authenticate: {response.headers['www-authenticate']}")

        # Try to parse error details
        try:
            if response.headers.get('content-type', '').startswith('application/json'):
                import json
                error_data = json.loads(response.text)
                print(f"   Error details: {error_data}")
        except:
            pass

print("\n" + "=" * 60)
print("🎯 RECOMMENDATIONS:")
print("=" * 60)

print("""
Based on the 401 responses, possible solutions:

1. 📧 Contact Memento Database Support:
   - Email: support@mementodatabase.com
   - Request beta API access activation
   - Verify your API key is properly configured

2. 🔍 Check API Documentation:
   - Visit: https://mementodatabase.docs.apiary.io/
   - Look for authentication examples
   - Check if API key format is correct

3. 🧪 Alternative Testing:
   - Try API key in Memento Database app settings
   - Test with Postman or curl
   - Check if API is account-specific

4. 📋 Verify API Key Status:
   - Ensure beta API is enabled for your account
   - Check if API key has proper permissions
   - Verify key hasn't expired
""")

print("🏁 Debug completed!")