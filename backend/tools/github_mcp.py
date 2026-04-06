"""
GitHub API client — direct calls to the GitHub REST API via httpx.
Replaces the original MCP-based approach for reliability.
The user's OAuth token is passed per-request.
"""

import base64
import httpx

GITHUB_API = "https://api.github.com"
TIMEOUT = 20.0


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


async def list_user_repos(token: str, username: str, per_page: int = 30) -> list:
    """List public repos for a user, sorted by most recently updated."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(
                f"{GITHUB_API}/users/{username}/repos",
                headers=_headers(token),
                params={"sort": "updated", "per_page": per_page, "type": "owner"},
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
    return []


async def get_repo_languages(token: str, owner: str, repo: str) -> dict:
    """Return a dict of language -> bytes for the given repo."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/languages",
                headers=_headers(token),
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
    return {}


async def search_issues(
    token: str,
    query: str,
    labels: list[str] | None = None,
    language: str | None = None,
    per_page: int = 20,
) -> list:
    """Search GitHub issues with optional label and language filters."""
    q = f"{query} is:issue is:open"
    if labels:
        for label in labels:
            q += f' label:"{label}"'
    if language:
        q += f" language:{language}"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(
                f"{GITHUB_API}/search/issues",
                headers=_headers(token),
                params={"q": q, "per_page": per_page, "sort": "updated"},
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                # Attach repo_full_name to each item for convenience
                for item in items:
                    repo_url = item.get("repository_url", "")
                    if repo_url and "repos/" in repo_url:
                        item["repo_full_name"] = "/".join(
                            repo_url.split("repos/")[-1].split("/")[:2]
                        )
                return items
        except Exception:
            pass
    return []


async def get_readme(token: str, owner: str, repo: str) -> str:
    """Fetch the README content for a repository (decoded from base64)."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/readme",
                headers=_headers(token),
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("content", "")
                encoding = data.get("encoding", "")
                if encoding == "base64":
                    return base64.b64decode(content).decode("utf-8", errors="replace")
                return content
        except Exception:
            pass
    return ""


async def get_file_contents(token: str, owner: str, repo: str, path: str) -> str:
    """Fetch raw file content at the given path. Returns empty string if not found."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                headers=_headers(token),
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict):
                    content = data.get("content", "")
                    encoding = data.get("encoding", "")
                    if encoding == "base64":
                        return base64.b64decode(content).decode("utf-8", errors="replace")
                    return content
        except Exception:
            pass
    return ""


async def list_repo_contents(token: str, owner: str, repo: str, path: str = "") -> list:
    """List directory contents for a repo path (root by default)."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                headers=_headers(token),
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    return data
        except Exception:
            pass
    return []


async def get_user_profile(token: str) -> dict:
    """Get the authenticated user's GitHub profile."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(
                f"{GITHUB_API}/user",
                headers=_headers(token),
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
    return {}
