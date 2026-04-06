"""
GitHub MCP client — wraps the official GitHub MCP server via the MCP Python SDK.
Each function creates a short-lived MCP session, calls the appropriate tool,
and returns parsed results. The user's OAuth token is passed per-request.
"""

import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def _get_server_params(token: str) -> StdioServerParameters:
    return StdioServerParameters(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-github"],
        env={"GITHUB_PERSONAL_ACCESS_TOKEN": token},
    )


async def _call_tool(token: str, tool_name: str, arguments: dict):
    server_params = _get_server_params(token)
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(tool_name, arguments)
            if result.content and len(result.content) > 0:
                raw = result.content[0].text
                try:
                    return json.loads(raw)
                except (json.JSONDecodeError, AttributeError):
                    return raw
            return None


async def list_user_repos(token: str, username: str, per_page: int = 30) -> list:
    """List public repos for a user, sorted by most recently updated."""
    result = await _call_tool(
        token,
        "list_repositories",
        {
            "owner": username,
            "type": "owner",
            "sort": "updated",
            "per_page": per_page,
        },
    )
    if isinstance(result, list):
        return result
    if isinstance(result, dict) and "repositories" in result:
        return result["repositories"]
    return []


async def get_repo_languages(token: str, owner: str, repo: str) -> dict:
    """Return a dict of language -> bytes for the given repo."""
    result = await _call_tool(
        token,
        "get_file_contents",
        {"owner": owner, "repo": repo, "path": ""},
    )
    # Fallback: use search_repositories to get language info
    search_result = await _call_tool(
        token,
        "search_repositories",
        {"query": f"repo:{owner}/{repo}"},
    )
    if isinstance(search_result, dict) and "items" in search_result:
        items = search_result["items"]
        if items:
            lang = items[0].get("language")
            if lang:
                return {lang: 1}
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

    result = await _call_tool(
        token,
        "search_issues",
        {"query": q, "per_page": per_page},
    )
    if isinstance(result, list):
        return result
    if isinstance(result, dict) and "items" in result:
        return result["items"]
    return []


async def get_readme(token: str, owner: str, repo: str) -> str:
    """Fetch the README content for a repository."""
    for path in ["README.md", "readme.md", "README.rst", "README"]:
        try:
            result = await _call_tool(
                token,
                "get_file_contents",
                {"owner": owner, "repo": repo, "path": path},
            )
            if isinstance(result, dict) and result.get("content"):
                import base64
                content = result["content"]
                if result.get("encoding") == "base64":
                    return base64.b64decode(content).decode("utf-8", errors="replace")
                return content
            if isinstance(result, str) and result:
                return result
        except Exception:
            continue
    return ""


async def get_file_contents(token: str, owner: str, repo: str, path: str) -> str:
    """Fetch raw file content. Returns empty string if not found."""
    try:
        result = await _call_tool(
            token,
            "get_file_contents",
            {"owner": owner, "repo": repo, "path": path},
        )
        if isinstance(result, dict) and result.get("content"):
            import base64
            content = result["content"]
            if result.get("encoding") == "base64":
                return base64.b64decode(content).decode("utf-8", errors="replace")
            return content
        if isinstance(result, str):
            return result
    except Exception:
        pass
    return ""


async def list_repo_contents(token: str, owner: str, repo: str, path: str = "") -> list:
    """List directory contents for a repo path (root by default)."""
    try:
        result = await _call_tool(
            token,
            "get_file_contents",
            {"owner": owner, "repo": repo, "path": path},
        )
        if isinstance(result, list):
            return result
    except Exception:
        pass
    return []


async def get_user_profile(token: str) -> dict:
    """Get the authenticated user's GitHub profile."""
    result = await _call_tool(token, "get_me", {})
    if isinstance(result, dict):
        return result
    return {}
