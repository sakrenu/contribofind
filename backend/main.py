import asyncio
import json
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import httpx

from agents.pipeline import get_pipeline
from models.schemas import AgentState, issue_to_dict
from db.supabase_client import (
    get_last_run_at,
    update_last_run,
    save_search_history,
    upsert_user,
)

app = FastAPI(title="ContriboFind API", version="1.0.0")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


async def _get_github_username(token: str) -> str:
    """Fetch the GitHub username for the given token."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("login", "")


async def _get_github_profile(token: str) -> dict:
    """Fetch full GitHub profile for the given token."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()


@app.get("/api/find-issues")
async def find_issues(
    authorization: str = Header(...),
    difficulty: str = "any",
    languages: str = "",
    topics: str = "",
):
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    # Get username
    try:
        username = await _get_github_username(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    # Rate limiting: check last run
    try:
        last_run = get_last_run_at(username)
        if last_run:
            elapsed = (datetime.now(timezone.utc) - last_run).total_seconds()
            if elapsed < 300:  # 5 minutes
                wait_seconds = int(300 - elapsed)
                raise HTTPException(
                    status_code=429,
                    detail=f"Please wait {wait_seconds} seconds before running again",
                )
        # Update last run immediately to prevent concurrent runs
        update_last_run(username)
    except HTTPException:
        raise
    except Exception:
        pass  # Don't block if Supabase is unavailable

    # Build preferences
    pref_languages = [l.strip() for l in languages.split(",") if l.strip()] if languages else []
    pref_topics = topics.strip()
    preferences = {
        "languages": pref_languages,
        "difficulty": difficulty,
        "topics": pref_topics,
    }

    initial_state: AgentState = {
        "github_token": token,
        "username": username,
        "preferences": preferences,
        "skill_profile": None,
        "raw_issues": [],
        "matched_issues": [],
        "briefings": {},
        "draft_comments": {},
        "retry_count": 0,
        "status_updates": [],
        "error": None,
    }

    async def event_generator():
        pipeline = get_pipeline()
        streamed_update_count = 0

        try:
            # Run the pipeline with streaming
            async for chunk in pipeline.astream(initial_state):
                # chunk is a dict: { node_name: state_dict }
                for node_name, node_state in chunk.items():
                    updates = node_state.get("status_updates", [])
                    # Stream any new status updates
                    new_updates = updates[streamed_update_count:]
                    for update in new_updates:
                        streamed_update_count += 1
                        yield {
                            "data": json.dumps({
                                "type": "status",
                                "agent": update.get("agent", node_name),
                                "message": update.get("message", ""),
                                "timestamp": update.get("timestamp", ""),
                            })
                        }
                        await asyncio.sleep(0.05)

                    # Check for errors
                    if node_state.get("error") and node_state["error"] not in (None, ""):
                        yield {
                            "data": json.dumps({
                                "type": "error",
                                "message": node_state["error"],
                            })
                        }

            # Get final state from pipeline (run once more to get final result)
            final_state = await pipeline.ainvoke(initial_state)
            matched = final_state.get("matched_issues", [])
            serialised = [issue_to_dict(i) for i in matched]

            # Save search history
            try:
                save_search_history(username, len(serialised), preferences)
            except Exception:
                pass

            yield {
                "data": json.dumps({
                    "type": "result",
                    "issues": serialised,
                    "username": username,
                })
            }
            yield {"data": json.dumps({"type": "done"})}

        except Exception as e:
            yield {
                "data": json.dumps({
                    "type": "error",
                    "message": f"Pipeline failed: {str(e)}",
                })
            }
            yield {"data": json.dumps({"type": "done"})}

    return EventSourceResponse(event_generator())


@app.get("/api/find-issues/stream")
async def find_issues_stream(
    authorization: str = Header(...),
    difficulty: str = "any",
    languages: str = "",
    topics: str = "",
):
    """Alternative streaming endpoint that runs the pipeline and streams all events."""
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        username = await _get_github_username(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    # Rate limiting
    try:
        last_run = get_last_run_at(username)
        if last_run:
            elapsed = (datetime.now(timezone.utc) - last_run).total_seconds()
            if elapsed < 300:
                wait_seconds = int(300 - elapsed)
                raise HTTPException(
                    status_code=429,
                    detail=f"Please wait {wait_seconds} seconds before running again",
                )
        update_last_run(username)
    except HTTPException:
        raise
    except Exception:
        pass

    pref_languages = [l.strip() for l in languages.split(",") if l.strip()] if languages else []
    preferences = {
        "languages": pref_languages,
        "difficulty": difficulty,
        "topics": topics.strip(),
    }

    initial_state: AgentState = {
        "github_token": token,
        "username": username,
        "preferences": preferences,
        "skill_profile": None,
        "raw_issues": [],
        "matched_issues": [],
        "briefings": {},
        "draft_comments": {},
        "retry_count": 0,
        "status_updates": [],
        "error": None,
    }

    async def event_generator():
        pipeline = get_pipeline()
        last_update_idx = 0
        final_state = None

        try:
            async for chunk in pipeline.astream(initial_state):
                for node_name, node_state in chunk.items():
                    final_state = node_state
                    updates = node_state.get("status_updates", [])
                    new_updates = updates[last_update_idx:]
                    for update in new_updates:
                        last_update_idx += 1
                        yield {
                            "data": json.dumps({
                                "type": "status",
                                "agent": update.get("agent", node_name),
                                "message": update.get("message", ""),
                                "timestamp": update.get("timestamp", ""),
                            })
                        }
                        await asyncio.sleep(0.05)

                    error = node_state.get("error")
                    if error:
                        yield {
                            "data": json.dumps({"type": "error", "message": error})
                        }

            if final_state:
                matched = final_state.get("matched_issues", [])
                serialised = [issue_to_dict(i) for i in matched]

                try:
                    save_search_history(username, len(serialised), preferences)
                except Exception:
                    pass

                yield {
                    "data": json.dumps({
                        "type": "result",
                        "issues": serialised,
                        "username": username,
                    })
                }

            yield {"data": json.dumps({"type": "done"})}

        except Exception as e:
            yield {
                "data": json.dumps({
                    "type": "error",
                    "message": f"Pipeline failed: {str(e)}",
                })
            }
            yield {"data": json.dumps({"type": "done"})}

    return EventSourceResponse(event_generator())


@app.get("/api/user/profile")
async def get_profile(authorization: str = Header(...)):
    """Fetch GitHub user profile using the bearer token."""
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        profile = await _get_github_profile(token)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="GitHub API error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Get languages from top repos
    async with httpx.AsyncClient() as client:
        try:
            repos_resp = await client.get(
                f"https://api.github.com/users/{profile['login']}/repos",
                params={"sort": "updated", "per_page": 10, "type": "owner"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github.v3+json",
                },
                timeout=10,
            )
            repos = repos_resp.json() if repos_resp.status_code == 200 else []
        except Exception:
            repos = []

    lang_count: dict[str, int] = {}
    for repo in repos:
        lang = repo.get("language")
        if lang:
            lang_count[lang] = lang_count.get(lang, 0) + 1

    top_langs = sorted(lang_count.keys(), key=lambda l: lang_count[l], reverse=True)[:3]

    # Calculate account age
    created_at = profile.get("created_at", "")
    account_age_years = 0
    if created_at:
        try:
            created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            account_age_years = (datetime.now(timezone.utc) - created).days // 365
        except Exception:
            pass

    # Upsert user in Supabase
    try:
        upsert_user(
            github_id=str(profile.get("id", "")),
            username=profile.get("login", ""),
            avatar_url=profile.get("avatar_url", ""),
        )
    except Exception:
        pass

    return {
        "login": profile.get("login", ""),
        "name": profile.get("name", profile.get("login", "")),
        "avatar_url": profile.get("avatar_url", ""),
        "public_repos": profile.get("public_repos", 0),
        "followers": profile.get("followers", 0),
        "following": profile.get("following", 0),
        "bio": profile.get("bio", ""),
        "top_languages": top_langs,
        "account_age_years": account_age_years,
        "github_url": profile.get("html_url", f"https://github.com/{profile.get('login', '')}"),
    }
