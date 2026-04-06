"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const EXAMPLE_ISSUES = [
  {
    repo: "vercel/next.js",
    title: "Add support for custom cache headers in App Router",
    labels: ["good-first-issue", "documentation"],
    match: 92,
    briefing:
      "Next.js is a React framework for production apps. This issue involves adding cache-control header support in the App Router. Start at packages/next/src/server/app-router.",
    draft:
      "Hey! I've been using Next.js for a while and have been digging into the App Router internals lately. This cache headers issue looks well-scoped and I'd love to take a stab at it. Is there a preferred approach for adding the config option — extending the RouteModule or a new middleware hook?",
  },
  {
    repo: "supabase/supabase",
    title: "CLI: improve error message when project is not linked",
    labels: ["help-wanted", "cli"],
    match: 78,
    briefing:
      "Supabase is an open-source Firebase alternative. This CLI issue requires modifying the Go CLI codebase. Check packages/cli/internal/utils/errors.go for existing error handling patterns.",
    draft:
      "Hi! I spotted this one while debugging a local setup issue myself — the current error is genuinely confusing. I work with Go regularly and have poked around the Supabase CLI before. Happy to draft a clearer message and add a hint pointing to `supabase link`. Should I open a draft PR?",
  },
  {
    repo: "facebook/react",
    title: "useTransition: document startTransition behavior with async actions",
    labels: ["good-first-issue", "documentation"],
    match: 85,
    briefing:
      "React is Meta's UI library. Documentation issues are in the website/ folder — specifically website/src/content/reference/react. No build required to contribute docs.",
    draft:
      "Hey! I've been working through the useTransition docs myself and hit this exact gap — the async action behaviour isn't obvious from the current reference page. I'd like to write up the missing section with a practical example. Any preference on the code example style — hooks-only or with a form action?",
  },
];

function LabelChip({ label }: { label: string }) {
  const colors: Record<string, string> = {
    "good-first-issue": "bg-green-100 text-green-800",
    "help-wanted": "bg-blue-100 text-blue-800",
    documentation: "bg-purple-100 text-purple-800",
    cli: "bg-orange-100 text-orange-800",
    bug: "bg-red-100 text-red-800",
  };
  const cls = colors[label] ?? "bg-zinc-100 text-zinc-700";
  return <span className={`badge ${cls}`}>{label}</span>;
}

function ExampleCard({
  repo,
  title,
  labels,
  match,
  briefing,
  draft,
}: (typeof EXAMPLE_ISSUES)[0]) {
  const matchColor =
    match >= 80
      ? "bg-green-100 text-green-800"
      : match >= 60
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 text-left">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <a
            href={`https://github.com/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-zinc-200 font-mono transition-colors"
          >
            {repo} ↗
          </a>
          <h3 className="text-white font-semibold mt-1 text-sm leading-snug">
            {title}
          </h3>
        </div>
        <span className={`badge ${matchColor} shrink-0`}>{match}%</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {labels.map((l) => (
          <LabelChip key={l} label={l} />
        ))}
      </div>
      <p className="text-zinc-400 text-xs leading-relaxed mb-3">{briefing}</p>
      <div className="bg-zinc-800 rounded-lg p-3">
        <p className="text-xs text-zinc-500 mb-1 font-mono">Draft comment</p>
        <p className="text-zinc-300 text-xs leading-relaxed italic">
          &ldquo;{draft}&rdquo;
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 max-w-6xl mx-auto w-full">
        <span className="text-lg font-semibold tracking-tight">
          ContriboFind
        </span>
        <Link
          href="/learn"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          What is OSS?
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-4xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-violet-950 text-violet-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-violet-800">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Powered by LangGraph + Groq + GitHub MCP
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
          Find open source issues{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-300">
            built for your skills
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI agents scan your GitHub, match your expertise to real issues, and
          write your intro comment. Free forever.
        </p>

        <button
          onClick={() => signIn("github")}
          className="inline-flex items-center gap-3 bg-white text-zinc-900 hover:bg-zinc-100 font-semibold px-6 py-3 rounded-xl text-base transition-colors shadow-lg"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        <p className="text-xs text-zinc-600 mt-4">
          We only read your public repositories. We never write to your repos.
        </p>
      </main>

      {/* Example cards */}
      <section className="max-w-6xl mx-auto w-full px-6 pb-20">
        <p className="text-center text-sm text-zinc-500 mb-6 uppercase tracking-widest font-medium">
          Example output
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {EXAMPLE_ISSUES.map((issue) => (
            <ExampleCard key={issue.repo + issue.title} {...issue} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-600">
        Built with LangGraph + MCP + Groq &middot; Free forever &middot;{" "}
        <a
          href="https://github.com"
          className="hover:text-zinc-400 transition-colors"
        >
          Open source
        </a>
      </footer>
    </div>
  );
}
