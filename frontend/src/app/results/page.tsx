"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import AgentProgress from "@/components/AgentProgress";
import IssueCard from "@/components/IssueCard";

type Issue = {
  id: string;
  title: string;
  url: string;
  repo_full_name: string;
  labels: string[];
  match_score: number;
  match_reasoning: string;
  briefing: string;
  start_here: string;
  draft_comment: string;
  created_at: string;
  stars: number;
};

type AgentStatus = {
  name: string;
  label: string;
  state: "waiting" | "active" | "done";
  message: string;
  startTime?: number;
};

const AGENTS: AgentStatus[] = [
  { name: "skill_analyser", label: "Skill Analyser", state: "waiting", message: "Waiting..." },
  { name: "issue_finder", label: "Issue Finder", state: "waiting", message: "Waiting..." },
  { name: "codebase_reader", label: "Codebase Reader", state: "waiting", message: "Waiting..." },
  { name: "intro_drafter", label: "Intro Drafter", state: "waiting", message: "Waiting..." },
];

function ResultsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<"loading" | "results" | "error">("loading");
  const [agents, setAgents] = useState<AgentStatus[]>(AGENTS.map((a) => ({ ...a })));
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [sortBy, setSortBy] = useState("match");

  const abortRef = useRef<AbortController | null>(null);
  const activeAgentRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;

    const difficulty = searchParams.get("difficulty") || "any";
    const languages = searchParams.get("languages") || "";
    const topics = searchParams.get("topics") || "";

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const url = `${backendUrl}/api/find-issues/stream?difficulty=${encodeURIComponent(difficulty)}&languages=${encodeURIComponent(languages)}&topics=${encodeURIComponent(topics)}`;

    abortRef.current = new AbortController();

    const runStream = async () => {
      try {
        const resp = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "text/event-stream",
          },
          signal: abortRef.current!.signal,
        });

        if (!resp.ok) {
          const text = await resp.text();
          setError(text || `Request failed: ${resp.status}`);
          setPhase("error");
          return;
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw);

              if (event.type === "status") {
                const agentName = event.agent as string;

                setAgents((prev) => {
                  const next = prev.map((a) => {
                    if (a.name === agentName) {
                      const wasWaiting = a.state === "waiting";
                      return {
                        ...a,
                        state: "active" as const,
                        message: event.message,
                        startTime: wasWaiting ? Date.now() : a.startTime,
                      };
                    }
                    // Mark previous active as done when new agent becomes active
                    if (
                      activeAgentRef.current &&
                      a.name === activeAgentRef.current &&
                      agentName !== activeAgentRef.current
                    ) {
                      return { ...a, state: "done" as const };
                    }
                    return a;
                  });
                  activeAgentRef.current = agentName;
                  return next;
                });
              } else if (event.type === "result") {
                setIssues(event.issues || []);
              } else if (event.type === "done") {
                // Mark all active agents as done
                setAgents((prev) =>
                  prev.map((a) =>
                    a.state === "active" ? { ...a, state: "done" as const } : a
                  )
                );
                setPhase("results");
              } else if (event.type === "error") {
                setError(event.message || "Something went wrong");
                setPhase("error");
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Connection failed");
        setPhase("error");
      }
    };

    runStream();

    return () => {
      abortRef.current?.abort();
    };
  }, [status, session, searchParams, router]);

  const handleCancel = () => {
    abortRef.current?.abort();
    router.push("/dashboard");
  };

  // Filter and sort issues
  const allLabels = Array.from(new Set(issues.flatMap((i) => i.labels)));

  const filtered = issues
    .filter((i) => !filterLabel || i.labels.includes(filterLabel))
    .sort((a, b) => {
      if (sortBy === "match") return b.match_score - a.match_score;
      if (sortBy === "recent")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "stars") return b.stars - a.stars;
      return 0;
    });

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface dark:bg-zinc-950">
      <Sidebar active="results" />

      <main className="flex-1 ml-0 md:ml-60 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          {phase === "loading" && (
            <AgentProgress agents={agents} onCancel={handleCancel} />
          )}

          {phase === "error" && (
            <div className="card text-center py-12">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                Something went wrong
              </h2>
              <p className="text-zinc-500 text-sm mb-6">{error}</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-primary"
              >
                Back to dashboard
              </button>
            </div>
          )}

          {phase === "results" && (
            <>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {issues.length} issue{issues.length !== 1 ? "s" : ""} matched for you
                </h1>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="btn-ghost text-sm"
                >
                  ↩ Re-run
                </button>
              </div>

              {issues.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    No matches found
                  </h2>
                  <p className="text-zinc-500 text-sm mb-6">
                    We couldn&apos;t find matches with your current filters. Try
                    updating your preferences.
                  </p>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="btn-primary"
                  >
                    Update preferences
                  </button>
                </div>
              ) : (
                <>
                  {/* Filter bar */}
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilterLabel("")}
                        className={`badge cursor-pointer transition-colors ${
                          !filterLabel
                            ? "bg-primary text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        All
                      </button>
                      {allLabels.map((l) => (
                        <button
                          key={l}
                          onClick={() => setFilterLabel(l === filterLabel ? "" : l)}
                          className={`badge cursor-pointer transition-colors ${
                            filterLabel === l
                              ? "bg-primary text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="ml-auto input text-sm py-1"
                    >
                      <option value="match">Best match</option>
                      <option value="recent">Most recent</option>
                      <option value="stars">Most starred</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    {filtered.map((issue) => (
                      <IssueCard key={issue.id + issue.url} issue={issue} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
