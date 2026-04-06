"""
Tavily web search tool — used by the Issue Finder agent to discover
trending open source projects beyond what GitHub search returns.
"""

import os
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()


def get_tavily_client() -> TavilyClient:
    api_key = os.environ.get("TAVILY_API_KEY", "")
    return TavilyClient(api_key=api_key)


async def search_oss_projects(
    domain: str,
    language: str,
    max_results: int = 5,
) -> list[dict]:
    """
    Search for trending OSS projects looking for contributors.
    Returns a list of result dicts with title, url, content snippet.
    """
    query = (
        f"open source {domain} projects looking for contributors "
        f"{language} 2024 2025 good first issue help wanted"
    )
    try:
        client = get_tavily_client()
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_answer=False,
        )
        results = response.get("results", [])
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "snippet": r.get("content", ""),
                "source": "tavily",
            }
            for r in results
        ]
    except Exception as e:
        return []


async def search_github_trending(language: str, max_results: int = 5) -> list[dict]:
    """Search for trending GitHub repos accepting contributions."""
    query = (
        f"site:github.com {language} repository open issues "
        f"good-first-issue 2025 contributors welcome"
    )
    try:
        client = get_tavily_client()
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_answer=False,
        )
        results = response.get("results", [])
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "snippet": r.get("content", ""),
                "source": "tavily",
            }
            for r in results
        ]
    except Exception as e:
        return []
