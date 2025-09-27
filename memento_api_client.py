#!/usr/bin/env python3
"""
Memento Database API Client
==========================
External Python client for accessing Memento Database via Beta API

Features:
- Connect to Memento Database from external environment
- List libraries and entries
- Query data using API endpoints
- Test connectivity and authentication

Requirements:
- python-dotenv
- requests

Usage:
    python memento_api_client.py

Author: ASISTANTO
Version: 1.0
Date: September 2025
"""

import os
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

try:
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print("ERROR: Required packages not installed!")
    print("Install with: pip install requests python-dotenv")
    print(f"Missing: {e}")
    exit(1)


class MementoAPIClient:
    """
    Memento Database API Client for external access
    """

    def __init__(self, env_file: str = ".env"):
        """
        Initialize the API client

        Args:
            env_file: Path to .env configuration file
        """
        # Load environment variables
        env_path = Path(env_file)
        if not env_path.exists():
            raise FileNotFoundError(f"Environment file not found: {env_file}")

        load_dotenv(env_path)

        # API Configuration
        self.api_key = os.getenv("MEMENTO_API_KEY")
        self.base_url = os.getenv("MEMENTO_BASE_URL", "https://mementoserver-hrd.appspot.com/v1")
        self.timeout = int(os.getenv("MEMENTO_TIMEOUT", "30"))
        self.max_retries = int(os.getenv("MEMENTO_MAX_RETRIES", "3"))
        self.debug = os.getenv("MEMENTO_DEBUG", "false").lower() == "true"

        # Validate configuration
        if not self.api_key:
            raise ValueError("MEMENTO_API_KEY not found in environment file")

        # Setup logging
        log_level = logging.DEBUG if self.debug else logging.INFO
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

        # Load library IDs
        self.library_ids = self._load_library_ids()

        # Setup session
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "MementoAPIClient/1.0"
        })

        # Try alternative authentication methods if Bearer fails
        self.auth_methods = [
            {"Authorization": f"Bearer {self.api_key}"},
            {"Authorization": f"Token {self.api_key}"},
            {"X-API-Key": self.api_key},
            {"api_key": self.api_key},
            {"key": self.api_key}
        ]

        self.logger.info("Memento API Client initialized")
        self.logger.debug(f"Base URL: {self.base_url}")
        self.logger.debug(f"Timeout: {self.timeout}s")

    def _load_library_ids(self) -> Dict[str, str]:
        """Load library IDs from environment variables"""
        library_ids = {}

        # Extract all LIBRARY_ID_* variables
        for key, value in os.environ.items():
            if key.startswith("LIBRARY_ID_") and value:
                lib_name = key.replace("LIBRARY_ID_", "").lower()
                library_ids[lib_name] = value

        self.logger.debug(f"Loaded {len(library_ids)} library IDs")
        return library_ids

    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """
        Make HTTP request with retries and error handling

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without base URL)
            **kwargs: Additional arguments for requests

        Returns:
            Response object

        Raises:
            requests.RequestException: If request fails after retries
        """
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"

        # Try different authentication methods
        for auth_idx, auth_headers in enumerate(self.auth_methods):
            for attempt in range(self.max_retries):
                try:
                    self.logger.debug(f"Auth method {auth_idx + 1}/{len(self.auth_methods)}, "
                                    f"attempt {attempt + 1}/{self.max_retries}: {method} {url}")

                    # Prepare headers
                    headers = kwargs.get('headers', {})
                    headers.update(auth_headers)
                    kwargs['headers'] = headers

                    response = self.session.request(
                        method=method,
                        url=url,
                        timeout=self.timeout,
                        **kwargs
                    )

                    # Log response details
                    self.logger.debug(f"Response: {response.status_code} {response.reason}")
                    if self.debug:
                        self.logger.debug(f"Response headers: {dict(response.headers)}")
                        if response.text:
                            self.logger.debug(f"Response body: {response.text[:500]}...")

                    # If we get 401, try next auth method
                    if response.status_code == 401:
                        self.logger.debug(f"401 Unauthorized with auth method {auth_idx + 1}")
                        break  # Try next auth method

                    # Check for other HTTP errors
                    response.raise_for_status()
                    self.logger.info(f"Success with auth method {auth_idx + 1}: {list(auth_headers.keys())[0]}")
                    return response

                except requests.exceptions.RequestException as e:
                    self.logger.warning(f"Request attempt {attempt + 1} failed: {e}")

                    if attempt == self.max_retries - 1:
                        if auth_idx == len(self.auth_methods) - 1:
                            # This was the last auth method and last attempt
                            raise
                        else:
                            break  # Try next auth method

                    # Wait before retry (exponential backoff)
                    wait_time = 2 ** attempt
                    self.logger.debug(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)

        # If we get here, all auth methods failed
        raise requests.exceptions.RequestException("All authentication methods failed")

    def test_connection(self) -> Dict[str, Any]:
        """
        Test API connectivity and authentication

        Returns:
            Dictionary with test results
        """
        self.logger.info("Testing API connection...")

        test_result = {
            "timestamp": datetime.now().isoformat(),
            "api_key_configured": bool(self.api_key),
            "base_url": self.base_url,
            "connection_success": False,
            "authentication_success": False,
            "libraries_accessible": False,
            "error": None,
            "response_time": None
        }

        try:
            start_time = time.time()

            # Test basic connectivity
            response = self._make_request("GET", "/libraries")

            test_result["response_time"] = time.time() - start_time
            test_result["connection_success"] = True
            test_result["authentication_success"] = response.status_code == 200

            if response.status_code == 200:
                data = response.json()
                test_result["libraries_accessible"] = isinstance(data, (list, dict))
                test_result["libraries_count"] = len(data) if isinstance(data, list) else None

        except Exception as e:
            test_result["error"] = str(e)
            self.logger.error(f"Connection test failed: {e}")

        return test_result

    def list_libraries(self) -> List[Dict[str, Any]]:
        """
        Get list of all libraries

        Returns:
            List of library objects
        """
        self.logger.info("Fetching libraries list...")

        try:
            response = self._make_request("GET", "/libraries")
            libraries = response.json()

            self.logger.info(f"Found {len(libraries)} libraries")
            return libraries

        except Exception as e:
            self.logger.error(f"Failed to fetch libraries: {e}")
            raise

    def get_library_by_id(self, library_id: str) -> Dict[str, Any]:
        """
        Get library details by ID

        Args:
            library_id: Library ID

        Returns:
            Library object
        """
        self.logger.info(f"Fetching library: {library_id}")

        try:
            response = self._make_request("GET", f"/libraries/{library_id}")
            library = response.json()

            self.logger.debug(f"Library details: {library.get('name', 'Unknown')}")
            return library

        except Exception as e:
            self.logger.error(f"Failed to fetch library {library_id}: {e}")
            raise

    def get_library_entries(self, library_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get entries from a library

        Args:
            library_id: Library ID
            limit: Maximum number of entries to fetch

        Returns:
            List of entry objects
        """
        self.logger.info(f"Fetching entries from library {library_id} (limit: {limit})")

        try:
            params = {"limit": limit}
            response = self._make_request("GET", f"/libraries/{library_id}/entries", params=params)
            entries = response.json()

            entry_count = len(entries) if isinstance(entries, list) else 0
            self.logger.info(f"Found {entry_count} entries")
            return entries

        except Exception as e:
            self.logger.error(f"Failed to fetch entries from library {library_id}: {e}")
            raise

    def get_material_library_data(self) -> Optional[Dict[str, Any]]:
        """
        Get data from Material library (if configured)

        Returns:
            Material library data or None
        """
        material_id = self.library_ids.get("material")
        if not material_id:
            self.logger.warning("Material library ID not configured")
            return None

        try:
            library_info = self.get_library_by_id(material_id)
            entries = self.get_library_entries(material_id, limit=10)

            return {
                "library": library_info,
                "entries": entries,
                "entry_count": len(entries)
            }

        except Exception as e:
            self.logger.error(f"Failed to fetch material library data: {e}")
            return None

    def run_diagnostics(self) -> Dict[str, Any]:
        """
        Run comprehensive diagnostics

        Returns:
            Diagnostic results
        """
        self.logger.info("Running API diagnostics...")

        diagnostics = {
            "timestamp": datetime.now().isoformat(),
            "client_version": "1.0",
            "configuration": {
                "api_key_set": bool(self.api_key),
                "base_url": self.base_url,
                "timeout": self.timeout,
                "max_retries": self.max_retries,
                "library_ids_configured": len(self.library_ids)
            },
            "tests": {}
        }

        # Test connection
        diagnostics["tests"]["connection"] = self.test_connection()

        # Test libraries access
        try:
            libraries = self.list_libraries()
            diagnostics["tests"]["libraries"] = {
                "success": True,
                "count": len(libraries),
                "sample": libraries[:3] if libraries else []
            }
        except Exception as e:
            diagnostics["tests"]["libraries"] = {
                "success": False,
                "error": str(e)
            }

        # Test specific library access
        if self.library_ids.get("material"):
            try:
                material_data = self.get_material_library_data()
                diagnostics["tests"]["material_library"] = {
                    "success": bool(material_data),
                    "entries_found": material_data["entry_count"] if material_data else 0
                }
            except Exception as e:
                diagnostics["tests"]["material_library"] = {
                    "success": False,
                    "error": str(e)
                }

        return diagnostics


def main():
    """Main function for testing the API client"""
    print("🔗 Memento Database API Client")
    print("=" * 50)

    try:
        # Initialize client
        client = MementoAPIClient()
        print(f"✅ Client initialized successfully")
        print(f"📡 Base URL: {client.base_url}")
        print(f"🔑 API Key: {'*' * 20}...{client.api_key[-4:] if client.api_key else 'NOT SET'}")
        print(f"📚 Configured libraries: {len(client.library_ids)}")
        print()

        # Run diagnostics
        print("🔍 Running diagnostics...")
        diagnostics = client.run_diagnostics()

        # Display results
        print("\n📊 DIAGNOSTIC RESULTS:")
        print("=" * 50)

        # Connection test
        conn_test = diagnostics["tests"]["connection"]
        status = "✅" if conn_test["connection_success"] else "❌"
        print(f"{status} Connection: {conn_test['connection_success']}")

        auth_status = "✅" if conn_test["authentication_success"] else "❌"
        print(f"{auth_status} Authentication: {conn_test['authentication_success']}")

        if conn_test["response_time"]:
            print(f"⏱️  Response time: {conn_test['response_time']:.2f}s")

        if conn_test["error"]:
            print(f"❌ Error: {conn_test['error']}")

        # Libraries test
        lib_test = diagnostics["tests"]["libraries"]
        if lib_test["success"]:
            print(f"✅ Libraries accessible: {lib_test['count']} found")
        else:
            print(f"❌ Libraries access failed: {lib_test.get('error', 'Unknown error')}")

        # Material library test
        if "material_library" in diagnostics["tests"]:
            mat_test = diagnostics["tests"]["material_library"]
            if mat_test["success"]:
                print(f"✅ Material library: {mat_test['entries_found']} entries")
            else:
                print(f"❌ Material library failed: {mat_test.get('error', 'Unknown error')}")

        print(f"\n💾 Full diagnostics saved to: diagnostics.json")

        # Save full diagnostics
        with open("diagnostics.json", "w", encoding="utf-8") as f:
            json.dump(diagnostics, f, indent=2, ensure_ascii=False)

        print("\n🎉 API testing completed!")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        logging.error(f"Main function failed: {e}", exc_info=True)
        return 1

    return 0


if __name__ == "__main__":
    exit(main())