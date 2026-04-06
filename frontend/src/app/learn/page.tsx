"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

const LABELS = [
  {
    name: "good-first-issue",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    content: `The gold standard for new contributors. Maintainers specifically tag these issues as safe entry points — they're usually well scoped, have clear acceptance criteria, and often come with a mentor or maintainer who will guide you through your first PR. Don't be embarrassed to pick these up even if you're experienced — they help you learn the codebase conventions before touching critical paths. If a repo has them, start here.`,
  },
  {
    name: "help-wanted",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    content: `The maintainers need someone to pick this up but don't have the bandwidth themselves. Usually more complex than good-first-issue. Can be a bug that needs debugging skills, a feature that needs architectural thinking, or an integration that needs domain knowledge. Read the full thread before claiming — often there's important context buried in the comments that changes the approach entirely.`,
  },
  {
    name: "bug",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    content: `Something is broken and needs fixing. Usually comes with steps to reproduce. Your job is to reproduce it locally first, trace the cause in the code, fix it, write a test that would have caught it, and submit a PR. Good bug fixes that include tests are highly valued by maintainers — they prevent the same bug from slipping back in later.`,
  },
  {
    name: "feature-request",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    content: `A new capability being proposed. Before writing any code, comment on the issue to discuss your approach — maintainers may have strong opinions on implementation or may already have someone working on it. Getting alignment before coding saves you from a wasted PR. Once approved, keep the PR focused on exactly what was discussed.`,
  },
  {
    name: "documentation",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    content: `Don't underestimate these. Bad documentation is one of the top reasons developers abandon projects. Fixing a confusing README, adding code examples, or writing a missing guide can have enormous impact on the community. It's also a great way to understand a codebase deeply — you can't document what you don't understand. Documentation PRs are often merged faster than code changes.`,
  },
  {
    name: "performance",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    content: `Issues asking for faster code or lower memory usage. Usually require profiling the current implementation, identifying the bottleneck, and benchmarking your fix before and after. These are impressive PRs when done well — they show you understand how code actually executes, not just how to write it. Always include benchmark results in your PR description.`,
  },
  {
    name: "security",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    content: `Treat these with extra care. Read the project's security policy before commenting publicly on a security issue — many projects ask you to report vulnerabilities privately first via email or a security advisory. If it's a non-sensitive hardening task (e.g. upgrading a dependency), follow the same process as a bug fix but be extra thorough with your review and testing.`,
  },
  {
    name: "hacktoberfest",
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    content: `Issues tagged for Hacktoberfest, an annual October event where contributors earn rewards for merged PRs. These issues are specifically opened or tagged to welcome new contributors during the event. Quality over quantity — maintainers can and do mark PRs as spam if they're low effort or trivial. A single meaningful contribution is worth far more than four drive-by fixes.`,
  },
];

const STEPS = [
  { num: 1, title: "Find an issue", desc: "Use ContriboFind to get AI-matched issues tailored to your skill level and language stack." },
  { num: 2, title: "Comment on the issue", desc: 'Claim it publicly: "I\'d like to work on this, I\'ll have a PR up by [realistic date]." This prevents duplicate work.' },
  { num: 3, title: "Fork the repository", desc: "Click Fork on GitHub — this creates your own copy of the repo under your account." },
  { num: 4, title: "Clone your fork locally", desc: "git clone https://github.com/YOURNAME/REPO — then add the upstream remote so you can pull changes." },
  { num: 5, title: "Create a new branch", desc: "git checkout -b fix/issue-description — never work directly on main." },
  { num: 6, title: "Read CONTRIBUTING.md first", desc: "Almost every serious project has one. It tells you the code style, test requirements, and PR format they expect." },
  { num: 7, title: "Make your changes", desc: "Keep the scope tight. Fix exactly what the issue describes — nothing more, nothing less." },
  { num: 8, title: "Test your changes", desc: "Run the existing test suite. Add a new test if you fixed a bug — that's the professional move." },
  { num: 9, title: "Commit clearly", desc: 'git commit -m "fix: resolve null pointer in user auth when email is undefined" — be specific.' },
  { num: 10, title: "Push to your fork", desc: "git push origin fix/issue-description" },
  { num: 11, title: "Open a Pull Request", desc: 'Write a clear description. Link the issue with "Closes #123" so it auto-closes when merged.' },
  { num: 12, title: "Respond to review", desc: "Be open to feedback. Update your PR promptly. Most maintainers merge within a week if you're responsive." },
];

const GLOSSARY: [string, string][] = [
  ["PR (Pull Request)", "Your proposed code change submitted for review. A PR says: 'I changed X, here's why, please merge it.'"],
  ["Fork", "A copy of someone else's repo under your own GitHub account. You make changes in your fork, then PR back to the original."],
  ["Clone", "Downloading a repo to your local machine so you can edit files and run code."],
  ["Branch", "An isolated copy of the code within the same repo. You create a branch to work on a change without affecting main."],
  ["Merge", "Combining your branch's changes into another branch (usually main). Happens when a PR is approved."],
  ["Rebase", "Replaying your commits on top of another branch — used to keep your branch up to date with main without a merge commit."],
  ["Issue", "A discussion thread on GitHub used to report bugs, request features, or discuss improvements."],
  ["Maintainer", "The person (or people) responsible for a repo — they review PRs, triage issues, and decide what gets merged."],
  ["LGTM", "\"Looks Good To Me\" — common shorthand in PR reviews meaning the reviewer approves."],
  ["CI/CD", "Continuous Integration / Continuous Deployment. Automated pipelines that run tests and deploy code when PRs are opened or merged."],
  ["README", "The front page of a repository. Explains what the project does, how to install it, and how to use it."],
  ["CONTRIBUTING.md", "A guide specifically for contributors — describes how to set up the dev environment, code style rules, and the PR process."],
  ["Code Review", "The process where maintainers or peers read your code and suggest improvements before it's merged."],
  ["Upstream", "The original repository that your fork was created from. You pull updates from upstream to stay current."],
];

export default function LearnPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Nav */}
      <nav className="border-b border-border dark:border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            ContriboFind
          </Link>
          <Link
            href={session ? "/dashboard" : "/"}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            {session ? "Dashboard" : "Sign in →"}
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16 pb-32">
        {/* Header */}
        <p className="text-sm text-primary font-medium uppercase tracking-widest mb-3">
          Open Source Guide
        </p>
        <h1 className="text-4xl font-bold leading-tight mb-4">
          Everything you need to know about contributing to open source
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed mb-16">
          From your first issue to your first merged PR.
        </p>

        <hr className="border-border dark:border-zinc-800 mb-16" />

        {/* Section 1 */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-5">What is open source?</h2>
          <div className="prose-custom">
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              Open source software is software where the source code is publicly available for anyone to read, use, modify, and distribute. This matters because it means anyone in the world — including you — can contribute to the tools that millions of developers depend on.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              The scale of open source is hard to overstate. Linux powers the vast majority of servers, cloud infrastructure, and Android phones on the planet. VS Code — the editor you may be using right now — is open source and built by Microsoft on GitHub. React, which powers a huge percentage of the web's UI, is open source and maintained by Meta. Kubernetes, the orchestration system that runs most cloud-native applications, is open source. These aren't hobby projects — they're critical global infrastructure.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Open source is distinct from "free software" (though related). Free software is a political philosophy about user freedom. Open source is a development methodology: by making code public, you get more eyes on it, more contributors, and faster iteration. Both traditions overlap heavily, but open source is the term most commonly used in industry contexts.
            </p>
          </div>
        </section>

        <hr className="border-border dark:border-zinc-800 mb-14" />

        {/* Section 2 */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-5">Why contribute to open source?</h2>
          <div className="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <p>
              <strong className="text-zinc-900 dark:text-white">Career.</strong> Your contributions are permanently public — any hiring manager can see them. Companies like Vercel, Supabase, Stripe, and HashiCorp actively hire from their contributor communities. A merged PR to a popular repo is stronger evidence of skill than almost any interview answer.
            </p>
            <p>
              <strong className="text-zinc-900 dark:text-white">Learning.</strong> Reading and changing production codebases written by senior engineers is the fastest way to level up. You'll encounter patterns, testing practices, and architectural decisions you'd never see in a tutorial.
            </p>
            <p>
              <strong className="text-zinc-900 dark:text-white">Network.</strong> Maintainers and co-contributors become your professional network. The people you collaborate with in issues and PRs are often engineers at the companies you want to work at.
            </p>
            <p>
              <strong className="text-zinc-900 dark:text-white">Resume.</strong> A merged PR to a well-known repo is worth more than most side projects on a CV. It proves you can work within an existing codebase, follow conventions, and collaborate with a team — things side projects often can't demonstrate.
            </p>
            <p>
              <strong className="text-zinc-900 dark:text-white">Community.</strong> You improve tools that millions of developers use every day. There's a real sense of impact in seeing your change deployed to production for a library used by tens of thousands of projects.
            </p>
          </div>
        </section>

        <hr className="border-border dark:border-zinc-800 mb-14" />

        {/* Section 3 — Labels */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-2">Understanding issue labels</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
            Labels tell you what kind of work is needed and who it's for.
          </p>
          <div className="space-y-8">
            {LABELS.map((label) => (
              <div key={label.name}>
                <span className={`badge ${label.color} mb-3 inline-block`}>
                  {label.name}
                </span>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">
                  {label.content}
                </p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border dark:border-zinc-800 mb-14" />

        {/* Section 4 — Steps */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-2">
            How to make your first contribution — step by step
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
            Every first PR follows the same process. Here it is.
          </p>
          <div className="space-y-5">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 text-primary font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white text-sm mb-0.5">
                    {step.title}
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border dark:border-zinc-800 mb-14" />

        {/* Section 5 — Etiquette */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold mb-6">Contribution etiquette</h2>
          <div className="space-y-5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <div className="flex gap-3">
              <span className="text-primary mt-0.5">→</span>
              <p>
                <strong className="text-zinc-900 dark:text-white">Always comment before starting work.</strong>{" "}
                Nothing is more frustrating for a maintainer than two people submitting duplicate PRs for the same issue. Claim it first, then code.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-primary mt-0.5">→</span>
              <p>
                <strong className="text-zinc-900 dark:text-white">Keep PRs small and focused.</strong>{" "}
                A PR that changes one thing is reviewed faster and merged sooner than one that changes ten things. If you find other issues while working, open separate PRs.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-primary mt-0.5">→</span>
              <p>
                <strong className="text-zinc-900 dark:text-white">Write clear commit messages.</strong>{" "}
                "fix bug" tells nobody anything. "fix: resolve null pointer in user auth when email is undefined" is perfect. Use the conventional commits format if the project uses it.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-primary mt-0.5">→</span>
              <p>
                <strong className="text-zinc-900 dark:text-white">Be patient.</strong>{" "}
                Most maintainers are unpaid volunteers doing this in their spare time. A week without response is normal. A polite follow-up after two weeks is fine.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-primary mt-0.5">→</span>
              <p>
                <strong className="text-zinc-900 dark:text-white">Don't take review feedback personally.</strong>{" "}
                Requested changes are a sign the maintainer thinks your PR is worth merging — they wouldn't bother otherwise. Engage with the feedback professionally.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-border dark:border-zinc-800 mb-14" />

        {/* Section 6 — Glossary */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Glossary</h2>
          <dl className="space-y-4">
            {GLOSSARY.map(([term, def]) => (
              <div key={term}>
                <dt className="font-semibold text-zinc-900 dark:text-white text-sm">
                  {term}
                </dt>
                <dd className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mt-0.5">
                  {def}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-6 right-6">
        <Link
          href={session ? "/dashboard" : "/"}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-violet-500/30 transition-colors text-sm"
        >
          Find your issues →
        </Link>
      </div>
    </div>
  );
}
