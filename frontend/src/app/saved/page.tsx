"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

type SavedIssue = {
  id: string;
  github_issue_id: string;
  repo_full_name: string;
  issue_title: string;
  issue_url: string;
  match_score: number;
  draft_comment: string;
  status: "not_started" | "in_progress" | "pr_submitted";
  saved_at: string;
};

type SearchHistory = {
  id: string;
  run_at: string;
  match_count: number;
  preferences_snapshot: {
    languages: string[];
    difficulty: string;
    topics: string;
  };
};

function StatusBadge({ status }: { status: SavedIssue["status"] }) {
  const map = {
    not_started: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    in_progress: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    pr_submitted: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  };
  const labels = {
    not_started: "Not started",
    in_progress: "In progress",
    pr_submitted: "PR submitted",
  };
  return <span className={`badge ${map[status]}`}>{labels[status]}</span>;
}

function MatchBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : score >= 60
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  return <span className={`badge ${cls}`}>{score}%</span>;
}

export default function SavedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [issues, setIssues] = useState<SavedIssue[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/issues")
      .then((r) => r.json())
      .then((data) => {
        setIssues(data.issues || []);
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  const updateStatus = async (id: string, newStatus: SavedIssue["status"]) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    );
    await fetch("/api/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
  };

  const removeIssue = async (id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/issues?id=${id}`, { method: "DELETE" });
  };

  const reRunSearch = (h: SearchHistory) => {
    const prefs = h.preferences_snapshot || {};
    const params = new URLSearchParams({
      difficulty: prefs.difficulty || "any",
      languages: (prefs.languages || []).join(","),
      topics: prefs.topics || "",
    });
    router.push(`/results?${params.toString()}`);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen bg-surface dark:bg-zinc-950">
        <Sidebar active="saved" />
        <main className="flex-1 ml-0 md:ml-60 p-10 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface dark:bg-zinc-950">
      <Sidebar active="saved" />

      <main className="flex-1 ml-0 md:ml-60 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          {/* Saved Issues */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-5">
              Saved issues ({issues.length})
            </h2>

            {issues.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-4">📌</div>
                <p className="text-zinc-500 text-sm mb-4">
                  No saved issues yet. Find some issues to get started.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="btn-primary"
                >
                  Find issues
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {issues.map((issue) => (
                  <div key={issue.id} className="card">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 font-mono mb-1">
                          {issue.repo_full_name}
                        </p>
                        <h3 className="font-semibold text-zinc-900 dark:text-white text-sm leading-snug">
                          {issue.issue_title}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          Saved{" "}
                          {new Date(issue.saved_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <MatchBadge score={issue.match_score} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={issue.status} />
                        <select
                          value={issue.status}
                          onChange={(e) =>
                            updateStatus(issue.id, e.target.value as SavedIssue["status"])
                          }
                          className="input text-xs py-1"
                        >
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="pr_submitted">PR submitted</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={issue.issue_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View on GitHub ↗
                        </a>
                        <button
                          onClick={() => removeIssue(issue.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Search History */}
          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-5">
              Recent searches
            </h2>

            {history.length === 0 ? (
              <p className="text-zinc-500 text-sm">No search history yet.</p>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500 border-b border-border dark:border-zinc-800">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Issues found</th>
                      <th className="pb-3 font-medium">Languages</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-zinc-800">
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="py-3 text-zinc-700 dark:text-zinc-300">
                          {new Date(h.run_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 text-zinc-700 dark:text-zinc-300">
                          {h.match_count}
                        </td>
                        <td className="py-3 text-zinc-700 dark:text-zinc-300">
                          {(h.preferences_snapshot?.languages || []).slice(0, 3).join(", ") || "—"}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => reRunSearch(h)}
                            className="text-xs text-primary hover:underline"
                          >
                            Re-run
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
