"""
Agent 1 — Skill Analyser
Reads the user's public GitHub repositories and uses Groq to build a skill profile.
"""

import json
import os
from datetime import datetime, timezone
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from tools.github_mcp import list_user_repos, get_repo_languages
from models.schemas import AgentState


def _status(agent: str, message: str) -> dict:
    return {"agent": agent, "message": message, "timestamp": datetime.now(timezone.utc).isoformat()}


async def skill_analyser_node(state: AgentState) -> AgentState:
    updates = list(state.get("status_updates", []))
    token = state["github_token"]
    username = state["username"]

    try:
        updates.append(_status("skill_analyser", "Reading your public repositories..."))

        repos = await list_user_repos(token, username, per_page=30)
        if not repos:
            repos = []

        updates.append(_status("skill_analyser", f"Analysing {len(repos)} repositories..."))

        # Get languages for top 10 repos
        top_repos = repos[:10]
        language_counts: dict[str, int] = {}
        repo_summaries = []

        for repo in top_repos:
            repo_name = repo.get("name", "")
            repo_owner = repo.get("owner", {}).get("login", username) if isinstance(repo.get("owner"), dict) else username
            description = repo.get("description", "") or ""
            primary_lang = repo.get("language", "") or ""

            if primary_lang:
                language_counts[primary_lang] = language_counts.get(primary_lang, 0) + 1

            try:
                langs = await get_repo_languages(token, repo_owner, repo_name)
                for lang, count in langs.items():
                    language_counts[lang] = language_counts.get(lang, 0) + count
            except Exception:
                pass

            repo_summaries.append({
                "name": repo_name,
                "description": description[:200],
                "language": primary_lang,
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
            })

        detected_languages = sorted(language_counts.keys(), key=lambda l: language_counts[l], reverse=True)
        updates.append(_status("skill_analyser", f"Detected languages: {', '.join(detected_languages[:5]) or 'none'}"))

        # Call Groq to build skill profile
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=os.environ.get("GROQ_API_KEY", ""),
            temperature=0.3,
        )

        repo_text = json.dumps(repo_summaries, indent=2)
        prompt = f"""Given the following GitHub repositories and their languages, analyse this developer's skill profile.

Repositories:
{repo_text}

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{{
  "languages": ["list of programming languages ordered by proficiency"],
  "frameworks": ["list of frameworks/libraries detected"],
  "level": "one of: beginner, intermediate, advanced",
  "domains": ["list of domains e.g. web development, data engineering, devops"],
  "top_repos": ["top 3 repo names most representative of their work"]
}}

Base level on: number of repos ({len(repos)} total), variety of languages ({len(language_counts)} detected),
presence of complex projects, contribution patterns.
- beginner: 0-5 repos, 1-2 languages, simple projects
- intermediate: 5-20 repos, 3-5 languages, some frameworks
- advanced: 20+ repos, 5+ languages, complex architectures"""

        messages = [
            SystemMessage(content="You are a senior software engineer analysing a developer's GitHub profile. Return only valid JSON."),
            HumanMessage(content=prompt),
        ]

        response = await llm.ainvoke(messages)
        raw = response.content.strip()

        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        skill_profile = json.loads(raw)

        # Merge preferences languages if provided
        prefs_languages = state.get("preferences", {}).get("languages", [])
        if prefs_languages:
            for lang in prefs_languages:
                if lang not in skill_profile.get("languages", []):
                    skill_profile["languages"].insert(0, lang)

        level = skill_profile.get("level", "intermediate")
        updates.append(_status("skill_analyser", f"Skill level assessed: {level}"))

        return {
            **state,
            "skill_profile": skill_profile,
            "status_updates": updates,
        }

    except Exception as e:
        error_msg = f"Skill analyser error: {str(e)}"
        updates.append(_status("skill_analyser", f"Error: {error_msg}"))
        # Provide a fallback profile so the pipeline can continue
        fallback_profile = {
            "languages": state.get("preferences", {}).get("languages", ["Python", "JavaScript"]),
            "frameworks": [],
            "level": "intermediate",
            "domains": ["web development"],
            "top_repos": [],
        }
        return {
            **state,
            "skill_profile": fallback_profile,
            "status_updates": updates,
            "error": error_msg,
        }
