import os
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


def get_user_by_github_id(github_id: str) -> dict | None:
    client = get_client()
    result = client.table("users").select("*").eq("github_id", github_id).execute()
    if result.data:
        return result.data[0]
    return None


def upsert_user(github_id: str, username: str, avatar_url: str) -> dict:
    client = get_client()
    result = (
        client.table("users")
        .upsert(
            {
                "github_id": github_id,
                "username": username,
                "avatar_url": avatar_url,
            },
            on_conflict="github_id",
        )
        .execute()
    )
    return result.data[0] if result.data else {}


def update_last_run(github_id: str) -> None:
    client = get_client()
    user = get_user_by_github_id(github_id)
    if user:
        client.table("users").update(
            {"last_run_at": datetime.now(timezone.utc).isoformat()}
        ).eq("github_id", github_id).execute()


def get_last_run_at(github_id: str) -> datetime | None:
    user = get_user_by_github_id(github_id)
    if user and user.get("last_run_at"):
        return datetime.fromisoformat(user["last_run_at"])
    return None


def save_search_history(github_id: str, match_count: int, preferences: dict) -> None:
    client = get_client()
    user = get_user_by_github_id(github_id)
    if not user:
        return
    client.table("search_history").insert(
        {
            "user_id": user["id"],
            "match_count": match_count,
            "preferences_snapshot": preferences,
        }
    ).execute()


def save_issue(
    github_id: str,
    github_issue_id: str,
    repo_full_name: str,
    issue_title: str,
    issue_url: str,
    match_score: int,
    draft_comment: str,
) -> dict:
    client = get_client()
    user = get_user_by_github_id(github_id)
    if not user:
        raise ValueError(f"User with github_id {github_id} not found")
    result = client.table("saved_issues").insert(
        {
            "user_id": user["id"],
            "github_issue_id": github_issue_id,
            "repo_full_name": repo_full_name,
            "issue_title": issue_title,
            "issue_url": issue_url,
            "match_score": match_score,
            "draft_comment": draft_comment,
            "status": "not_started",
        }
    ).execute()
    return result.data[0] if result.data else {}


def get_saved_issues(github_id: str) -> list:
    client = get_client()
    user = get_user_by_github_id(github_id)
    if not user:
        return []
    result = (
        client.table("saved_issues")
        .select("*")
        .eq("user_id", user["id"])
        .order("saved_at", desc=True)
        .execute()
    )
    return result.data or []


def update_issue_status(issue_id: str, status: str) -> dict:
    client = get_client()
    result = (
        client.table("saved_issues")
        .update({"status": status})
        .eq("id", issue_id)
        .execute()
    )
    return result.data[0] if result.data else {}


def delete_saved_issue(issue_id: str) -> None:
    client = get_client()
    client.table("saved_issues").delete().eq("id", issue_id).execute()


def get_search_history(github_id: str) -> list:
    client = get_client()
    user = get_user_by_github_id(github_id)
    if not user:
        return []
    result = (
        client.table("search_history")
        .select("*")
        .eq("user_id", user["id"])
        .order("run_at", desc=True)
        .limit(10)
        .execute()
    )
    return result.data or []
