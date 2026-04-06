"use client";

import { useState } from "react";

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

type Props = {
  issue: Issue;
};

const LABEL_COLORS: Record<string, string> = {
  "good-first-issue": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "help-wanted": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  bug: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  documentation: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  enhancement: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  feature: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  question: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  performance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

function getLabelColor(label: string): string {
  return LABEL_COLORS[label.toLowerCase()] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function MatchBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : score >= 60
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  return <span className={`badge ${cls} font-semibold`}>{score}% match</span>;
}

export default function IssueCard({ issue }: Props) {
  const [draft, setDraft] = useState(issue.draft_comment || "");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const copyComment = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveIssue = async () => {
    setSaving(true);
    try {
      const resp = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubIssueId: issue.id,
          repoFullName: issue.repo_full_name,
          issueTitle: issue.title,
          issueUrl: issue.url,
          matchScore: issue.match_score,
          draftComment: draft,
        }),
      });
      if (resp.ok) {
        setSaveMsg("Saved!");
      } else {
        setSaveMsg("Error saving");
      }
    } catch {
      setSaveMsg("Error saving");
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 2500);
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <a
            href={`https://github.com/${issue.repo_full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-zinc-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            {issue.repo_full_name}
            <span className="text-[10px]">↗</span>
          </a>
          <h3 className="font-semibold text-zinc-900 dark:text-white text-sm leading-snug mt-1">
            {issue.title}
          </h3>
        </div>
        <MatchBadge score={issue.match_score} />
      </div>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {issue.labels.map((label) => (
            <span key={label} className={`badge ${getLabelColor(label)}`}>
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Briefing */}
      {issue.briefing && (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 mb-3">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {issue.briefing}
          </p>
          {issue.start_here && (
            <p className="text-xs mt-2 text-zinc-500">
              Start here:{" "}
              <code className="font-mono text-primary bg-violet-50 dark:bg-violet-950 px-1 py-0.5 rounded">
                {issue.start_here}
              </code>
            </p>
          )}
        </div>
      )}

      {/* Match reasoning */}
      {issue.match_reasoning && (
        <p className="text-xs text-zinc-400 mb-3 italic">{issue.match_reasoning}</p>
      )}

      {/* Draft comment */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">
          Draft comment — edit before posting
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full font-mono text-xs border border-border dark:border-zinc-700 rounded-lg px-3 py-2.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary resize-none leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={copyComment}
          className="btn-ghost text-xs py-1.5 px-3"
        >
          {copied ? "Copied!" : "Copy comment"}
        </button>
        <button
          onClick={saveIssue}
          disabled={saving}
          className="btn-primary text-xs py-1.5 px-3"
        >
          {saveMsg || (saving ? "Saving..." : "Save issue")}
        </button>
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
        >
          View on GitHub ↗
        </a>
      </div>
    </div>
  );
}
