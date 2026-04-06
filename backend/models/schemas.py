from typing import TypedDict


class AgentState(TypedDict):
    github_token: str
    username: str
    preferences: dict           # { languages, difficulty, topics }
    skill_profile: dict | None  # { languages, frameworks, level, domains, top_repos }
    raw_issues: list
    matched_issues: list
    briefings: dict             # repo_full_name -> briefing string
    draft_comments: dict        # issue_id -> draft comment string
    retry_count: int
    status_updates: list        # list of { agent, message, timestamp }
    error: str | None


def issue_to_dict(issue: dict) -> dict:
    return {
        "id": issue.get("id", ""),
        "title": issue.get("title", ""),
        "url": issue.get("url", ""),
        "repo_full_name": issue.get("repo_full_name", ""),
        "labels": issue.get("labels", []),
        "match_score": issue.get("match_score", 0),
        "match_reasoning": issue.get("match_reasoning", ""),
        "briefing": issue.get("briefing", ""),
        "start_here": issue.get("start_here", ""),
        "draft_comment": issue.get("draft_comment", ""),
        "created_at": issue.get("created_at", ""),
        "stars": issue.get("stars", 0),
    }
