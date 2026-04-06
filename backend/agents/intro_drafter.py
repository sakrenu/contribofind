"""
Agent 4 — Intro Drafter
Writes a personalised GitHub issue comment for each matched issue,
tailored to the developer's background and the specific issue.
"""

import json
import os
from datetime import datetime, timezone
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from models.schemas import AgentState


def _status(agent: str, message: str) -> dict:
    return {"agent": agent, "message": message, "timestamp": datetime.now(timezone.utc).isoformat()}


async def intro_drafter_node(state: AgentState) -> AgentState:
    updates = list(state.get("status_updates", []))
    skill_profile = state.get("skill_profile") or {}
    matched_issues = list(state.get("matched_issues", []))
    briefings = state.get("briefings", {})
    draft_comments: dict = dict(state.get("draft_comments", {}))

    if not matched_issues:
        return state

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.environ.get("GROQ_API_KEY", ""),
        temperature=0.7,  # Slightly higher for more natural writing
    )

    level = skill_profile.get("level", "intermediate")
    languages = skill_profile.get("languages", [])
    top_repos = skill_profile.get("top_repos", [])
    frameworks = skill_profile.get("frameworks", [])

    enriched_issues = []

    for issue in matched_issues:
        repo_full_name = issue.get("repo_full_name", "")
        issue_title = issue.get("title", "")
        issue_id = str(issue.get("id", issue.get("url", "")))
        briefing = briefings.get(repo_full_name, issue.get("briefing", ""))

        updates.append(_status("intro_drafter", f"Drafting intro comment for {repo_full_name}..."))
        updates.append(_status("intro_drafter", f"Personalising tone for {level} level..."))

        prompt = f"""Write a natural, friendly GitHub issue comment for a developer who wants to contribute to this issue.

Developer profile:
- Skill level: {level}
- Main languages: {', '.join(languages[:4]) or 'not specified'}
- Notable projects: {', '.join(top_repos[:3]) if top_repos else 'various personal projects'}
- Frameworks known: {', '.join(frameworks[:3]) if frameworks else 'various'}

Issue: {issue_title}
Repository: {repo_full_name}
Repository briefing: {briefing or 'No briefing available'}

Rules:
- Sound like a real developer, not a bot
- Mention 1 specific thing from their background that's relevant to this issue
- Express genuine interest in the problem being solved
- Ask one clarifying question if appropriate (e.g. about approach, timeline, or if anyone is already working on it)
- Keep it under 100 words
- Start with "Hi" or "Hey" — not "Hello"
- Do NOT use phrases like "I am an AI", "As a developer", or overly formal language
- Do NOT mention your skill level explicitly
- Make it feel like a casual message between developers

Return ONLY the comment text, no JSON, no quotes, no explanation."""

        try:
            messages = [
                SystemMessage(content="You are a developer writing a genuine GitHub comment. Write naturally and concisely."),
                HumanMessage(content=prompt),
            ]
            response = await llm.ainvoke(messages)
            draft = response.content.strip().strip('"\'')
            draft_comments[issue_id] = draft

            enriched_issues.append({
                **issue,
                "briefing": briefing,
                "draft_comment": draft,
            })
        except Exception as e:
            updates.append(_status("intro_drafter", f"Error drafting comment for {repo_full_name}: {str(e)[:100]}"))
            enriched_issues.append({
                **issue,
                "briefing": briefing,
                "draft_comment": f"Hi, I'd love to work on this issue! I have experience with {', '.join(languages[:2])} and this looks like a great fit for my background. Would it be okay if I picked this up?",
            })

    updates.append(_status("intro_drafter", "All comments ready."))

    return {
        **state,
        "matched_issues": enriched_issues,
        "draft_comments": draft_comments,
        "status_updates": updates,
    }
