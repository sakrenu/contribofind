"""
Agent 3 — Codebase Reader
Reads the README, CONTRIBUTING.md, and folder structure of each matched
issue's repository and writes a practical briefing using Groq.
"""

import json
import os
from datetime import datetime, timezone
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from tools.github_mcp import get_readme, get_file_contents, list_repo_contents
from models.schemas import AgentState


def _status(agent: str, message: str) -> dict:
    return {"agent": agent, "message": message, "timestamp": datetime.now(timezone.utc).isoformat()}


def _parse_owner_repo(repo_full_name: str) -> tuple[str, str]:
    parts = repo_full_name.split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    return "", repo_full_name


async def _get_briefing(
    llm: ChatGroq,
    owner: str,
    repo: str,
    token: str,
    issue_title: str,
) -> tuple[str, str]:
    """Fetch repo context and generate a briefing. Returns (briefing, start_here)."""
    readme = await get_readme(token, owner, repo)
    contributing = await get_file_contents(token, owner, repo, "CONTRIBUTING.md")
    root_contents = await list_repo_contents(token, owner, repo, "")

    # Build a folder structure string
    folder_items = []
    if isinstance(root_contents, list):
        for item in root_contents[:20]:
            if isinstance(item, dict):
                folder_items.append(f"- {item.get('name', '')} ({item.get('type', '')})")

    folder_structure = "\n".join(folder_items) if folder_items else "Could not retrieve folder structure"

    readme_excerpt = readme[:2000] if readme else "No README found"
    contributing_excerpt = contributing[:1000] if contributing else "No CONTRIBUTING.md found"

    prompt = f"""Given this repository's README, contributing guide, and folder structure,
write a 2-3 sentence briefing for a developer who wants to contribute.

Repository: {owner}/{repo}
Issue: {issue_title}

README (excerpt):
{readme_excerpt}

CONTRIBUTING.md (excerpt):
{contributing_excerpt}

Folder structure:
{folder_structure}

Instructions:
1. Write exactly 2-3 sentences.
2. Include: what the project does, what kind of code changes are typical, and which file or folder they should look at first for this specific issue.
3. Be specific and practical — name actual files or folders from the structure above.
4. Return a JSON object with two fields:
   - "briefing": the 2-3 sentence briefing text
   - "start_here": the specific filename or folder path to look at first (e.g. "src/components/Button.tsx" or "lib/")

Return ONLY valid JSON, no markdown."""

    messages = [
        SystemMessage(content="You are a senior engineer giving concise onboarding advice to a new contributor. Return only valid JSON."),
        HumanMessage(content=prompt),
    ]

    response = await llm.ainvoke(messages)
    raw = response.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        result = json.loads(raw)
        return result.get("briefing", ""), result.get("start_here", "")
    except Exception:
        return raw[:500], ""


async def codebase_reader_node(state: AgentState) -> AgentState:
    updates = list(state.get("status_updates", []))
    token = state["github_token"]
    matched_issues = list(state.get("matched_issues", []))
    briefings = dict(state.get("briefings", {}))

    if not matched_issues:
        return state

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.environ.get("GROQ_API_KEY", ""),
        temperature=0.3,
    )

    enriched_issues = []
    for issue in matched_issues[:5]:
        repo_full_name = issue.get("repo_full_name", "")
        owner, repo = _parse_owner_repo(repo_full_name)

        if not owner or not repo:
            enriched_issues.append(issue)
            continue

        updates.append(_status("codebase_reader", f"Reading repository: {repo_full_name}..."))
        updates.append(_status("codebase_reader", "Understanding project structure..."))

        try:
            briefing, start_here = await _get_briefing(
                llm=llm,
                owner=owner,
                repo=repo,
                token=token,
                issue_title=issue.get("title", ""),
            )
            briefings[repo_full_name] = briefing

            if start_here:
                updates.append(_status("codebase_reader", f"Identified entry point: {start_here}"))

            enriched_issues.append({
                **issue,
                "briefing": briefing,
                "start_here": start_here,
            })
        except Exception as e:
            updates.append(_status("codebase_reader", f"Could not read {repo_full_name}: {str(e)[:100]}"))
            enriched_issues.append(issue)

    return {
        **state,
        "matched_issues": enriched_issues,
        "briefings": briefings,
        "status_updates": updates,
    }
