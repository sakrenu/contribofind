"""
Agent 2 — Issue Finder
Searches GitHub and Tavily for open issues matching the user's skill profile,
then uses Groq to rank and score them.
"""

import json
import os
from datetime import datetime, timezone
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from tools.github_mcp import search_issues
from tools.tavily_search import search_oss_projects
from models.schemas import AgentState


def _status(agent: str, message: str) -> dict:
    return {"agent": agent, "message": message, "timestamp": datetime.now(timezone.utc).isoformat()}


def _get_label_strategy(level: str, retry_count: int) -> list[str]:
    if retry_count > 0:
        return []  # Relax filters on retry
    if level == "beginner":
        return ["good-first-issue"]
    elif level == "intermediate":
        return ["help-wanted"]
    else:
        return ["help-wanted"]


async def issue_finder_node(state: AgentState) -> AgentState:
    updates = list(state.get("status_updates", []))
    token = state["github_token"]
    skill_profile = state.get("skill_profile") or {}
    preferences = state.get("preferences", {})
    retry_count = state.get("retry_count", 0)

    level = skill_profile.get("level", "intermediate")
    languages = skill_profile.get("languages", [])
    domains = skill_profile.get("domains", ["software development"])

    # Override with user preferences
    pref_langs = preferences.get("languages", [])
    if pref_langs:
        languages = pref_langs + [l for l in languages if l not in pref_langs]

    difficulty = preferences.get("difficulty", "any")
    topics = preferences.get("topics", "")

    if retry_count > 0:
        updates.append(_status("issue_finder", "No exact matches found, retrying with broader search..."))

    labels = _get_label_strategy(level, retry_count)
    primary_language = languages[0] if languages else ""

    updates.append(_status("issue_finder", f"Searching GitHub for {level} level issues..."))

    all_issues = []

    # GitHub search per language
    for lang in (languages[:3] if not retry_count else languages[:5]):
        try:
            query_parts = ["is:issue", "is:open"]
            if topics:
                query_parts.append(topics)
            query = " ".join(query_parts)

            issues = await search_issues(
                token=token,
                query=query,
                labels=labels if not retry_count else [],
                language=lang,
                per_page=10,
            )
            for issue in issues:
                issue["_search_language"] = lang
            all_issues.extend(issues)
            updates.append(_status("issue_finder", f"Found {len(issues)} candidates in {lang} repositories..."))
        except Exception as e:
            updates.append(_status("issue_finder", f"GitHub search error for {lang}: {str(e)[:100]}"))

    # Tavily search for trending projects
    if len(all_issues) < 5:
        try:
            updates.append(_status("issue_finder", "Searching web for trending OSS projects..."))
            domain = domains[0] if domains else "software development"
            tavily_results = await search_oss_projects(
                domain=domain,
                language=primary_language,
                max_results=5,
            )
            # Convert Tavily results to issue-like dicts
            for r in tavily_results:
                all_issues.append({
                    "id": r["url"],
                    "title": r["title"],
                    "html_url": r["url"],
                    "body": r["snippet"],
                    "labels": [],
                    "repository_url": r["url"],
                    "_source": "tavily",
                    "_search_language": primary_language,
                })
        except Exception as e:
            updates.append(_status("issue_finder", f"Web search error: {str(e)[:100]}"))

    if not all_issues:
        new_retry = retry_count + 1
        return {
            **state,
            "raw_issues": [],
            "matched_issues": [],
            "retry_count": new_retry,
            "status_updates": updates,
        }

    updates.append(_status("issue_finder", f"Ranking {len(all_issues)} issues by skill match..."))

    # Use Groq to rank and score
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.environ.get("GROQ_API_KEY", ""),
        temperature=0.3,
    )

    # Prepare issues for LLM (trim to avoid token overflow)
    issues_for_llm = []
    for i, issue in enumerate(all_issues[:30]):
        label_names = []
        for lbl in issue.get("labels", []):
            if isinstance(lbl, dict):
                label_names.append(lbl.get("name", ""))
            elif isinstance(lbl, str):
                label_names.append(lbl)

        repo_url = issue.get("repository_url", issue.get("html_url", ""))
        repo_name = ""
        if "repos/" in repo_url:
            repo_name = "/".join(repo_url.split("repos/")[-1].split("/")[:2])
        elif "github.com/" in repo_url:
            parts = repo_url.replace("https://github.com/", "").split("/")
            repo_name = "/".join(parts[:2]) if len(parts) >= 2 else repo_url

        issues_for_llm.append({
            "index": i,
            "id": str(issue.get("id", issue.get("number", i))),
            "title": issue.get("title", "")[:200],
            "body": (issue.get("body", "") or "")[:300],
            "labels": label_names,
            "repo": repo_name,
            "url": issue.get("html_url", issue.get("url", "")),
            "created_at": issue.get("created_at", ""),
            "language": issue.get("_search_language", ""),
        })

    skill_text = json.dumps({
        "languages": skill_profile.get("languages", []),
        "frameworks": skill_profile.get("frameworks", []),
        "level": level,
        "domains": domains,
    }, indent=2)

    issues_text = json.dumps(issues_for_llm, indent=2)

    prompt = f"""You are ranking GitHub issues for a developer.

Developer skill profile:
{skill_text}

Available issues:
{issues_text}

Select the TOP 5 best matches. For each, return a JSON object.
Return ONLY a valid JSON array (no markdown):
[
  {{
    "index": 0,
    "id": "issue id",
    "title": "issue title",
    "url": "issue url",
    "repo_full_name": "owner/repo",
    "labels": ["label1"],
    "match_score": 85,
    "match_reasoning": "1-2 sentence explanation of why this matches",
    "created_at": "date string",
    "stars": 0
  }}
]

Scoring criteria (0-100):
- Language match with developer's stack: +30 points
- Appropriate difficulty for skill level ({level}): +25 points
- Clear, well-scoped issue description: +20 points
- Active repository (recent activity): +15 points
- Relevant domain match: +10 points

Only include issues where match_score >= 40."""

    messages = [
        SystemMessage(content="You are a technical recruiter matching developers to open source issues. Return only valid JSON."),
        HumanMessage(content=prompt),
    ]

    try:
        response = await llm.ainvoke(messages)
        raw = response.content.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        matched = json.loads(raw)
        if not isinstance(matched, list):
            matched = []

        # Enrich matched issues with original data
        enriched = []
        for m in matched[:5]:
            orig_idx = m.get("index", -1)
            orig = issues_for_llm[orig_idx] if 0 <= orig_idx < len(issues_for_llm) else {}
            enriched.append({
                "id": m.get("id", orig.get("id", "")),
                "title": m.get("title", orig.get("title", "")),
                "url": m.get("url", orig.get("url", "")),
                "repo_full_name": m.get("repo_full_name", orig.get("repo", "")),
                "labels": m.get("labels", orig.get("labels", [])),
                "match_score": m.get("match_score", 50),
                "match_reasoning": m.get("match_reasoning", ""),
                "created_at": m.get("created_at", orig.get("created_at", "")),
                "stars": m.get("stars", 0),
                "briefing": "",
                "start_here": "",
                "draft_comment": "",
            })

        new_retry = retry_count + 1 if not enriched else retry_count

        return {
            **state,
            "raw_issues": all_issues,
            "matched_issues": enriched,
            "retry_count": new_retry,
            "status_updates": updates,
        }

    except Exception as e:
        error_msg = f"Issue ranking error: {str(e)}"
        updates.append(_status("issue_finder", f"Error ranking issues: {str(e)[:200]}"))
        new_retry = retry_count + 1
        return {
            **state,
            "raw_issues": all_issues,
            "matched_issues": [],
            "retry_count": new_retry,
            "status_updates": updates,
            "error": error_msg,
        }
