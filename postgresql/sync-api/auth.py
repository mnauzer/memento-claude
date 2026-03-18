"""
Authentication Module - API Key authentication for sync endpoints

Protects sync API endpoints by requiring a valid API key in the request headers.
"""

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from config import Config
import logging

logger = logging.getLogger(__name__)

# API Key header configuration
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Verify API key from request header

    Args:
        api_key: API key from X-API-Key header

    Returns:
        The validated API key

    Raises:
        HTTPException: If API key is missing or invalid
    """
    if not api_key:
        logger.warning("API request without API key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Please provide X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if api_key != Config.SYNC_API_KEY:
        logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return api_key


async def verify_memento_request(api_key: str = Security(api_key_header)) -> bool:
    """
    Verify request is from Memento (same as verify_api_key but returns bool)

    This is a convenience function for routes that want to handle
    authentication differently.

    Args:
        api_key: API key from X-API-Key header

    Returns:
        True if valid, False otherwise
    """
    try:
        await verify_api_key(api_key)
        return True
    except HTTPException:
        return False


class APIKeyAuth:
    """
    Dependency class for API key authentication

    Usage in FastAPI:
        @app.get("/protected", dependencies=[Depends(APIKeyAuth())])
        async def protected_route():
            return {"message": "This route is protected"}
    """

    def __init__(self):
        self.api_key_header = api_key_header

    async def __call__(self, api_key: str = Security(api_key_header)) -> str:
        """Verify API key"""
        return await verify_api_key(api_key)


# Singleton instance
api_key_auth = APIKeyAuth()


if __name__ == "__main__":
    # Test authentication
    print("=== API Key Authentication Test ===")
    print(f"Expected API Key: {Config.SYNC_API_KEY[:8]}...")
    print(f"Header Name: {API_KEY_NAME}")
    print("\nTo authenticate requests, include header:")
    print(f"  {API_KEY_NAME}: {Config.SYNC_API_KEY}")
