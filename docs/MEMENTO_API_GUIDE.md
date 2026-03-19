# Memento Database Cloud API - Complete Guide

**API Version:** v1 (Beta)
**Base URL:** `https://api.mementodatabase.com/v1/`
**Authentication Token:** Stored in `.env` file (see below)
**Last Updated:** 2026-03-19

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Limits](#api-limits)
3. [Endpoints Reference](#endpoints-reference)
4. [Field Types](#field-types)
5. [Python Examples](#python-examples)
6. [Best Practices](#best-practices)
7. [Error Handling](#error-handling)

---

## Authentication

### Token-Based Authentication

All API requests require authentication via query parameter:

```
?token={your_memento_api_token}
```

**CRITICAL SECURITY:**
- ✅ Token is **permanent** and user-specific
- ❌ **NEVER** expose token in code, MD files, or public forums
- ❌ **NEVER** commit token to git repositories
- ✅ **ALWAYS** store token in `.env` file
- ⚠️ Exposing token can lead to data theft/loss/corruption

**Setup Instructions:**

1. **Create `.env` file in project root:**
```bash
# File: X:\claude\projects\memento-claude\.env
MEMENTO_API_KEY=your_actual_token_here
```

2. **Add `.env` to `.gitignore`:**
```bash
# Already included in .gitignore
*.env
.env*
```

3. **Load in Python:**
```python
import os
from dotenv import load_dotenv

load_dotenv()
API_TOKEN = os.getenv('MEMENTO_API_KEY')

if not API_TOKEN:
    raise ValueError("MEMENTO_API_KEY not found in .env file!")
```

4. **Load in JavaScript/Node.js:**
```javascript
require('dotenv').config();
const API_TOKEN = process.env.MEMENTO_API_KEY;

if (!API_TOKEN) {
    throw new Error('MEMENTO_API_KEY not found in .env file!');
}
```

---

## API Limits

**CRITICAL:** Memento Cloud API has strict rate limits:

- **10 requests per minute** (600ms minimum between requests)
- Exceeding limit = requests rejected
- No automatic retry or queuing

**Mitigation Strategies:**
1. Implement exponential backoff
2. Batch operations where possible
3. Cache library structure
4. Use pagination efficiently
5. Monitor request count

**Python Rate Limiter:**
```python
import time
from datetime import datetime, timedelta

class MementoRateLimiter:
    def __init__(self, max_requests=10, time_window=60):
        self.max_requests = max_requests
        self.time_window = time_window  # seconds
        self.requests = []

    def wait_if_needed(self):
        now = datetime.now()
        # Remove requests older than time window
        self.requests = [req for req in self.requests
                        if (now - req).total_seconds() < self.time_window]

        if len(self.requests) >= self.max_requests:
            oldest = min(self.requests)
            wait_time = self.time_window - (now - oldest).total_seconds()
            if wait_time > 0:
                print(f"⏳ Rate limit: waiting {wait_time:.1f}s")
                time.sleep(wait_time + 0.1)  # +0.1s safety margin

        self.requests.append(now)
```

---

## Endpoints Reference

### 1. List Libraries

**GET** `/libraries?token={token}`

**Response:**
```json
{
    "libraries": [
        {
            "id": "ht5dj7hqtey87",
            "name": "Library1",
            "owner": "author",
            "createdTime": "2015-08-05T08:40:51.620Z",
            "modifiedTime": "2016-08-05T08:40:51.620Z"
        }
    ]
}
```

**Python Example:**
```python
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_BASE = "https://api.mementodatabase.com/v1"
API_TOKEN = os.getenv('MEMENTO_API_KEY')

if not API_TOKEN:
    raise ValueError("MEMENTO_API_KEY not set in .env file!")

def list_libraries():
    url = f"{API_BASE}/libraries"
    params = {"token": API_TOKEN}
    response = requests.get(url, params=params)
    return response.json()
```

---

### 2. Get Library Structure

**GET** `/libraries/{libraryId}?token={token}`

**Response:**
```json
{
    "id": "ht5dj7hqtey87",
    "name": "Library1",
    "owner": "author",
    "createdTime": "2015-08-05T08:40:51.620Z",
    "modifiedTime": "2016-08-05T08:40:51.620Z",
    "revision": 10,
    "size": 1200,
    "fields": [
        {
            "id": 1,
            "type": "text",
            "name": "Title",
            "role": "name",
            "order": 0
        },
        {
            "id": 2,
            "type": "int",
            "name": "Count",
            "role": "desc",
            "order": 1
        }
    ]
}
```

**Field Roles:**
- `"name"` - Title/name field (displayed as entry title)
- `"desc"` - Description field (displayed under title)
- Other roles TBD

**Python Example:**
```python
def get_library_structure(library_id):
    url = f"{API_BASE}/libraries/{library_id}"
    params = {"token": API_TOKEN}
    response = requests.get(url, params=params)
    return response.json()
```

---

### 3. List Entries

**GET** `/libraries/{libraryId}/entries?token={token}&pageSize={size}&pageToken={token}&fields={fieldIds}&startRevision={rev}`

**Parameters:**
- `token` (required) - Auth token
- `pageSize` (optional) - Max entries per page (default: 50)
- `pageToken` (optional) - Pagination token from previous response
- `fields` (optional) - Comma-separated field IDs (e.g., "1,2,3") or "*all"
- `startRevision` (optional) - Only return entries updated/created at/after this revision

**Response:**
```json
{
    "entries": [
        {
            "id": "frejf944jfnjsdf4",
            "author": "author",
            "createdTime": "2015-08-05T08:40:51.620Z",
            "modifiedTime": "2016-08-05T08:40:51.620Z",
            "revision": 10,
            "status": "active",
            "size": 20,
            "fields": [
                {"id": 1, "value": "Record 1"},
                {"id": 2, "value": 1000}
            ]
        }
    ],
    "nextPageToken": "next_page_token",
    "revision": 10
}
```

**Entry Status:**
- `"active"` - Normal entry
- `"deleted"` - Deleted entry (still in database, marked as deleted)

**Python Example with Pagination:**
```python
def list_all_entries(library_id, fields="*all"):
    """Get all entries with automatic pagination"""
    url = f"{API_BASE}/libraries/{library_id}/entries"
    params = {
        "token": API_TOKEN,
        "fields": fields,
        "pageSize": 50
    }

    all_entries = []
    page_token = None

    while True:
        if page_token:
            params["pageToken"] = page_token

        response = requests.get(url, params=params)
        data = response.json()

        all_entries.extend(data.get("entries", []))

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return all_entries
```

---

### 4. Get Single Entry

**GET** `/libraries/{libraryId}/entries/{entryId}?token={token}`

**Response:**
```json
{
    "id": "feoijr485498ere",
    "createdTime": "2015-08-05T08:40:51.620Z",
    "modifiedTime": "2016-08-05T08:40:51.620Z",
    "status": "active",
    "author": "author",
    "revision": 100,
    "size": 20,
    "fields": [
        {"id": 1, "value": "Record 1"},
        {"id": 2, "value": 1000}
    ]
}
```

**Python Example:**
```python
def get_entry(library_id, entry_id):
    url = f"{API_BASE}/libraries/{library_id}/entries/{entry_id}"
    params = {"token": API_TOKEN}
    response = requests.get(url, params=params)
    return response.json()
```

---

### 5. Create Entry

**POST** `/libraries/{libraryId}/entries?token={token}`

**Request Body:**
```json
{
    "fields": [
        {"id": 1, "value": "Record 1"},
        {"id": 2, "value": 1000}
    ]
}
```

**Response:** Returns created entry (same structure as GET entry)

**Python Example:**
```python
def create_entry(library_id, field_values):
    """
    Create new entry

    Args:
        library_id: Library ID
        field_values: Dict mapping field IDs to values
                     e.g., {1: "Title", 2: 100}
    """
    url = f"{API_BASE}/libraries/{library_id}/entries"
    params = {"token": API_TOKEN}

    fields = [{"id": fid, "value": val} for fid, val in field_values.items()]
    payload = {"fields": fields}

    response = requests.post(url, params=params, json=payload)
    return response.json()
```

---

### 6. Update Entry

**PATCH** `/libraries/{libraryId}/entries/{entryId}?token={token}`

**Request Body:**
```json
{
    "fields": [
        {"id": 1, "value": "Record 2"},
        {"id": 2, "value": 2000}
    ]
}
```

**Response:** Returns updated entry

**Python Example:**
```python
def update_entry(library_id, entry_id, field_values):
    """
    Update existing entry

    Args:
        library_id: Library ID
        entry_id: Entry ID
        field_values: Dict mapping field IDs to NEW values
    """
    url = f"{API_BASE}/libraries/{library_id}/entries/{entry_id}"
    params = {"token": API_TOKEN}

    fields = [{"id": fid, "value": val} for fid, val in field_values.items()]
    payload = {"fields": fields}

    response = requests.patch(url, params=params, json=payload)
    return response.json()
```

---

### 7. Delete Entry

**DELETE** `/libraries/{libraryId}/entries/{entryId}?token={token}`

**Response:** 204 No Content (success)

**Python Example:**
```python
def delete_entry(library_id, entry_id):
    url = f"{API_BASE}/libraries/{library_id}/entries/{entry_id}"
    params = {"token": API_TOKEN}
    response = requests.delete(url, params=params)
    return response.status_code == 204
```

---

### 8. Search Entries

**GET** `/libraries/{libraryId}/search?token={token}&q={query}&pageToken={token}&fields={fieldIds}`

**Parameters:**
- `q` (required) - URL-encoded search query
- `pageToken` (optional) - Pagination token
- `fields` (optional) - Comma-separated field IDs or "*all"

**Response:**
```json
{
    "entries": [ /* same as list entries */ ],
    "nextPageToken": "next_page_token",
    "total": 1
}
```

**Python Example:**
```python
import urllib.parse

def search_entries(library_id, query, fields="*all"):
    """
    Search entries

    Args:
        library_id: Library ID
        query: Search query string
        fields: Field IDs to return
    """
    url = f"{API_BASE}/libraries/{library_id}/search"
    params = {
        "token": API_TOKEN,
        "q": urllib.parse.quote(query),
        "fields": fields
    }

    response = requests.get(url, params=params)
    return response.json()
```

---

### 9. Upload Files

**POST** `/libraries/{libraryId}/entries/{entryId}/files/{fieldId}?token={token}`

**Content-Type:** `multipart/form-data`

**Request Body:**
```
-----BOUNDARY
Content-Disposition: form-data; name="image[file]"; filename="image.jpg"
Content-Type: image/jpeg

[JPEG_DATA]
-----BOUNDARY
```

**Response:**
```json
[
    {
        "file": "image.jpg",
        "url": "http://api.mementodatabase.com/...",
        "original_url": "http://api.mementodatabase.com/...",
        "size": 12312
    }
]
```

**Python Example:**
```python
def upload_file(library_id, entry_id, field_id, file_path):
    url = f"{API_BASE}/libraries/{library_id}/entries/{entry_id}/files/{field_id}"
    params = {"token": API_TOKEN}

    with open(file_path, 'rb') as f:
        files = {'image[file]': f}
        response = requests.post(url, params=params, files=files)

    return response.json()
```

---

## Field Types

Based on API documentation and previous project knowledge:

| Type | Memento Name | Python Type | Example Value |
|------|--------------|-------------|---------------|
| text | text | str | "Hello" |
| int | integer | int | 42 |
| double | double | float | 3.14 |
| currency | currency | float | 99.99 |
| date | date | str (ISO) | "2026-03-19" |
| time | time | str (ISO) | "14:30:00" |
| datetime | datetime | str (ISO) | "2026-03-19T14:30:00Z" |
| checkbox | checkbox | bool | true/false |
| singleChoice | singleChoice | str | "Option1" |
| multiChoice | multiChoice | list[str] | ["Opt1", "Opt2"] |
| linkToEntry | linkToEntry | str/list[str] | "entry_id" or ["id1", "id2"] |
| geolocation | geolocation | object | {"lat": 48.1, "lon": 17.1} |
| richtext | richtext | str | HTML content |
| image | image | str (URL) | File upload result |
| file | file | str (URL) | File upload result |

---

## Python Complete Example

```python
import requests
import time
from datetime import datetime

class MementoAPI:
    def __init__(self, api_token):
        self.base_url = "https://api.mementodatabase.com/v1"
        self.token = api_token
        self.request_times = []
        self.max_requests = 10
        self.time_window = 60

    def _rate_limit(self):
        """Enforce 10 requests per minute limit"""
        now = datetime.now()
        self.request_times = [t for t in self.request_times
                             if (now - t).total_seconds() < self.time_window]

        if len(self.request_times) >= self.max_requests:
            oldest = min(self.request_times)
            wait = self.time_window - (now - oldest).total_seconds()
            if wait > 0:
                time.sleep(wait + 0.1)

        self.request_times.append(now)

    def _request(self, method, endpoint, **kwargs):
        """Make API request with rate limiting"""
        self._rate_limit()

        url = f"{self.base_url}/{endpoint}"
        params = kwargs.get('params', {})
        params['token'] = self.token
        kwargs['params'] = params

        response = requests.request(method, url, **kwargs)
        response.raise_for_status()
        return response

    def list_libraries(self):
        return self._request('GET', 'libraries').json()

    def get_library(self, library_id):
        return self._request('GET', f'libraries/{library_id}').json()

    def list_entries(self, library_id, fields='*all', page_size=50):
        """List all entries with automatic pagination"""
        entries = []
        page_token = None

        while True:
            params = {'fields': fields, 'pageSize': page_size}
            if page_token:
                params['pageToken'] = page_token

            response = self._request(
                'GET',
                f'libraries/{library_id}/entries',
                params=params
            ).json()

            entries.extend(response.get('entries', []))
            page_token = response.get('nextPageToken')

            if not page_token:
                break

        return entries

    def get_entry(self, library_id, entry_id):
        return self._request(
            'GET',
            f'libraries/{library_id}/entries/{entry_id}'
        ).json()

    def create_entry(self, library_id, field_values):
        """
        Create entry

        Args:
            field_values: dict {field_id: value}
        """
        payload = {
            'fields': [{'id': fid, 'value': val}
                      for fid, val in field_values.items()]
        }
        return self._request(
            'POST',
            f'libraries/{library_id}/entries',
            json=payload
        ).json()

    def update_entry(self, library_id, entry_id, field_values):
        payload = {
            'fields': [{'id': fid, 'value': val}
                      for fid, val in field_values.items()]
        }
        return self._request(
            'PATCH',
            f'libraries/{library_id}/entries/{entry_id}',
            json=payload
        ).json()

    def delete_entry(self, library_id, entry_id):
        response = self._request(
            'DELETE',
            f'libraries/{library_id}/entries/{entry_id}'
        )
        return response.status_code == 204

    def search(self, library_id, query, fields='*all'):
        import urllib.parse
        params = {'q': urllib.parse.quote(query), 'fields': fields}
        return self._request(
            'GET',
            f'libraries/{library_id}/search',
            params=params
        ).json()


# Usage
import os
from dotenv import load_dotenv

load_dotenv()
api = MementoAPI(os.getenv('MEMENTO_API_KEY'))

# List libraries
libraries = api.list_libraries()

# Get structure
structure = api.get_library("library_id_here")

# List entries
entries = api.list_entries("library_id_here")

# Create entry
new_entry = api.create_entry("library_id", {1: "Title", 2: 100})

# Update entry
updated = api.update_entry("library_id", "entry_id", {1: "New Title"})

# Search
results = api.search("library_id", "search query")
```

---

## Best Practices

### 1. Cache Library Structure

**DON'T:**
```python
# Fetching structure on every entry operation (wastes API calls)
for entry in entries:
    structure = api.get_library(lib_id)  # ❌ 10 API calls!
    process_entry(entry, structure)
```

**DO:**
```python
# Fetch once, reuse
structure = api.get_library(lib_id)  # ✅ 1 API call
field_map = {f['id']: f['name'] for f in structure['fields']}

for entry in entries:
    process_entry(entry, field_map)
```

### 2. Use Field Filtering

**DON'T:**
```python
# Fetching all fields when only need few
entries = api.list_entries(lib_id, fields="*all")  # ❌ Large payload
```

**DO:**
```python
# Fetch only needed fields
entries = api.list_entries(lib_id, fields="1,2,5")  # ✅ Smaller payload
```

### 3. Batch Operations

**DON'T:**
```python
# Creating entries one-by-one
for data in dataset:
    api.create_entry(lib_id, data)  # ❌ N API calls
    time.sleep(6)  # ❌ Slow
```

**DO:**
```python
# Batch with rate limiting handled by class
for data in dataset:
    api.create_entry(lib_id, data)  # ✅ Rate limiter handles delays
```

### 4. Error Handling

```python
import requests

try:
    entry = api.get_entry(lib_id, entry_id)
except requests.HTTPError as e:
    if e.response.status_code == 404:
        print("Entry not found")
    elif e.response.status_code == 429:
        print("Rate limit exceeded")
    else:
        print(f"API error: {e}")
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success (GET) | Continue |
| 201 | Created (POST) | Entry created successfully |
| 204 | No Content (DELETE) | Entry deleted successfully |
| 400 | Bad Request | Check request format/fields |
| 401 | Unauthorized | Check API token |
| 404 | Not Found | Library/entry doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded, wait |
| 500 | Server Error | Retry after delay |

### Common Errors

**Rate Limit Exceeded:**
```python
# Implement exponential backoff
import time

def retry_with_backoff(func, max_retries=3):
    for i in range(max_retries):
        try:
            return func()
        except requests.HTTPError as e:
            if e.response.status_code == 429:
                wait = (2 ** i) * 60  # 1min, 2min, 4min
                print(f"Rate limited, waiting {wait}s")
                time.sleep(wait)
            else:
                raise
```

**Field ID Not Found:**
```python
def safe_get_field(entry, field_id, default=None):
    """Safely get field value with fallback"""
    for field in entry.get('fields', []):
        if field['id'] == field_id:
            return field['value']
    return default
```

---

## Security Checklist

- [ ] API token stored in environment variable (NOT in code)
- [ ] Token NOT committed to git
- [ ] Token NOT exposed in logs
- [ ] HTTPS used for all requests
- [ ] Rate limiting implemented
- [ ] Error handling implemented
- [ ] Sensitive data encrypted at rest

---

**API Status:** Beta
**Rate Limit:** 10 requests/minute
**Support:** support@mementodatabase.com
