import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// POST /api/issues — save an issue to Supabase
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    githubIssueId,
    repoFullName,
    issueTitle,
    issueUrl,
    matchScore,
    draftComment,
  } = body;

  if (!githubIssueId || !repoFullName || !issueTitle || !issueUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get user from Supabase by GitHub username
  const username = session.user.name || session.user.email || "";
  const { data: users, error: userErr } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .limit(1);

  if (userErr || !users?.length) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = users[0].id;

  const { data, error } = await supabase.from("saved_issues").insert({
    user_id: userId,
    github_issue_id: String(githubIssueId),
    repo_full_name: repoFullName,
    issue_title: issueTitle,
    issue_url: issueUrl,
    match_score: matchScore || 0,
    draft_comment: draftComment || "",
    status: "not_started",
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, issue: data });
}

// GET /api/issues — get saved issues for the current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = session.user.name || session.user.email || "";
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .limit(1);

  if (!users?.length) {
    return NextResponse.json({ issues: [], history: [] });
  }

  const userId = users[0].id;

  const { data: issues } = await supabase
    .from("saved_issues")
    .select("*")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  const { data: history } = await supabase
    .from("search_history")
    .select("*")
    .eq("user_id", userId)
    .order("run_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ issues: issues || [], history: history || [] });
}

// PATCH /api/issues — update issue status
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const validStatuses = ["not_started", "in_progress", "pr_submitted"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_issues")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, issue: data });
}

// DELETE /api/issues — remove a saved issue
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase.from("saved_issues").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
